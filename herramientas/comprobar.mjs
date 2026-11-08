// Comprueba un vídeo terminado antes de decir "listo" (punto B y E de la lista de calidad).
// Uso:
//   node herramientas/comprobar.mjs <video.mp4> [--hoja <imagen.jpg>] [--sin-limite-duracion]
// Mide formato, duración, volumen y fotogramas vacíos, y saca una hoja de 12 fotogramas para que
// Claude la MIRE: cara tapada por un texto, textos fuera de márgenes o en la zona de botones.
import fs from 'node:fs';
import path from 'node:path';
import {KIT, ffmpeg, ffprobeJson, medirVolumen, args, fallar} from './comun.mjs';

const {sueltos, opciones} = args();
const video = sueltos[0];
if (!video || !fs.existsSync(video)) fallar(`no existe el vídeo: ${video}`);
const info = ffprobeJson(video);
const v = info.streams.find((s) => s.codec_type === 'video');
const a = info.streams.find((s) => s.codec_type === 'audio');
const dur = parseFloat(info.format.duration);
const fr = (v?.r_frame_rate || '0/1').split('/');
const fps = parseFloat(fr[0]) / parseFloat(fr[1] || '1');
const vol = medirVolumen(video);

const res = [];
const ok = (cond, texto) => res.push({ok: !!cond, texto});
ok(v && v.width === 1080 && v.height === 1920, `formato vertical 1080×1920 (${v?.width}×${v?.height})`);
ok(Math.abs(fps - 30) < 0.5, `30 fotogramas por segundo (${fps.toFixed(2)})`);
ok(v?.codec_name === 'h264' && a?.codec_name === 'aac', `vídeo H.264 y sonido AAC (${v?.codec_name} + ${a?.codec_name})`);
if (!opciones['sin-limite-duracion']) ok(dur >= 30 && dur <= 60.5, `dura entre 30 y 60 s (${dur.toFixed(1)} s)`);
ok(vol.lufs !== null && Math.abs(vol.lufs + 14) <= 1, `volumen −14 LUFS ± 1 (${vol.lufs})`);
ok(vol.pico !== null && vol.pico <= -0.9, `pico ≤ −1 dB (${vol.pico})`);
ok(vol.rango !== null && vol.rango <= 6, `rango de volumen ≤ 6 LU (${vol.rango})`);

// Fotogramas negros o blancos de más de 3 fotogramas seguidos (0,1 s).
const negro = ffmpeg(['-nostats', '-i', video, '-vf', 'blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-'], {permitirFallo: true}).error.match(/black_start/g)?.length ?? 0;
const blanco = ffmpeg(['-nostats', '-i', video, '-vf', 'negate,blackdetect=d=0.1:pix_th=0.06', '-an', '-f', 'null', '-'], {permitirFallo: true}).error.match(/black_start/g)?.length ?? 0;
ok(negro === 0 && blanco === 0, `sin pantallazos negros o blancos (${negro} negros, ${blanco} blancos)`);

// La hoja va a workspace/hojas/, nunca junto al vídeo: si no, acabaría en "videos terminados" del
// escritorio de la persona, mezclada con sus vídeos (Paso 7).
const hoja = opciones.hoja || path.join(KIT, 'workspace', 'hojas', path.basename(video).replace(/\.mp4$/i, '') + '-hoja.jpg');
fs.mkdirSync(path.dirname(hoja), {recursive: true});
ffmpeg(['-i', video, '-vf', `fps=1/${(dur / 12).toFixed(3)},scale=270:-2,tile=6x2`, '-frames:v', '1', '-q:v', '3', hoja], {permitirFallo: true});

for (const r of res) console.log(`${r.ok ? '✓' : '✗'} ${r.texto}`);
const fallos = res.filter((r) => !r.ok).length;
console.log(fallos ? `✗ ${fallos} comprobación(es) fallida(s)` : '✓ el vídeo pasa todas las comprobaciones automáticas');
console.log(`Hoja de fotogramas para revisar a ojo: ${hoja}`);
console.log('  Mira en ella: ningún texto tapa la cara · ningún texto toca los bordes · nada importante en el 20 % de abajo ni en el 15 % de la derecha.');
process.exit(fallos ? 2 : 0);
