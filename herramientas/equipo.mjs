// Comprueba e instala lo que el kit necesita. Lo usa el asistente /setup.
// Uso:
//   node herramientas/equipo.mjs comprobar          → lista de ✓/✗ (y JSON al final)
//   node herramientas/equipo.mjs instalar-ytdlp     → descarga el lector de YouTube en bin/
//   node herramientas/equipo.mjs instalar-whisper   → instala el transcriptor y su modelo (466 MB)
//   node herramientas/equipo.mjs probar-montaje     → monta un vídeo de 2 s para comprobar Remotion
//   node herramientas/equipo.mjs entrar-higgsfield  → abre el navegador para entrar en Higgsfield
import fs from 'node:fs';
import path from 'node:path';
import {KIT, ES_WINDOWS, ES_MAC, WHISPER_DIR, WHISPER_VERSION, WHISPER_MODELO, correr, ffmpeg, ffprobePath, higgsfield, ytdlp, ytdlpPath, escritorio, args, fallar} from './comun.mjs';

const {sueltos} = args();
const orden = sueltos[0] || 'comprobar';

function comprobar() {
  const r = {};
  const v = process.versions.node.split('.').map(Number);
  r.node = {ok: v[0] >= 20, detalle: `Node ${process.versions.node}`};
  r.piezas = {ok: fs.existsSync(path.join(KIT, 'node_modules', 'remotion')), detalle: 'piezas del kit (npm install)'};
  if (!r.piezas.ok) return r;
  try {
    const s = ffmpeg(['-version']).salida.split('\n')[0];
    r.ffmpeg = {ok: true, detalle: s.slice(0, 60)};
  } catch (e) {
    r.ffmpeg = {ok: false, detalle: e.message};
  }
  try {
    correr(ffprobePath(), ['-version']);
    r.ffprobe = {ok: true, detalle: 'ffprobe responde'};
  } catch (e) {
    r.ffprobe = {ok: false, detalle: e.message};
  }
  const hv = higgsfield(['--version'], {permitirFallo: true});
  r.higgsfield = {ok: hv.codigo === 0, detalle: (hv.salida || hv.error).trim().split('\n')[0]};
  const hs = higgsfield(['account', 'status'], {permitirFallo: true});
  const linea = (hs.salida || hs.error).trim().split('\n')[0];
  const plan = linea.match(/—\s*(\S+)\s+plan,\s*([\d.]+)\s*credits/i);
  // Higgsfield es OPCIONAL (v2): sin cuenta, el kit funciona con animaciones y recursos propios.
  r.higgsfield_cuenta = {ok: hs.codigo === 0 && !!plan, opcional: true, detalle: plan ? `plan ${plan[1]}, ${plan[2]} créditos` : 'sin sesión (opcional: solo para recursos generados con IA)', plan: plan ? plan[1] : null, creditos: plan ? parseFloat(plan[2]) : null};
  if (fs.existsSync(ytdlpPath())) {
    const y = ytdlp(['--version'], {permitirFallo: true});
    r.ytdlp = {ok: y.codigo === 0, detalle: `yt-dlp ${(y.salida || '').trim()}`};
  } else r.ytdlp = {ok: false, detalle: 'no descargado todavía'};
  const exe = ES_WINDOWS ? path.join(WHISPER_DIR, 'main.exe') : path.join(WHISPER_DIR, 'main');
  const modelo = path.join(WHISPER_DIR, `ggml-${WHISPER_MODELO}.bin`);
  r.transcriptor = {ok: fs.existsSync(exe) && fs.existsSync(modelo), detalle: fs.existsSync(modelo) ? 'instalado con su modelo' : 'no instalado todavía'};
  const esc = escritorio();
  r.escritorio = {ok: fs.existsSync(esc), detalle: esc};
  return r;
}

async function instalarYtdlp() {
  const destino = ytdlpPath();
  const nombre = path.basename(destino);
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${nombre}`;
  fs.mkdirSync(path.dirname(destino), {recursive: true});
  // curl viene con Windows 10/11 y con Mac, y usa los certificados del sistema.
  const r = correr('curl', ['-sSL', '--fail', '-o', destino, url], {permitirFallo: true, timeoutMs: 10 * 60 * 1000});
  if (r.codigo !== 0 || !fs.existsSync(destino) || fs.statSync(destino).size < 1_000_000) fallar(`no se pudo descargar ${nombre}: ${r.error.trim()}`);
  if (!ES_WINDOWS) fs.chmodSync(destino, 0o755);
  const v = ytdlp(['--version']);
  console.log(`✓ yt-dlp ${v.salida.trim()} en bin/${nombre}`);
}

async function instalarWhisper() {
  const {installWhisperCpp, downloadWhisperModel} = await import('@remotion/install-whisper-cpp');
  fs.mkdirSync(path.dirname(WHISPER_DIR), {recursive: true});
  try {
    await installWhisperCpp({to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false});
  } catch (e) {
    if (ES_MAC) fallar(`no se pudo instalar el transcriptor. En Mac necesita las herramientas de desarrollo de Apple: ejecuta "xcode-select --install", acepta la ventana y vuelve a intentarlo. Detalle: ${e.message}`);
    fallar(`no se pudo instalar el transcriptor: ${e.message}`);
  }
  await downloadWhisperModel({model: WHISPER_MODELO, folder: WHISPER_DIR, printOutput: false});
  console.log(`✓ transcriptor ${WHISPER_VERSION} y modelo "${WHISPER_MODELO}" en motor/whisper/`);
}

function probarMontaje() {
  const salida = path.join(KIT, 'workspace', '_prueba-equipo.mp4');
  const t0 = Date.now();
  correr(process.execPath, [path.join(KIT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js'), 'render', path.join(KIT, 'editor', 'src', 'index.ts'), 'PruebaEquipo', salida, `--public-dir=${path.join(KIT, 'editor', 'public')}`, '--log=error'], {timeoutMs: 15 * 60 * 1000});
  const ok = fs.existsSync(salida) && fs.statSync(salida).size > 10_000;
  if (!ok) fallar('Remotion no generó el vídeo de prueba');
  fs.rmSync(salida);
  console.log(`✓ Remotion monta vídeos (prueba de 2 s en ${Math.round((Date.now() - t0) / 1000)} s)`);
}

function entrarHiggsfield() {
  console.log('Se abre el navegador: entra en tu cuenta de Higgsfield y acepta. Esta ventana espera hasta 5 minutos.');
  const r = higgsfield(['auth', 'login'], {permitirFallo: true, timeoutMs: 5 * 60 * 1000});
  console.log((r.salida + r.error).trim().split('\n').slice(-3).join('\n'));
  const s = higgsfield(['account', 'status'], {permitirFallo: true});
  if (s.codigo === 0) console.log(`✓ ${s.salida.trim().split('\n')[0]}`);
  else fallar('todavía no hay sesión en Higgsfield');
}

if (orden === 'comprobar') {
  const r = comprobar();
  for (const [k, v] of Object.entries(r)) console.log(`${v.ok ? '✓' : v.opcional ? '·' : '✗'} ${k}: ${v.detalle}`);
  console.log('JSON ' + JSON.stringify(r));
} else if (orden === 'instalar-ytdlp') await instalarYtdlp();
else if (orden === 'instalar-whisper') await instalarWhisper();
else if (orden === 'probar-montaje') probarMontaje();
else if (orden === 'entrar-higgsfield') entrarHiggsfield();
else fallar(`orden desconocida: ${orden}`);
