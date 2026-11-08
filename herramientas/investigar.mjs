// Investiga qué vídeos cortos funcionan en un nicho, con cifras reales.
// Uso:
//   node herramientas/investigar.mjs etiquetas <etiqueta1,etiqueta2,...> --salida <candidatos.json> [--por-etiqueta 40] [--detalle 25] [--max-duracion 90]
//        → YouTube Shorts de cada etiqueta, con visitas medidas, ordenados de más a menos vistos
//   node herramientas/investigar.mjs buscar "<texto>" --salida <candidatos.json> [--n 40] [--max-duracion 90]
//        → plan B: búsqueda por texto (devuelve menos virales que las etiquetas)
//   node herramientas/investigar.mjs video <url-youtube> [<url>...] --salida <candidatos.json>
//        → datos de vídeos de YouTube concretos (los que pegue la persona)
//   node herramientas/investigar.mjs tiktok <url-tiktok> → título y autor (TikTok NO da visitas: "sin datos")
//   node herramientas/investigar.mjs analizar <url-youtube> --dir <carpeta>
//        → transcripción con tiempos + hoja de 12 fotogramas + cortes de plano. Solo para ANALIZAR:
//          el vídeo descargado se borra al terminar y nunca se usa en un montaje.
import fs from 'node:fs';
import path from 'node:path';
import {ytdlp, ffmpeg, ffmpegPath, duracionSegundos, escribirJson, correr, args, fallar, KIT} from './comun.mjs';

const {sueltos, opciones} = args();
const orden = sueltos[0];
const maxDur = parseFloat(opciones['max-duracion'] || '90');
const SEP = '\t';
const CAMPOS = ['id', 'view_count', 'duration', 'channel', 'upload_date', 'title'];
const plantilla = CAMPOS.map((c) => `%(${c})s`).join(SEP);

const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^#/, '').replace(/\s+/g, '').toLowerCase();

function detalles(urls) {
  if (!urls.length) return [];
  const r = ytdlp(['--skip-download', '--ignore-errors', '--print', plantilla, ...urls], {permitirFallo: true, timeoutMs: 20 * 60 * 1000});
  const out = [];
  for (const linea of r.salida.split('\n')) {
    const p = linea.split(SEP);
    if (p.length < CAMPOS.length) continue;
    const num = (x) => (x === 'NA' || x === '' ? null : parseFloat(x));
    out.push({id: p[0], url: `https://www.youtube.com/shorts/${p[0]}`, visitas: num(p[1]), duracion: num(p[2]), canal: p[3] === 'NA' ? null : p[3], fecha: p[4] === 'NA' ? null : `${p[4].slice(0, 4)}-${p[4].slice(4, 6)}-${p[4].slice(6, 8)}`, titulo: p.slice(5).join(SEP)});
  }
  return out;
}

function guardar(lista, origen) {
  const filtrados = lista.filter((v) => v.duracion !== null && v.duracion <= maxDur);
  const descartados = lista.length - filtrados.length;
  filtrados.sort((a, b) => (b.visitas ?? -1) - (a.visitas ?? -1));
  if (!opciones.salida) fallar('falta --salida');
  escribirJson(opciones.salida, {fecha: new Date().toISOString().slice(0, 10), origen, max_duracion: maxDur, candidatos: filtrados});
  console.log(`✓ ${filtrados.length} vídeos de ≤ ${maxDur} s (${descartados} descartados por largos o sin duración) → ${opciones.salida}`);
  for (const v of filtrados.slice(0, 15)) console.log(`  ${String(v.visitas ?? 'sin datos').padStart(10)} visitas · ${v.duracion} s · ${v.canal} · ${v.titulo.slice(0, 70)}`);
}

if (orden === 'etiquetas') {
  const etiquetas = (sueltos[1] || '').split(',').map(sinTildes).filter(Boolean);
  if (!etiquetas.length) fallar('faltan las etiquetas (separadas por comas)');
  const porEtiqueta = parseInt(opciones['por-etiqueta'] || '40', 10);
  const vistos = new Map();
  for (const e of etiquetas) {
    const r = ytdlp(['--flat-playlist', '--playlist-end', String(porEtiqueta), '--print', `%(id)s${SEP}%(view_count)s`, `https://www.youtube.com/hashtag/${encodeURIComponent(e)}/shorts`], {permitirFallo: true, timeoutMs: 5 * 60 * 1000});
    let n = 0;
    for (const linea of r.salida.split('\n')) {
      const [id, v] = linea.split(SEP);
      if (!id || id.length < 6) continue;
      n++;
      if (!vistos.has(id)) vistos.set(id, {id, visitas: v === 'NA' ? null : parseFloat(v), etiqueta: e});
    }
    console.log(`${n ? '✓' : '✗'} #${e}: ${n} Shorts${n ? '' : ' (etiqueta sin resultados o no se pudo leer)'}`);
  }
  const top = [...vistos.values()].sort((a, b) => (b.visitas ?? -1) - (a.visitas ?? -1)).slice(0, parseInt(opciones.detalle || '25', 10));
  const det = detalles(top.map((t) => `https://www.youtube.com/shorts/${t.id}`));
  for (const d of det) d.etiqueta = vistos.get(d.id)?.etiqueta ?? null;
  guardar(det, {tipo: 'etiquetas', etiquetas});
} else if (orden === 'buscar') {
  const texto = sueltos[1];
  if (!texto) fallar('falta el texto a buscar');
  const n = parseInt(opciones.n || '50', 10);
  // La búsqueda normal ("ytsearch") solo trae tutoriales largos, también con "#shorts" (0 Shorts en 4
  // búsquedas, en la primera tanda real y en la prueba de la v2). Con el filtro "menos de 4 minutos"
  // de la propia búsqueda de YouTube sí salen vídeos cortos; luego se quedan los de ≤ 90 s.
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(texto)}&sp=EgIYAQ%253D%253D`;
  const r = ytdlp(['--flat-playlist', '--playlist-end', String(n), '--print', `%(id)s`, url], {permitirFallo: true, timeoutMs: 5 * 60 * 1000});
  const ids = r.salida.split('\n').map((x) => x.trim()).filter((x) => x.length > 5);
  guardar(detalles(ids.map((id) => `https://www.youtube.com/watch?v=${id}`)), {tipo: 'busqueda (menos de 4 min)', texto});
} else if (orden === 'video') {
  const urls = sueltos.slice(1);
  if (!urls.length) fallar('faltan las direcciones de los vídeos');
  guardar(detalles(urls), {tipo: 'enlaces de la persona'});
} else if (orden === 'tiktok') {
  const url = sueltos[1];
  const r = correr('curl', ['-sS', `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`], {permitirFallo: true});
  try {
    const j = JSON.parse(r.salida);
    console.log(JSON.stringify({url, titulo: j.title ?? null, autor: j.author_name ?? null, visitas: 'sin datos'}));
  } catch {
    fallar(`TikTok no devolvió la ficha de ese vídeo (${url})`);
  }
} else if (orden === 'analizar') {
  const url = sueltos[1];
  const dir = opciones.dir;
  if (!url || !dir) fallar('uso: analizar <url> --dir <carpeta>');
  fs.mkdirSync(dir, {recursive: true});
  const id = (url.match(/(?:shorts\/|v=|youtu\.be\/)([\w-]{6,})/) || [])[1] || 'video';
  const base = path.join(dir, id);
  ytdlp(['-f', 'bv*[height<=480]+ba/b[height<=480]/worst', '--merge-output-format', 'mp4', '--ffmpeg-location', path.dirname(ffmpegPath()), '-o', `${base}.%(ext)s`, url], {timeoutMs: 10 * 60 * 1000});
  const video = [`${base}.mp4`, `${base}.webm`, `${base}.mkv`].find((f) => fs.existsSync(f));
  if (!video) fallar('no se pudo descargar el vídeo para analizarlo');
  const dur = duracionSegundos(video);
  const vista = `${base}-fotogramas.jpg`;
  ffmpeg(['-i', video, '-vf', `fps=1/${Math.max(0.5, dur / 12).toFixed(2)},scale=180:-2,tile=6x2`, '-frames:v', '1', '-q:v', '4', vista], {permitirFallo: true});
  const cortes = ffmpeg(['-nostats', '-i', video, '-vf', "select='gt(scene,0.3)',showinfo", '-an', '-f', 'null', '-'], {permitirFallo: true}).error.match(/pts_time:[\d.]+/g)?.length ?? 0;
  const tr = `${base}-transcripcion.json`;
  correr(process.execPath, [path.join(KIT, 'herramientas', 'transcribir.mjs'), video, '--salida', tr], {timeoutMs: 20 * 60 * 1000});
  fs.rmSync(video, {force: true});
  escribirJson(`${base}-analisis.json`, {url, id, duracion: Math.round(dur * 10) / 10, cortes_de_plano: cortes, segundos_por_plano: Math.round((dur / (cortes + 1)) * 10) / 10, fotogramas: vista, transcripcion: tr});
  console.log(`✓ analizado ${id}: ${dur.toFixed(1)} s · ${cortes} cortes de plano (uno cada ${(dur / (cortes + 1)).toFixed(1)} s)`);
  console.log(`  fotogramas: ${vista}`);
  console.log(`  transcripción: ${tr}`);
} else fallar('uso: investigar.mjs etiquetas|buscar|video|tiktok|analizar ...');
