// Habla con Higgsfield (OPCIONAL: recursos generados) a través de su programa, sin pasar por la
// consola (los acentos llegan intactos).
// Uso:
//   node herramientas/higgs.mjs saldo
//   node herramientas/higgs.mjs coste <modelo> [parámetros...]
//   node herramientas/higgs.mjs crear <modelo> --salida <archivo> [parámetros...]
// Los parámetros son los del programa de Higgsfield, por ejemplo (ver referencias/recursos.md):
//   flux_2 --prompt "Photorealistic vertical photo of …. No people, no hands, no text." --aspect_ratio 9:16
//   seedance_2_0_mini --prompt "Cinematic vertical b-roll of …. No people." --duration 5 --aspect_ratio 9:16 --resolution 480p
// "crear" espera al resultado, lo descarga en --salida y, si Higgsfield devuelve "failed"
// (pasa a veces, sin cobrar), lo reintenta UNA vez. Nunca más: cada intento puede gastar créditos.
import fs from 'node:fs';
import path from 'node:path';
import {higgsfield, correr, fallar} from './comun.mjs';

const argv = process.argv.slice(2);
const orden = argv[0];

function saldo() {
  const r = higgsfield(['account', 'status'], {permitirFallo: true});
  const linea = (r.salida || r.error).trim().split('\n')[0];
  const m = linea.match(/—\s*(\S+)\s+plan,\s*([\d.]+)\s*credits/i);
  return {ok: r.codigo === 0 && !!m, plan: m?.[1] ?? null, creditos: m ? parseFloat(m[2]) : null, linea};
}

function parsearTrabajo(texto) {
  const i = texto.indexOf('[') >= 0 && (texto.indexOf('{') < 0 || texto.indexOf('[') < texto.indexOf('{')) ? texto.indexOf('[') : texto.indexOf('{');
  if (i < 0) return null;
  // El JSON va primero; detrás puede venir una línea "Error: job ... failed".
  for (let fin = texto.length; fin > i; fin = texto.lastIndexOf(texto[i] === '[' ? ']' : '}', fin - 1)) {
    try {
      const j = JSON.parse(texto.slice(i, fin + 1));
      return Array.isArray(j) ? j[0] : j;
    } catch {
      /* sigue probando con un cierre anterior */
    }
    if (fin <= i) break;
  }
  return null;
}

if (orden === 'saldo') {
  const s = saldo();
  if (!s.ok) fallar(`sin sesión en Higgsfield o sin conexión: ${s.linea}`);
  console.log(`✓ plan ${s.plan}, ${s.creditos} créditos`);
} else if (orden === 'coste') {
  const r = higgsfield(['generate', 'cost', ...argv.slice(1)], {permitirFallo: true});
  const t = (r.salida + r.error).trim();
  const m = t.match(/([\d.]+)\s*credits/i);
  if (!m) fallar(`no se pudo calcular el coste: ${t.split('\n').slice(-2).join(' ')}`);
  console.log(`COSTE ${m[1]}`);
  console.log(`✓ costaría ${m[1]} créditos`);
} else if (orden === 'crear') {
  const resto = argv.slice(1);
  const iS = resto.indexOf('--salida');
  if (iS < 0 || !resto[iS + 1]) fallar('falta --salida');
  const salida = resto[iS + 1];
  const params = resto.filter((_, k) => k !== iS && k !== iS + 1);
  const antes = saldo();
  let trabajo = null;
  for (let intento = 1; intento <= 2; intento++) {
    const r = higgsfield(['generate', 'create', ...params, '--wait', '--wait-timeout', '20m', '--json'], {permitirFallo: true, timeoutMs: 25 * 60 * 1000});
    const texto = r.salida + '\n' + r.error;
    if (/plan "?(Pro|Ultimate)"?/i.test(texto)) fallar(`este modelo exige un plan superior de Higgsfield: ${texto.trim().split('\n').pop()}`);
    if (/insufficient|not enough credits|créditos insuficientes|no credits/i.test(texto)) fallar('no quedan créditos suficientes en Higgsfield');
    trabajo = parsearTrabajo(texto);
    if (trabajo?.status === 'completed' && trabajo.result_url) break;
    console.log(`✗ intento ${intento}: ${trabajo?.status ?? 'sin respuesta'}${intento === 1 ? ' — se reintenta una vez' : ''}`);
    trabajo = null;
  }
  if (!trabajo) {
    const despues = saldo();
    fallar(`Higgsfield falló dos veces. Créditos antes ${antes.creditos}, ahora ${despues.creditos}.`);
  }
  fs.mkdirSync(path.dirname(path.resolve(salida)), {recursive: true});
  const d = correr('curl', ['-sSL', '--fail', '-o', salida, trabajo.result_url], {permitirFallo: true});
  if (d.codigo !== 0 || !fs.existsSync(salida)) fallar(`no se pudo descargar el resultado (${trabajo.result_url})`);
  const despues = saldo();
  const gasto = antes.creditos !== null && despues.creditos !== null ? Math.round((antes.creditos - despues.creditos) * 100) / 100 : null;
  console.log(`✓ ${path.basename(salida)} descargado · trabajo ${trabajo.id} · gastados ${gasto ?? '¿?'} créditos · quedan ${despues.creditos}`);
  console.log('JSON ' + JSON.stringify({id: trabajo.id, modelo: trabajo.job_type, url: trabajo.result_url, salida, gasto, quedan: despues.creditos}));
} else fallar('uso: higgs.mjs saldo | coste <modelo> ... | crear <modelo> --salida <archivo> ...');
