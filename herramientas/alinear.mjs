// Empareja un texto esperado (el guion) con los tiempos de una transcripción.
// Sirve para dos cosas:
//   1. Subtítulos: las palabras salen del GUION (bien escritas) con los tiempos de lo que se oyó.
//   2. Comprobar una pieza con IA: qué % de las palabras del guion se dijeron de verdad.
// Uso:
//   node herramientas/alinear.mjs <transcripcion.json> --texto "<texto esperado>" [--salida palabras.json] [--umbral 90] [--desfase-ms 0]
//   (o --texto-archivo <archivo.txt> en lugar de --texto)
import fs from 'node:fs';
import {leerJson, escribirJson, normalizar, args, fallar} from './comun.mjs';

export function alinear(oidas, textoEsperado) {
  // Los signos sueltos ("100 %", "—", "»") se pegan a la palabra anterior: si no, se perdían en los
  // subtítulos ("ARTIFICIAL AL 100" sin el %).
  const G = [];
  for (const w of textoEsperado.split(/\s+/).filter(Boolean)) {
    if (/[\p{L}\p{N}]/u.test(w) || !G.length) G.push(w);
    else G[G.length - 1] += w === '%' ? ' %' : w;
  }
  const O = oidas;
  const n = G.length, m = O.length;
  const coste = (a, b) => {
    const x = normalizar(a), y = normalizar(b);
    if (x === y) return 0;
    let k = 0;
    while (k < x.length && x[k] === y[k]) k++;
    return k >= 3 ? 0.5 : 1;
  };
  const d = Array.from({length: n + 1}, (_, i) => Array.from({length: m + 1}, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + coste(G[i - 1], O[j - 1].text));
  const pareja = new Array(n).fill(null);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (d[i][j] === d[i - 1][j - 1] + coste(G[i - 1], O[j - 1].text)) {
      pareja[i - 1] = O[j - 1];
      i--;
      j--;
    } else if (d[i][j] === d[i - 1][j] + 1) i--;
    else j--;
  }
  const res = G.map((t, k) => ({text: t, startMs: pareja[k]?.startMs ?? null, endMs: pareja[k]?.endMs ?? null}));
  // Las palabras del guion que no se oyeron reciben un hueco entre sus vecinas.
  for (let k = 0; k < res.length; k++) {
    if (res[k].startMs !== null) continue;
    const prev = res.slice(0, k).reverse().find((r) => r.endMs !== null);
    const next = res.slice(k + 1).find((r) => r.startMs !== null);
    const a = prev ? prev.endMs : 0;
    const b = next ? next.startMs : a + 300;
    res[k].startMs = a;
    res[k].endMs = Math.max(a + 120, b);
  }
  const exactas = G.filter((g, k) => pareja[k] && normalizar(pareja[k].text) === normalizar(g)).length;
  return {palabras: res, total: n, exactas, porcentaje: n ? Math.round((100 * exactas) / n) : 0, oidas: m};
}

if (process.argv[1] && process.argv[1].endsWith('alinear.mjs')) {
  const {sueltos, opciones} = args();
  if (!sueltos[0] || !fs.existsSync(sueltos[0])) fallar(`no existe la transcripción: ${sueltos[0]}`);
  const texto = opciones['texto-archivo'] ? fs.readFileSync(opciones['texto-archivo'], 'utf8') : opciones.texto;
  if (!texto) fallar('falta --texto o --texto-archivo');
  const tr = leerJson(sueltos[0]);
  const r = alinear(tr.palabras, texto);
  const desfase = parseInt(opciones['desfase-ms'] || '0', 10);
  if (desfase) for (const p of r.palabras) {
    p.startMs += desfase;
    p.endMs += desfase;
  }
  if (opciones.salida) escribirJson(opciones.salida, r.palabras);
  const umbral = parseInt(opciones.umbral || '0', 10);
  const veredicto = umbral ? (r.porcentaje >= umbral ? `✓ supera el ${umbral} %` : `✗ no llega al ${umbral} %`) : '';
  console.log(`Palabras del texto: ${r.total} · oídas: ${r.oidas} · coinciden: ${r.exactas} (${r.porcentaje} %) ${veredicto}`);
  console.log(`PORCENTAJE ${r.porcentaje}`);
}
