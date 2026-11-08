// Pasa a texto lo que se dice en un audio o vídeo, con el tiempo de cada palabra. Gratis y en local.
// Uso:
//   node herramientas/transcribir.mjs <archivo> --salida <transcripcion.json> [--desde s] [--hasta s]
// Salida: {texto, palabras: [{text, startMs, endMs}]}. Las etiquetas que inventa el transcriptor
// ("[Música]", "[Motor]") se quitan, y los trozos de palabra ("investig" + "ar") se unen.
// OJO: el transcriptor se equivoca con nombres propios y algunas palabras. Para subtítulos se usa
// SIEMPRE el texto del guion y de aquí solo los tiempos (herramientas/alinear.mjs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ffmpeg, escribirJson, args, fallar, WHISPER_DIR, WHISPER_VERSION, WHISPER_MODELO} from './comun.mjs';

const {sueltos, opciones} = args();
const archivo = sueltos[0];
if (!archivo || !fs.existsSync(archivo)) fallar(`no existe: ${archivo}`);
if (!opciones.salida) fallar('falta --salida');
if (!fs.existsSync(path.join(WHISPER_DIR, `ggml-${WHISPER_MODELO}.bin`))) fallar('el transcriptor no está instalado: ejecuta /setup');

const tmp = path.join(os.tmpdir(), `qsv-${process.pid}-${Date.now()}.wav`);
const corte = [];
if (opciones.desde) corte.push('-ss', String(opciones.desde));
const entrada = ['-i', archivo];
if (opciones.hasta) entrada.push('-to', String(parseFloat(opciones.hasta) - parseFloat(opciones.desde || '0')));
ffmpeg([...corte, ...entrada, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', tmp]);

const {transcribe, toCaptions} = await import('@remotion/install-whisper-cpp');
const out = await transcribe({inputPath: tmp, whisperPath: WHISPER_DIR, whisperCppVersion: WHISPER_VERSION, model: WHISPER_MODELO, tokenLevelTimestamps: true, language: 'es', printOutput: false});
fs.rmSync(tmp, {force: true});

const {captions} = toCaptions({whisperCppOutput: out});
const palabras = [];
for (const c of captions) {
  if (/^\s*[\[(].*[\])]\s*$/.test(c.text)) continue;
  if (c.text.startsWith(' ') || palabras.length === 0) palabras.push({text: c.text.trim(), startMs: c.startMs, endMs: c.endMs});
  else {
    const w = palabras[palabras.length - 1];
    w.text += c.text;
    w.endMs = c.endMs;
  }
}
const limpias = palabras.filter((w) => /[\p{L}\p{N}]/u.test(w.text) && !/^[\[(]/.test(w.text));
const texto = limpias.map((w) => w.text).join(' ');
escribirJson(opciones.salida, {archivo, texto, palabras: limpias});
console.log(`✓ ${limpias.length} palabras transcritas → ${opciones.salida}`);
console.log(`TEXTO: ${texto}`);
