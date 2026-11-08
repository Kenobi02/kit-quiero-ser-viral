// Comprueba que un guion no copia a los virales: busca la secuencia más larga de palabras
// seguidas que el guion comparte con cada transcripción. A partir de 6 palabras, es copia.
// Uso:
//   node herramientas/copia.mjs --guion-archivo <guion.txt> <transcripcion1.json|txt> [<transcripcion2> ...]
//   node herramientas/copia.mjs --guion "<texto>" <transcripcion...>
import fs from 'node:fs';
import path from 'node:path';
import {leerJson, normalizar, args, fallar} from './comun.mjs';

const LIMITE = 6;
const {sueltos, opciones} = args();
const guion = opciones['guion-archivo'] ? fs.readFileSync(opciones['guion-archivo'], 'utf8') : opciones.guion;
if (!guion) fallar('falta --guion o --guion-archivo');
if (!sueltos.length) fallar('faltan las transcripciones de los virales');

const palabras = (t) => t.split(/\s+/).map(normalizar).filter(Boolean);
const G = palabras(guion);
let peor = 0;
for (const f of sueltos) {
  if (!fs.existsSync(f)) fallar(`no existe: ${f}`);
  let texto;
  if (f.endsWith('.json')) {
    const j = leerJson(f);
    // Un array suelto son "captions" crudas del transcriptor: cada trozo ya trae su espacio delante.
    texto = Array.isArray(j) ? j.map((p) => p.text).join('') : j.texto ?? (j.palabras || []).map((p) => p.text).join(' ');
  } else texto = fs.readFileSync(f, 'utf8');
  const T = palabras(texto);
  let mejor = 0, donde = '';
  for (let i = 0; i < G.length; i++) for (let j = 0; j < T.length; j++) {
    let k = 0;
    while (i + k < G.length && j + k < T.length && G[i + k] === T[j + k]) k++;
    if (k > mejor) {
      mejor = k;
      donde = G.slice(i, i + k).join(' ');
    }
  }
  peor = Math.max(peor, mejor);
  console.log(`${mejor >= LIMITE ? '✗' : '✓'} ${path.basename(f)}: ${mejor} palabras seguidas en común${mejor >= 3 ? ` ("${donde}")` : ''}`);
}
console.log(peor >= LIMITE ? `✗ COPIA: hay ${peor} palabras seguidas iguales a un viral; reescribe ese trozo` : `✓ sin copia (máximo ${peor} palabras seguidas en común, el límite es ${LIMITE - 1})`);
process.exit(peor >= LIMITE ? 2 : 0);
