// Piezas comunes de las herramientas del kit: rutas, programas y utilidades.
// Todo funciona igual en Windows y en Mac. Nada de esto lo toca el usuario.
import {spawnSync, execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ES_WINDOWS = process.platform === 'win32';
export const ES_MAC = process.platform === 'darwin';
export const NOMBRE_CARPETA = 'Quiero-ser-viral';
export const NOMBRE_TERMINADOS = 'videos terminados';
export const WHISPER_DIR = path.join(KIT, 'motor', 'whisper');
export const WHISPER_VERSION = '1.5.5';
export const WHISPER_MODELO = 'small';

export function ffmpegPath() {
  return require('ffmpeg-static');
}
export function ffprobePath() {
  return require('ffprobe-static').path;
}
export function ytdlpPath() {
  const nombre = ES_WINDOWS ? 'yt-dlp.exe' : ES_MAC ? 'yt-dlp_macos' : 'yt-dlp_linux';
  return path.join(KIT, 'bin', nombre);
}
export function higgsfieldJs() {
  return path.join(KIT, 'node_modules', '@higgsfield', 'cli', 'bin', 'higgsfield.js');
}

// Ejecuta un programa sin pasar por la consola (así los acentos y las comillas llegan intactos).
export function correr(programa, args, {entrada, permitirFallo = false, timeoutMs = 30 * 60 * 1000} = {}) {
  const r = spawnSync(programa, args, {encoding: 'utf8', input: entrada, maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs, windowsHide: true});
  if (r.error) {
    if (permitirFallo) return {codigo: -1, salida: '', error: String(r.error.message || r.error)};
    throw r.error;
  }
  const res = {codigo: r.status, salida: r.stdout || '', error: r.stderr || ''};
  if (r.status !== 0 && !permitirFallo) {
    const e = new Error(`${path.basename(programa)} terminó con código ${r.status}: ${(r.stderr || r.stdout || '').trim().slice(-800)}`);
    e.resultado = res;
    throw e;
  }
  return res;
}

export function ffmpeg(args, opciones) {
  return correr(ffmpegPath(), ['-hide_banner', '-y', ...args], opciones);
}
export function ffprobeJson(archivo) {
  const r = correr(ffprobePath(), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', archivo]);
  return JSON.parse(r.salida);
}

export function higgsfield(args, opciones) {
  return correr(process.execPath, [higgsfieldJs(), ...args], opciones);
}

// yt-dlp con plan B de certificados: en algunos Windows (antivirus que revisa las conexiones)
// sus certificados propios fallan y hay que usar los del sistema.
export function ytdlp(args, opciones = {}) {
  // --encoding utf-8: sin él, en Windows se pierden los acentos y los separadores de la salida.
  const base = ['--no-warnings', '--ignore-config', '--encoding', 'utf-8'];
  let r = correr(ytdlpPath(), [...base, ...args], {...opciones, permitirFallo: true});
  if (r.codigo !== 0 && /CERTIFICATE_VERIFY_FAILED/i.test(r.error)) {
    r = correr(ytdlpPath(), [...base, '--compat-options', 'no-certifi', ...args], {...opciones, permitirFallo: true});
  }
  if (r.codigo !== 0 && !opciones.permitirFallo) throw new Error(`yt-dlp falló: ${r.error.trim().slice(-600)}`);
  return r;
}

// El escritorio real: en Windows puede estar dentro de OneDrive, así que se le pregunta al sistema.
export function escritorio() {
  if (ES_WINDOWS) {
    const r = correr('powershell.exe', ['-NoProfile', '-Command', "[Environment]::GetFolderPath('Desktop')"], {permitirFallo: true});
    const p = (r.salida || '').trim();
    if (p && fs.existsSync(p)) return p;
  } else if (!ES_MAC) {
    const r = correr('xdg-user-dir', ['DESKTOP'], {permitirFallo: true});
    const p = (r.salida || '').trim();
    if (p && fs.existsSync(p)) return p;
  }
  return path.join(os.homedir(), 'Desktop');
}
export function carpetaUsuario() {
  return path.join(escritorio(), NOMBRE_CARPETA);
}
export function carpetaTerminados() {
  return path.join(carpetaUsuario(), NOMBRE_TERMINADOS);
}

export function abrirEnSistema(ruta) {
  if (ES_WINDOWS) correr('explorer.exe', [ruta], {permitirFallo: true}); // explorer devuelve 1 aunque funcione
  else if (ES_MAC) correr('open', [ruta], {permitirFallo: true});
  else correr('xdg-open', [ruta], {permitirFallo: true});
}

export function leerJson(archivo) {
  return JSON.parse(fs.readFileSync(archivo, 'utf8').replace(/^\uFEFF/, ''));
}
export function escribirJson(archivo, datos) {
  fs.mkdirSync(path.dirname(archivo), {recursive: true});
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf8');
}

export function duracionSegundos(archivo) {
  const d = ffprobeJson(archivo);
  return parseFloat(d.format?.duration || '0');
}

// Volumen percibido (LUFS), rango y pico, medidos con ebur128.
export function medirVolumen(archivo) {
  const r = ffmpeg(['-nostats', '-i', archivo, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {permitirFallo: true});
  const t = r.error;
  const num = (re) => {
    const m = t.match(re);
    return m ? parseFloat(m[1]) : null;
  };
  return {lufs: num(/I:\s+(-?[\d.]+) LUFS/), rango: num(/LRA:\s+(-?[\d.]+) LU/), pico: num(/Peak:\s+(-?[\d.]+) dBFS/)};
}

// Umbral de silencio propio de cada grabación: se mide el nivel cada 100 ms y se corta entre el ruido
// de fondo (percentil 10) y la voz (percentil 75). Un umbral fijo fallaba: en una habitación con
// ruido (fondo a −42 dB) no veía ninguna pausa, y en una voz muy baja (−46 dB) lo cortaba todo.
// Devuelve también los niveles de cada ventana de 50 ms, para buscar las pausas con el MISMO nivel
// medio (el detector de silencios de ffmpeg mira los picos y, con ruido de fondo, nunca veía pausas).
export function umbralSilencio(archivo) {
  const r = ffmpeg(['-nostats', '-i', archivo, '-vn', '-af', 'aresample=16000,asetnsamples=n=800,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level', '-f', 'null', '-'], {permitirFallo: true});
  const niveles = [...r.error.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === '-inf' ? -120 : parseFloat(m[1])));
  if (niveles.length < 20) return {umbral: -40, fondo: null, voz: null, niveles, ventanaMs: 50};
  const v = [...niveles].sort((a, b) => a - b);
  const p = (q) => v[Math.floor(q * (v.length - 1))];
  const fondo = p(0.1), voz = p(0.75);
  const umbral = Math.round(Math.max(fondo + 0.4 * (voz - fondo), voz - 18));
  return {umbral, fondo: Math.round(fondo), voz: Math.round(voz), niveles, ventanaMs: 50};
}

// Pausas: tramos seguidos de ventanas por debajo del umbral que duran al menos minMs.
export function pausas(niv, minMs) {
  const out = [];
  let ini = null;
  niv.niveles.forEach((x, i) => {
    if (x < niv.umbral) {
      if (ini === null) ini = i;
    } else if (ini !== null) {
      if ((i - ini) * niv.ventanaMs >= minMs) out.push([ini * niv.ventanaMs, i * niv.ventanaMs]);
      ini = null;
    }
  });
  if (ini !== null && (niv.niveles.length - ini) * niv.ventanaMs >= minMs) out.push([ini * niv.ventanaMs, niv.niveles.length * niv.ventanaMs]);
  return out;
}

// Normaliza un texto para comparar palabras (sin tildes, sin signos, en minúscula).
export function normalizar(x) {
  return x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
}

export function args(argv = process.argv.slice(2)) {
  const sueltos = [];
  const opciones = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const clave = a.slice(2);
      const sig = argv[i + 1];
      if (sig === undefined || sig.startsWith('--')) opciones[clave] = true;
      else {
        opciones[clave] = sig;
        i++;
      }
    } else sueltos.push(a);
  }
  return {sueltos, opciones};
}

export function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}
