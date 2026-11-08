// Convierte una grabación de la persona en el "plano base" del vídeo: vertical 1080×1920, sin
// pausas, sin los trozos que sobran (saludos, tomas falsas, despedidas) y con el zoom alternando en
// cada corte para que el salto no se note (como en el ejemplo épico: 0 pausas de más de 0,7 s).
// Uso:
//   node herramientas/cortes.mjs <grabacion> --salida <video-N/base.mp4> [--quitar "ms-ms,ms-ms"]
//        [--desde ms] [--hasta ms] [--pausa 350] [--margen 90] [--zoom 1.12] [--focoY 40] [--solo-revisar]
//   --quitar   tramos de la GRABACIÓN ORIGINAL que se eliminan (en milisegundos). Claude los decide
//              leyendo la transcripción de la grabación: el saludo, una frase repetida (se queda la
//              última toma), un "chao, chao" final, una muletilla larga.
//   --pausa    silencios más largos que esto se cortan (los cortos se dejan: dan naturalidad)
//   --focoY    0-100: qué altura de la imagen queda a la vista al recortar a vertical (la cara)
// Las pausas se detectan por el VOLUMEN, no por la transcripción: el transcriptor estira la última
// palabra hasta el silencio y daba cortes tarde (lo vio el propio kit en la primera tanda real).
// Deja al lado <base>.json con los tramos (origen → destino) para poder revisar cada corte.
import fs from 'node:fs';
import path from 'node:path';
import {ffmpeg, ffprobeJson, medirVolumen, umbralSilencio, pausas, escribirJson, args, fallar} from './comun.mjs';
import {CADENA_VOZ} from './voz-cadena.mjs';

const {sueltos, opciones} = args();
const grabacion = sueltos[0];
if (!grabacion || !fs.existsSync(grabacion)) fallar(`no existe la grabación: ${grabacion}`);
if (!opciones.salida) fallar('falta --salida');
const PAUSA = parseInt(opciones.pausa || '350', 10);
const MARGEN = parseInt(opciones.margen || '90', 10);
const ZOOM = parseFloat(opciones.zoom || '1.12');
const FOCO = Math.max(0, Math.min(100, parseFloat(opciones.focoY || '40')));

const info = ffprobeJson(grabacion);
const v = info.streams.find((s) => s.codec_type === 'video');
const a = info.streams.find((s) => s.codec_type === 'audio');
if (!v || !a) fallar('la grabación tiene que tener imagen y sonido');
const totalMs = Math.round(parseFloat(info.format.duration) * 1000);
const desde = parseInt(opciones.desde || '0', 10);
const hasta = Math.min(totalMs, parseInt(opciones.hasta || String(totalMs), 10));
let giro = 0;
if (v.tags?.rotate) giro = parseInt(v.tags.rotate, 10);
for (const sd of v.side_data_list || []) if (sd.rotation !== undefined) giro = parseInt(sd.rotation, 10);
const [W, H] = Math.abs(giro) % 180 === 90 ? [v.height, v.width] : [v.width, v.height];
if (W > H * 1.1) console.log(`⚠ la grabación es horizontal (${W}×${H}): se recorta el centro en vertical. Para la próxima, que grabe con el móvil en vertical.`);

// 1 · Silencios, con el umbral propio de esta grabación (entre su ruido de fondo y su voz)
const vol = medirVolumen(grabacion);
const niv = umbralSilencio(grabacion);
const umbral = niv.umbral;
console.log(`Niveles: fondo ${niv.fondo} dB · voz ${niv.voz} dB → silencio por debajo de ${umbral} dB`);
const silencios = pausas(niv, PAUSA);

// 2 · Tramos con voz = lo que no es silencio, con un pequeño margen para no comerse sílabas
let tramos = [];
let cursor = desde;
for (const [s, e] of silencios) {
  if (e <= desde || s >= hasta) continue;
  if (s > cursor) tramos.push([cursor, Math.min(s, hasta)]);
  cursor = Math.max(cursor, e);
}
if (cursor < hasta) tramos.push([cursor, hasta]);
tramos = tramos.map(([s, e]) => [Math.max(desde, s - MARGEN), Math.min(hasta, e + MARGEN)]);
// unir los que se tocan tras el margen
const unidos = [];
for (const t of tramos) {
  const u = unidos[unidos.length - 1];
  if (u && t[0] <= u[1]) u[1] = Math.max(u[1], t[1]);
  else unidos.push([...t]);
}

// 3 · Quitar los tramos que Claude marcó (saludo, tomas falsas, despedida…)
const quitar = (opciones.quitar ? String(opciones.quitar) : '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
  const m = x.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) fallar(`--quitar mal escrito: "${x}" (formato: inicio-fin en ms, separados por comas)`);
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
});
let finales = unidos;
for (const [qs, qe] of quitar) {
  const nuevos = [];
  for (const [s, e] of finales) {
    if (qe <= s || qs >= e) nuevos.push([s, e]);
    else {
      if (qs > s) nuevos.push([s, qs]);
      if (qe < e) nuevos.push([qe, e]);
    }
  }
  finales = nuevos;
}
finales = finales.filter(([s, e]) => e - s >= 250); // fuera chasquidos y respiraciones sueltas
if (!finales.length) fallar('no queda nada con voz después de cortar: revisa --quitar, --desde y --hasta');

const durFinal = finales.reduce((t, [s, e]) => t + (e - s), 0);
let destino = 0;
const segmentos = finales.map(([s, e], i) => {
  const seg = {origenDesdeMs: s, origenHastaMs: e, destinoDesdeMs: destino, destinoHastaMs: destino + (e - s), zoom: i % 2 === 0 ? 1 : ZOOM};
  destino += e - s;
  return seg;
});
console.log(`Grabación ${(totalMs / 1000).toFixed(1)} s → base ${(durFinal / 1000).toFixed(1)} s · ${segmentos.length} tramos · ${segmentos.length - 1} cortes · quitados ${((hasta - desde - durFinal) / 1000).toFixed(1)} s (pausas de más de ${PAUSA} ms${quitar.length ? ` y ${quitar.length} tramo(s) marcados` : ''})`);
if (durFinal > 60000) console.log(`⚠ la base dura ${(durFinal / 1000).toFixed(1)} s: pasa de 60 s. Quita algún tramo con --quitar o pídele que acorte el guion.`);
if (durFinal < 30000) console.log(`⚠ la base dura ${(durFinal / 1000).toFixed(1)} s: no llega a 30 s.`);
const salidaJson = opciones.salida.replace(/\.[^.]+$/, '') + '.json';
const datos = {grabacion, totalMs, pausaMs: PAUSA, margenMs: MARGEN, quitar, duracionMs: durFinal, segmentos};
if (opciones['solo-revisar']) {
  for (const sg of segmentos) console.log(`  ${(sg.origenDesdeMs / 1000).toFixed(2)}-${(sg.origenHastaMs / 1000).toFixed(2)} s → ${(sg.destinoDesdeMs / 1000).toFixed(2)} s (zoom ${sg.zoom})`);
  process.exit(0);
}

// 4 · Montar la base: cada tramo recortado a vertical con su zoom, todos seguidos, y la voz limpia
const entradas = [];
const filtros = [];
segmentos.forEach((sg, i) => {
  entradas.push('-ss', (sg.origenDesdeMs / 1000).toFixed(3), '-to', (sg.origenHastaMs / 1000).toFixed(3), '-i', grabacion);
  const w = Math.round(1080 * sg.zoom / 2) * 2, h = Math.round(1920 * sg.zoom / 2) * 2;
  filtros.push(`[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)/2:(ih-1920)*${(FOCO / 100).toFixed(2)},fps=30,setsar=1,format=yuv420p[v${i}]`);
  const dur = ((sg.origenHastaMs - sg.origenDesdeMs) / 1000).toFixed(3);
  filtros.push(`[${i}:a]aresample=48000,aformat=channel_layouts=mono,afade=t=in:d=0.012,afade=t=out:st=${Math.max(0, parseFloat(dur) - 0.012).toFixed(3)}:d=0.012[a${i}]`);
});
const concat = `${segmentos.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${segmentos.length}:v=1:a=1[v][araw];[araw]${CADENA_VOZ}[a]`;
fs.mkdirSync(path.dirname(path.resolve(opciones.salida)), {recursive: true});
const t0 = Date.now();
ffmpeg([...entradas, '-filter_complex', `${filtros.join(';')};${concat}`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-bf', '0', '-g', '15', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', opciones.salida], {timeoutMs: 30 * 60 * 1000});
const real = ffprobeJson(opciones.salida).streams.find((s) => s.codec_type === 'video');
datos.duracionRealMs = Math.round(parseFloat(real?.duration || '0') * 1000);
escribirJson(salidaJson, datos);
const volBase = medirVolumen(opciones.salida);
console.log(`✓ base lista en ${Math.round((Date.now() - t0) / 1000)} s: ${opciones.salida} · dura ${(datos.duracionRealMs / 1000).toFixed(1)} s (imagen) · voz ${vol.lufs} → ${volBase.lufs} LUFS`);
console.log(`  tramos en: ${salidaJson}`);
