// Revisa lo que dejó la persona en su carpeta: sus GRABACIONES (vídeos hablando a cámara con los
// guiones) y, si quiere, RECURSOS propios (vídeos sin hablar, grabaciones de pantalla). Desde la v2
// el kit no usa fotos ni audios sueltos: se ignoran con un aviso.
// Uso:
//   node herramientas/material.mjs <carpeta> --salida <material.json> --vistas <carpeta-de-vistas>
// Las "vistas" son tiras de 6 fotogramas de cada vídeo, para que Claude MIRE qué es cada uno y dónde
// está la cara (para el focoY de cortes.mjs).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ffmpeg, ffprobeJson, medirVolumen, umbralSilencio, pausas, escribirJson, args, fallar, NOMBRE_TERMINADOS} from './comun.mjs';

const {sueltos, opciones} = args();
const carpeta = sueltos[0];
if (!carpeta || !fs.existsSync(carpeta)) fallar(`no encuentro la carpeta: ${carpeta}`);
const salida = opciones.salida || path.join(carpeta, 'material.json');
const vistas = opciones.vistas;
if (vistas) fs.mkdirSync(vistas, {recursive: true});

const EXT = {
  video: ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'],
  foto: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  audio: ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.opus', '.flac'],
};
const tipoDe = (f) => Object.keys(EXT).find((t) => EXT[t].includes(path.extname(f).toLowerCase())) || null;

function listar(dir, profundidad = 0) {
  const out = [];
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.name.startsWith('.') || e.name.startsWith('~$')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === NOMBRE_TERMINADOS || profundidad >= 1) continue;
      out.push(...listar(p, profundidad + 1));
    } else if (!/^LEEME/i.test(e.name) && !/\.(json|txt|md)$/i.test(e.name)) out.push(p);
  }
  return out;
}

function huella(p) {
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(Math.min(1024 * 1024, fs.statSync(p).size));
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  return crypto.createHash('md5').update(buf).update(String(fs.statSync(p).size)).digest('hex');
}

const nombreVista = (p, i) => `${String(i + 1).padStart(2, '0')}-${path.basename(p).replace(/[^\p{L}\p{N}._-]+/gu, '_')}.jpg`;
// Las copias ("video (2).mp4", "video - copia.mp4") van al final: si hay duplicado, se marca la copia.
const esCopia = (p) => /(\(\d+\)|[\s_-]cop(ia|y)(\s*\d*)?)\.[^.]+$/i.test(path.basename(p));
const archivos = listar(carpeta).sort((a, b) => esCopia(a) - esCopia(b) || a.localeCompare(b));
const items = [];
const vistos = new Map();
archivos.forEach((p, i) => {
  const it = {archivo: p, nombre: path.basename(p), tipo: tipoDe(p), bytes: fs.statSync(p).size, problemas: []};
  items.push(it);
  if (it.tipo === 'foto') return void it.problemas.push('IGNORADA: el kit ya no usa fotos; trabaja con tus vídeos');
  if (it.tipo === 'audio') return void it.problemas.push('IGNORADO: el kit usa la voz de tus vídeos, no audios sueltos');
  if (!it.tipo) return void it.problemas.push('NO_SOPORTADO: no es un vídeo');
  if (it.bytes === 0) return void it.problemas.push('VACIO: el archivo pesa 0 bytes');
  const h = huella(p);
  if (vistos.has(h)) return void it.problemas.push(`DUPLICADO: es el mismo archivo que "${vistos.get(h)}"`);
  vistos.set(h, it.nombre);
  let info;
  try {
    info = ffprobeJson(p);
  } catch {
    return void it.problemas.push('ILEGIBLE: no se puede abrir (archivo dañado o formato raro)');
  }
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  if (!v) return void it.problemas.push('ILEGIBLE: no tiene imagen');
  let giro = 0;
  if (v.tags?.rotate) giro = parseInt(v.tags.rotate, 10);
  for (const sd of v.side_data_list || []) if (sd.rotation !== undefined) giro = parseInt(sd.rotation, 10);
  const girado = Math.abs(giro) % 180 === 90;
  it.ancho = girado ? v.height : v.width;
  it.alto = girado ? v.width : v.height;
  it.orientacion = it.alto > it.ancho * 1.1 ? 'vertical' : it.ancho > it.alto * 1.1 ? 'horizontal' : 'cuadrado';
  it.duracion = Math.round(parseFloat(info.format.duration || '0') * 10) / 10;
  const fr = (v.avg_frame_rate || v.r_frame_rate || '0/1').split('/');
  it.fps = Math.round((parseFloat(fr[0]) / parseFloat(fr[1] || '1')) * 10) / 10;
  if (a) {
    const vol = medirVolumen(p);
    it.voz_lufs = vol.lufs;
    const niv = umbralSilencio(p);
    const silencio = pausas(niv, 600).reduce((s, [x, y]) => s + (y - x), 0) / 1000;
    it.segundos_con_voz = Math.max(0, Math.round((it.duracion - silencio) * 10) / 10);
  } else it.segundos_con_voz = 0;
  // Grabación = vídeo con voz de verdad; recurso = vídeo sin voz (o casi), para poner encima.
  it.clase = it.segundos_con_voz >= 15 ? 'grabacion' : 'recurso';
  if (it.clase === 'grabacion') {
    if (it.orientacion !== 'vertical') it.problemas.push(`HORIZONTAL: la grabación es ${it.orientacion}; se recortará el centro. Para las próximas, graba con el móvil en vertical`);
    if (it.voz_lufs !== null && it.voz_lufs < -24) it.problemas.push(`VOZ_BAJA: ${it.voz_lufs} LUFS (lo normal en redes es −14); el kit la limpia y la sube`);
    if (Math.min(it.ancho, it.alto) < 720) it.problemas.push(`BAJA_RES: ${it.ancho}×${it.alto}; se verá borrosa (graba al menos en 1080p)`);
    if (it.duracion > 120) it.problemas.push(`MUY_LARGA: ${it.duracion} s; si es más de un guion, dime qué trozo es cada uno`);
  } else if (!a) it.problemas.push('SIN_AUDIO: sin sonido; sirve como recurso para poner encima, no como grabación');
  if (vistas && it.duracion > 0) {
    it.vista = path.join(vistas, nombreVista(p, i));
    const cada = Math.max(0.5, it.duracion / 6);
    ffmpeg(['-i', p, '-vf', `fps=1/${cada.toFixed(2)},scale=240:-2,tile=6x1`, '-frames:v', '1', '-q:v', '5', it.vista], {permitirFallo: true});
  }
});

const grabaciones = items.filter((x) => x.clase === 'grabacion' && !x.problemas.some((p) => /^(ILEGIBLE|VACIO|DUPLICADO)/.test(p)));
const recursos = items.filter((x) => x.clase === 'recurso' && !x.problemas.some((p) => /^(ILEGIBLE|VACIO|DUPLICADO)/.test(p)));
const resumen = {carpeta, grabaciones: grabaciones.map((g) => g.archivo), recursos_propios: recursos.map((r) => r.archivo), faltas: []};
if (!grabaciones.length) resumen.faltas.push('FALTA_GRABACION: no hay ningún vídeo en el que se te oiga hablar al menos 15 s');

escribirJson(salida, {resumen, archivos: items});
console.log(`Material revisado: ${items.length} archivos · ${grabaciones.length} grabaciones · ${recursos.length} recursos propios`);
for (const g of grabaciones) console.log(`  ✓ grabación: ${g.nombre} (${g.duracion} s, ${g.segundos_con_voz} s con voz, ${g.orientacion})`);
for (const it of items) for (const p of it.problemas) console.log(`  ✗ ${it.nombre}: ${p}`);
for (const f of resumen.faltas) console.log(`  ✗ ${f}`);
if (!resumen.faltas.length) console.log('✓ hay material para editar');
console.log(`Detalle en: ${salida}`);
