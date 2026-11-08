// Convierte un plan de montaje (plan.json) en el vídeo final.
// Uso:
//   node herramientas/montar.mjs <plan.json> [--solo-revisar] [--sin-limite-duracion]
// Pasos: revisa el plan con las reglas de calidad → prepara los medios → monta la pista de voz →
// subtítulos (texto del guion + tiempos oídos) → Remotion → volumen final a −14 LUFS → guarda en "salida".
// El formato del plan está en .claude/skills/quiero-ser-viral/referencias/edicion.md
import fs from 'node:fs';
import path from 'node:path';
import {KIT, ffmpeg, ffprobeJson, correr, leerJson, escribirJson, medirVolumen, duracionSegundos, args, fallar} from './comun.mjs';
import {CADENA_VOZ} from './voz-cadena.mjs';
import {alinear} from './alinear.mjs';

const {sueltos, opciones} = args();
const archivoPlan = sueltos[0];
if (!archivoPlan || !fs.existsSync(archivoPlan)) fallar(`no existe el plan: ${archivoPlan}`);
const plan = leerJson(archivoPlan);
const trabajo = path.join(path.dirname(path.resolve(archivoPlan)), `montaje-${plan.id}`);
fs.mkdirSync(trabajo, {recursive: true});
const errores = [];
const avisos = [];

// ------------------------------------------------------------------ 0 · Plan con "base" + "insertos"
// La forma normal de la v2: la base es la grabación de la persona ya cortada (cortes.mjs) y los
// insertos van encima. Aquí se convierten en planos seguidos: la persona rellena todos los huecos,
// sincronizada (inicioMs = desdeMs), y en la pantalla partida va abajo, también sincronizada.
let presenciaMs = null;
const cortesBase = [];
if (plan.base) {
  if (!plan.base.src || !fs.existsSync(plan.base.src)) fallar(`no existe la base: ${plan.base?.src}`);
  // La duración de la IMAGEN, no la del archivo: el sonido puede durar unos ms más, y montar hasta el
  // final del sonido pedía fotogramas que no existen ("No frame found…" en casi todos los montajes).
  const vBase = ffprobeJson(plan.base.src).streams.find((s) => s.codec_type === 'video');
  const durBase = Math.floor(parseFloat(vBase?.duration || duracionSegundos(plan.base.src)) * 30) / 30 * 1000;
  const dur = Math.round(Math.min(plan.duracionMs || durBase, durBase));
  const jsonCortes = plan.base.src.replace(/\.[^.]+$/, '') + '.json';
  if (fs.existsSync(jsonCortes)) for (const s of leerJson(jsonCortes).segmentos || []) if (s.destinoDesdeMs > 0) cortesBase.push(s.destinoDesdeMs);
  const insertos = [...(plan.insertos || [])].sort((a, b) => a.desdeMs - b.desdeMs);
  const nuevos = [];
  let cursor = 0;
  // "movimiento": "golpe" en la base añade un zoom seco cada 2,5 s además de los cortes (opcional).
  const basePlano = (d, h) => ({tipo: 'video', src: plan.base.src, inicioMs: d, desdeMs: d, hastaMs: h, movimiento: plan.base.movimiento || 'ninguno', focoY: 50, esBase: true});
  presenciaMs = 0;
  insertos.forEach((ins, k) => {
    if (ins.desdeMs < cursor) errores.push(`el inserto ${k + 1} empieza en ${ins.desdeMs} ms, antes de que acabe el anterior (${cursor} ms)`);
    if (ins.hastaMs > dur) errores.push(`el inserto ${k + 1} acaba en ${ins.hastaMs} ms y la base dura ${dur} ms`);
    if (ins.hastaMs - ins.desdeMs > 5000) errores.push(`el inserto ${k + 1} dura ${((ins.hastaMs - ins.desdeMs) / 1000).toFixed(1)} s (máximo 5 s: la persona tiene que volver a salir)`);
    if (ins.desdeMs > cursor) {
      nuevos.push(basePlano(cursor, ins.desdeMs));
      presenciaMs += ins.desdeMs - cursor;
    }
    if (ins.tipo === 'partido') {
      nuevos.push({...ins, abajo: {src: plan.base.src, inicioMs: ins.desdeMs, focoY: plan.base.focoYPartido ?? 30}});
      presenciaMs += ins.hastaMs - ins.desdeMs;
    } else if (ins.tipo === 'recurso') {
      const video = /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(ins.src || '');
      nuevos.push({...ins, tipo: video ? 'video' : 'foto', movimiento: ins.movimiento ?? (video ? 'ninguno' : 'lento')});
    } else nuevos.push({...ins});
    cursor = Math.max(cursor, ins.hastaMs);
  });
  if (cursor < dur) {
    nuevos.push(basePlano(cursor, dur));
    presenciaMs += dur - cursor;
  }
  plan.planos = nuevos;
  if (!plan.pistas) plan.pistas = [{src: plan.base.src, desdeMs: 0}];
}

// ------------------------------------------------------------------ 1 · Revisar el plan
const planos = [...(plan.planos || [])].sort((a, b) => a.desdeMs - b.desdeMs);
if (!planos.length) fallar('el plan no tiene planos');
if (!plan.id || !/^[\w.-]+$/.test(plan.id)) errores.push('el plan necesita un "id" sin espacios (p. ej. 2026-11-07-video-1)');
if (!plan.salida) errores.push('falta "salida" (la ruta del vídeo final)');
if (planos[0].desdeMs !== 0) errores.push(`el primer plano debe empezar en 0 ms (empieza en ${planos[0].desdeMs})`);
for (let i = 1; i < planos.length; i++) {
  const hueco = planos[i].desdeMs - planos[i - 1].hastaMs;
  if (Math.abs(hueco) > 60) errores.push(`entre el plano ${i} y el ${i + 1} hay ${hueco > 0 ? 'un hueco' : 'un solape'} de ${Math.abs(hueco)} ms`);
  else planos[i].desdeMs = planos[i - 1].hastaMs;
}
const duracionMs = planos[planos.length - 1].hastaMs;
const minMs = opciones['sin-limite-duracion'] ? 0 : 30000;
const maxMs = opciones['sin-limite-duracion'] ? Infinity : 60000;
if (duracionMs < minMs || duracionMs > maxMs) errores.push(`el vídeo dura ${(duracionMs / 1000).toFixed(1)} s y tiene que durar entre 30 y 60 s`);

const medios = [];
for (const [i, p] of planos.entries()) {
  const d = p.hastaMs - p.desdeMs;
  if (d <= 0) errores.push(`el plano ${i + 1} no dura nada`);
  if (p.ia && d > 5000) errores.push(`el plano ${i + 1} es de IA y dura ${(d / 1000).toFixed(1)} s (máximo 5 s por pieza)`);
  const lista = p.tipo === 'partido' ? [p.arriba, p.abajo] : p.tipo === 'tarjeta' || p.tipo === 'animacion' ? [] : [p];
  if (p.tipo === 'partido' && (!p.arriba || !p.abajo)) errores.push(`el plano ${i + 1} es "partido" y le falta "arriba" o "abajo"`);
  if (p.tipo === 'tarjeta' && !p.texto) errores.push(`el plano ${i + 1} es una tarjeta sin texto`);
  if (p.tipo === 'animacion') {
    if (!['lista', 'comparativa', 'cifra'].includes(p.plantilla)) errores.push(`el plano ${i + 1} es una animación con plantilla desconocida "${p.plantilla}" (lista, comparativa o cifra)`);
    if (p.plantilla === 'lista' && !(p.items?.length >= 2)) errores.push(`la animación "lista" del plano ${i + 1} necesita al menos 2 "items"`);
    if (p.plantilla === 'comparativa' && !(p.izquierda && p.derecha)) errores.push(`la animación "comparativa" del plano ${i + 1} necesita "izquierda" y "derecha"`);
    if (p.plantilla === 'cifra' && (p.valor === undefined || !p.texto)) errores.push(`la animación "cifra" del plano ${i + 1} necesita "valor" y "texto"`);
  }
  for (const m of lista) {
    if (!m?.src || !fs.existsSync(m.src)) errores.push(`el plano ${i + 1} usa un archivo que no existe: ${m?.src}`);
    else {
      medios.push({m, d, tipo: m.tipo || p.tipo});
      // Un vídeo u foto horizontal recortado a vertical deja solo una franja del centro (en la prueba,
      // le cortó la cabeza a la persona): o "encajar", o una "zona" elegida mirando la vista.
      if (m.encuadre !== 'encajar' && !m.zona) {
        try {
          const v = ffprobeJson(m.src).streams.find((s) => s.codec_type === 'video');
          let giro = 0;
          if (v?.tags?.rotate) giro = parseInt(v.tags.rotate, 10);
          for (const sd of v?.side_data_list || []) if (sd.rotation !== undefined) giro = parseInt(sd.rotation, 10);
          const [w, h] = Math.abs(giro) % 180 === 90 ? [v.height, v.width] : [v.width, v.height];
          // Se avisa si el recorte se queda con menos del ~60 % del ancho (pantalla entera 9:16 o media pantalla 1080×960).
          const destino = p.tipo === 'partido' ? 1080 / 960 : 1080 / 1920;
          if (w / h / destino > 1.6) errores.push(`el plano ${i + 1} usa un archivo horizontal (${path.basename(m.src)}) recortado: solo se vería una franja del centro. Pon "encuadre": "encajar" o una "zona"`);
        } catch {
          /* si no se puede leer, ya lo dirá la preparación */
        }
      }
    }
  }
}
const msIA = planos.filter((p) => p.ia).reduce((s, p) => s + (p.hastaMs - p.desdeMs), 0);
const pctIA = Math.round((100 * msIA) / duracionMs);
let pctPresencia = null;
if (presenciaMs !== null) {
  // v2: la persona tiene que salir al menos la mitad del vídeo (decisión del usuario, 2026-11-08).
  pctPresencia = Math.round((100 * presenciaMs) / duracionMs);
  if (pctPresencia < 50) errores.push(`la persona sale el ${pctPresencia} % del vídeo (mínimo 50 %): quita o acorta insertos`);
} else if (pctIA > 25) errores.push(`la IA ocupa el ${pctIA} % del vídeo (máximo 25 %)`);

// Algo nuevo en pantalla cada ≤ 4 s: cambios de plano, textos que entran, zooms de golpe y, en la
// base, cada corte de cortes.mjs (cambia el zoom).
const eventos = new Set([0, duracionMs]);
for (const p of planos) {
  eventos.add(p.desdeMs);
  if (p.movimiento === 'golpe') for (let t = p.desdeMs + 2500; t < p.hastaMs; t += 2500) eventos.add(t);
  if (p.esBase) for (const c of cortesBase) if (c > p.desdeMs && c < p.hastaMs) eventos.add(c);
  // Lo que entra DENTRO de una animación también es "algo nuevo" (mismos tiempos que el editor).
  if (p.tipo === 'animacion') {
    const dur = p.hastaMs - p.desdeMs;
    if (p.plantilla === 'lista') {
      const nItems = Math.max(1, (p.items || []).length);
      const paso = Math.max(200, (dur * 0.75) / nItems);
      for (let k = 0; k < nItems; k++) eventos.add(Math.round(p.desdeMs + 200 + k * paso));
    } else if (p.plantilla === 'comparativa') eventos.add(Math.round(p.desdeMs + dur * 0.35));
    else if (p.plantilla === 'cifra') eventos.add(Math.round(p.desdeMs + dur * 0.4));
  }
}
for (const t of plan.textos || []) eventos.add(t.desdeMs);
const ev = [...eventos].sort((a, b) => a - b);
for (let i = 1; i < ev.length; i++) if (ev[i] - ev[i - 1] > 4000) errores.push(`de ${(ev[i - 1] / 1000).toFixed(1)} s a ${(ev[i] / 1000).toFixed(1)} s no pasa nada nuevo en pantalla (máximo 4 s): corta el plano, pon "golpe" o añade un texto clave`);
const claves = (plan.textos || []).filter((t) => t.estilo === 'clave').length + planos.filter((p) => p.tipo === 'tarjeta' || p.tipo === 'animacion').length;
if (claves < Math.floor(duracionMs / 10000)) avisos.push(`hay ${claves} palabras clave grandes o tarjetas; la lista pide al menos una cada 10 s (${Math.floor(duracionMs / 10000)})`);
const pistas = plan.pistas || [];
if (!pistas.length) errores.push('el plan no tiene "pistas" de voz');
for (const pi of pistas) if (!pi.src || !fs.existsSync(pi.src)) errores.push(`la pista de voz no existe: ${pi.src}`);
if (!plan.textoHablado) errores.push('falta "textoHablado" (lo que se dice, en orden, para los subtítulos)');

console.log(`Plan ${plan.id}: ${(duracionMs / 1000).toFixed(1)} s · ${planos.length} planos · ${pctPresencia !== null ? `persona en pantalla ${pctPresencia} % · ` : ''}IA ${pctIA} % · ${ev.length - 1} momentos con algo nuevo`);
for (const a of avisos) console.log(`  ⚠ ${a}`);
if (errores.length) {
  for (const e of errores) console.log(`  ✗ ${e}`);
  fallar(`el plan tiene ${errores.length} problema(s): corrígelos y vuelve a montar`);
}
console.log('✓ el plan cumple las reglas de montaje');
if (opciones['solo-revisar']) process.exit(0);

// ------------------------------------------------------------------ 2 · Preparar los medios
const publico = path.join(KIT, 'editor', 'public', plan.id);
fs.rmSync(publico, {recursive: true, force: true});
fs.mkdirSync(publico, {recursive: true});
let n = 0;
const relativo = (f) => `${plan.id}/${path.basename(f)}`;
// "encajar" (pantallas u horizontales): la imagen entera sobre un fondo desenfocado de sí misma.
// Se prepara aquí con ffmpeg y no en Remotion: pedir el mismo vídeo dos veces a la vez hacía fallar
// el montaje ("No frame found at position…", Paso 5).
const filtroEncajar = (w, h) => `split[f][b];[b]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=30:2,eq=brightness=-0.25[bb];[f]scale=${w}:${h}:force_original_aspect_ratio=decrease[ff];[bb][ff]overlay=(W-w)/2:(H-h)/2`;
// Sin fotogramas B y con un fotograma clave cada medio segundo: así Remotion encuentra cada fotograma.
const CODIFICAR = ['-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-bf', '0', '-g', '15', '-movflags', '+faststart'];
// "zona": {x, y, ancho, alto} en fracciones (0-1) de la imagen. Sirve para acercarse a una parte de
// una grabación de pantalla: entera, dentro de media pantalla, no se lee (Paso 5).
const recorteZona = (m) => (m.zona ? `crop=trunc(iw*${m.zona.ancho}/2)*2:trunc(ih*${m.zona.alto}/2)*2:iw*${m.zona.x}:ih*${m.zona.y},` : '');
function prepararVideo(m, durMs, w, h) {
  const destino = path.join(publico, `m${++n}.mp4`);
  const inicio = ((m.inicioMs || 0) / 1000).toFixed(3);
  const base = "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";
  // tpad: si el trozo pedido pasa del final del archivo, se repite el último fotograma (si no,
  // Remotion pedía fotogramas que no existen y fallaba).
  const vf = recorteZona(m) + (m.encuadre === 'encajar' ? `${filtroEncajar(w, h)},fps=30` : `${base},fps=30`) + ',tpad=stop_mode=clone:stop_duration=1';
  ffmpeg(['-ss', inicio, '-t', ((durMs + 200) / 1000).toFixed(3), '-i', m.src, '-an', '-filter_complex', vf, '-t', ((durMs + 200) / 1000).toFixed(3), ...CODIFICAR, destino]);
  return relativo(destino);
}
function prepararFoto(m, w, h) {
  const destino = path.join(publico, `m${++n}.jpg`);
  const vf = recorteZona(m) + (m.encuadre === 'encajar' ? filtroEncajar(w, h) : "scale=w='min(2160,iw)':h='min(2160,ih)':force_original_aspect_ratio=decrease");
  ffmpeg(['-i', m.src, '-filter_complex', vf, '-frames:v', '1', '-q:v', '2', destino]);
  return relativo(destino);
}
const esVideo = (src) => /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(src);
const planosProps = planos.map((p) => {
  const d = p.hastaMs - p.desdeMs;
  const [w, h] = p.tipo === 'partido' ? [1080, 960] : [1080, 1920];
  const prep = (m) => ({src: esVideo(m.src) ? prepararVideo(m, d, w, h) : prepararFoto(m, w, h), tipo: esVideo(m.src) ? 'video' : 'foto', encuadre: 'cubrir', focoY: m.encuadre === 'encajar' ? 50 : m.focoY});
  if (p.tipo === 'tarjeta' || p.tipo === 'animacion') return {...p};
  if (p.tipo === 'partido') return {...p, arriba: prep(p.arriba), abajo: prep(p.abajo)};
  const r = prep(p);
  return {...p, src: r.src, tipo: r.tipo};
});
console.log(`✓ ${n} medios preparados`);

// ------------------------------------------------------------------ 3 · La pista de voz
const voz = path.join(publico, 'voz.wav');
const entradas = [];
const filtros = [];
pistas.forEach((pi, i) => {
  if (pi.recorteDesdeMs) entradas.push('-ss', (pi.recorteDesdeMs / 1000).toFixed(3));
  if (pi.recorteHastaMs) entradas.push('-to', (pi.recorteHastaMs / 1000).toFixed(3));
  entradas.push('-i', pi.src);
  const limpia = pi.limpiar ? `${CADENA_VOZ},` : '';
  filtros.push(`[${i}:a]${limpia}aresample=48000,aformat=channel_layouts=mono,adelay=${Math.round(pi.desdeMs || 0)}:all=1[a${i}]`);
});
const mezcla = `${pistas.map((_, i) => `[a${i}]`).join('')}amix=inputs=${pistas.length}:normalize=0:duration=longest,apad,atrim=0:${(duracionMs / 1000).toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=9[voz]`;
ffmpeg([...entradas, '-filter_complex', `${filtros.join(';')};${mezcla}`, '-map', '[voz]', '-ar', '48000', '-ac', '1', voz]);
console.log(`✓ pista de voz montada (${duracionSegundos(voz).toFixed(1)} s)`);

// ------------------------------------------------------------------ 4 · Subtítulos
// Cuántas palabras empiezan antes que la anterior (más de 250 ms): tiempos desordenados.
const desordenadas = (ps) => ps.reduce((n, w, i) => n + (i && w.startMs !== null && ps[i - 1].startMs !== null && w.startMs < ps[i - 1].startMs - 250 ? 1 : 0), 0);
const transcribir = (archivo, salida) => correr(process.execPath, [path.join(KIT, 'herramientas', 'transcribir.mjs'), archivo, '--salida', salida], {timeoutMs: 30 * 60 * 1000});
// Cada pista se transcribe POR SEPARADO y se coloca en su sitio con su "desdeMs" (y su recorte).
// Transcribir la pista ya mezclada falló dos veces: en el modo práctica devolvió los tiempos
// desordenados entre los 5 y los 16 s (subtítulos hasta 4 s antes de oírse), y en la primera tanda
// real los adelantó 1,3 s justo en el empalme entre una frase real y la narración (en orden, así que
// ningún aviso lo cazaba). Por separado, cada trozo es corto y su sitio se sabe exacto.
let oidas = [];
[...pistas].sort((a, b) => (a.desdeMs || 0) - (b.desdeMs || 0)).forEach((pi, i) => {
  const trozo = path.join(trabajo, `pista-${i + 1}.wav`);
  const ent = [];
  if (pi.recorteDesdeMs) ent.push('-ss', (pi.recorteDesdeMs / 1000).toFixed(3));
  if (pi.recorteHastaMs) ent.push('-to', (pi.recorteHastaMs / 1000).toFixed(3));
  ffmpeg([...ent, '-i', pi.src, '-vn', '-ar', '16000', '-ac', '1', trozo]);
  const trp = path.join(trabajo, `pista-${i + 1}-transcripcion.json`);
  transcribir(trozo, trp);
  const base = pi.desdeMs || 0;
  for (const w of leerJson(trp).palabras) oidas.push({...w, startMs: w.startMs + base, endMs: w.endMs + base});
  fs.rmSync(trozo, {force: true});
});
escribirJson(path.join(trabajo, 'voz-transcripcion.json'), {palabras: oidas});
const al = alinear(oidas, plan.textoHablado);
escribirJson(path.join(trabajo, 'palabras.json'), al.palabras);
console.log(`${al.porcentaje >= 85 ? '✓' : '⚠'} subtítulos: ${al.exactas} de ${al.total} palabras del guion oídas tal cual (${al.porcentaje} %)`);
if (al.porcentaje < 85) console.log('  ⚠ por debajo del 85 %: revisa que "textoHablado" sea lo que de verdad se dice y en ese orden');
const fueraDeOrden = desordenadas(al.palabras);
console.log(fueraDeOrden ? `  ⚠ ${fueraDeOrden} subtítulos salen antes que el anterior: mira la hoja de fotogramas y el orden de "textoHablado"` : '✓ subtítulos en orden con lo que se oye');

// ------------------------------------------------------------------ 5 · Remotion
const props = {acento: plan.acento || '#FFE600', audio: relativo(voz), duracionMs, planos: planosProps, textos: plan.textos || [], palabras: al.palabras, progreso: plan.progreso !== false, subtitulosY: plan.subtitulosY};
const archivoProps = path.join(trabajo, 'props.json');
escribirJson(archivoProps, props);
const render = path.join(trabajo, 'render.mp4');
const t0 = Date.now();
const renderizar = (extra = []) => correr(process.execPath, [path.join(KIT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', path.join(KIT, 'editor', 'src', 'index.ts'), 'VideoViral', render, `--props=${archivoProps}`, `--public-dir=${path.join(KIT, 'editor', 'public')}`, '--log=error', '--crf=20', ...extra], {timeoutMs: 60 * 60 * 1000, permitirFallo: true});
let r = renderizar();
if (r.codigo !== 0) {
  // En la prueba, Remotion falló una vez de cada tres con los mismos archivos ("No frame found…"):
  // se reintenta una vez con menos trabajo en paralelo.
  console.log(`⚠ Remotion falló (${(r.error.match(/Error[^\n]{0,160}/) || ['sin detalle'])[0].replace(/\x1B\[\d+m/g, '')}); se reintenta una vez más despacio`);
  r = renderizar(['--concurrency=2']);
  if (r.codigo !== 0) fallar(`Remotion no pudo montar el vídeo: ${r.error.replace(/\x1B\[\d+m/g, '').trim().split('\n').slice(0, 3).join(' ')}`);
}
console.log(`✓ montado con Remotion en ${Math.round((Date.now() - t0) / 1000)} s`);

// ------------------------------------------------------------------ 6 · Volumen final y entrega
fs.mkdirSync(path.dirname(plan.salida), {recursive: true});
const final = (filtro) => ffmpeg(['-i', render, '-c:v', 'copy', '-af', filtro, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', plan.salida]);
final('loudnorm=I=-14:TP=-1.5:LRA=7');
let vol = medirVolumen(plan.salida);
if (vol.lufs !== null && Math.abs(vol.lufs + 14) > 0.7) {
  // Segunda pasada: ajuste fino de volumen, con limitador para no saturar.
  const ajuste = (-14 - vol.lufs).toFixed(1);
  final(`loudnorm=I=-14:TP=-1.5:LRA=7,volume=${ajuste}dB,alimiter=limit=0.84:level=false`);
  vol = medirVolumen(plan.salida);
}
fs.rmSync(publico, {recursive: true, force: true});
escribirJson(path.join(trabajo, 'montaje.json'), {id: plan.id, salida: plan.salida, duracionMs, pctIA, pctPresencia, subtitulos_pct: al.porcentaje, volumen: vol});
console.log(`✓ ${path.basename(plan.salida)} · ${(duracionMs / 1000).toFixed(1)} s · volumen ${vol.lufs} LUFS · pico ${vol.pico} dB`);
console.log(`  guardado en: ${plan.salida}`);
