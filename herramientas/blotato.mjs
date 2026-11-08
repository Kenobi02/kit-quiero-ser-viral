// Publicar con Blotato (OPCIONAL y de pago). El kit funciona entero sin esto.
// La clave se lee de .env.local (BLOTATO_API_KEY=...). Nunca se pide por el chat.
// AVISO: hecho siguiendo la documentación oficial de Blotato (help.blotato.com, noviembre 2026) y
// comprobado SOLO hasta donde se puede sin cuenta (la API responde 401 sin clave). Sin una cuenta de
// pago no se ha podido publicar nada de prueba: la primera publicación real conviene hacerla en
// borrador (--borrador) o en privado.
// Uso:
//   node herramientas/blotato.mjs probar                         → ¿la clave funciona?
//   node herramientas/blotato.mjs cuentas                        → redes conectadas en Blotato (id de cada una)
//   node herramientas/blotato.mjs subir <video.mp4>              → sube el vídeo y devuelve su dirección pública
//   node herramientas/blotato.mjs publicar --cuenta <id> --red tiktok|instagram --texto-archivo <txt> --video-url <url> [--borrador] [--privado]
//   node herramientas/blotato.mjs estado <postSubmissionId>
import fs from 'node:fs';
import path from 'node:path';
import {KIT, correr, args, fallar} from './comun.mjs';

const BASE = 'https://backend.blotato.com/v2';
const {sueltos, opciones} = args();
const orden = sueltos[0];

function clave() {
  const env = path.join(KIT, '.env.local');
  if (!fs.existsSync(env)) fallar('no hay .env.local con la clave de Blotato (usa /blotato para conectarlo)');
  const m = fs.readFileSync(env, 'utf8').match(/^\s*BLOTATO_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
  if (!m || m[1].includes('pega-aqui')) fallar('falta BLOTATO_API_KEY en .env.local');
  return m[1].trim();
}

function llamar(metodo, ruta, cuerpo) {
  const a = ['-sS', '-X', metodo, `${BASE}${ruta}`, '-H', `blotato-api-key: ${clave()}`, '-H', 'Content-Type: application/json', '-w', '\n%{http_code}'];
  if (cuerpo) a.push('--data-binary', '@-');
  const r = correr('curl', a, {entrada: cuerpo ? JSON.stringify(cuerpo) : undefined, permitirFallo: true});
  const lineas = r.salida.trimEnd().split('\n');
  const codigo = parseInt(lineas.pop(), 10);
  let json = null;
  try {
    json = JSON.parse(lineas.join('\n'));
  } catch {
    /* respuesta no JSON */
  }
  return {codigo, json, texto: lineas.join('\n')};
}

const explicar = (r) => (r.codigo === 401 ? 'la clave no es válida (401)' : r.codigo === 403 ? 'tu cuenta de Blotato no tiene un plan de pago activo (403): la API no funciona en la prueba gratuita' : `respuesta ${r.codigo}: ${r.texto.slice(0, 300)}`);

if (orden === 'probar') {
  const r = llamar('GET', '/users/me');
  if (r.codigo !== 200) fallar(explicar(r));
  console.log('✓ la clave de Blotato funciona');
} else if (orden === 'cuentas') {
  const r = llamar('GET', '/users/me/accounts');
  if (r.codigo !== 200) fallar(explicar(r));
  const lista = r.json?.items ?? r.json?.accounts ?? (Array.isArray(r.json) ? r.json : []);
  if (!lista.length) console.log('✗ no hay ninguna red conectada en Blotato: conéctalas en my.blotato.com');
  for (const c of lista) console.log(`  ${c.platform ?? c.type ?? '¿red?'} · ${c.username ?? c.fullname ?? c.name ?? ''} · id ${c.id}`);
} else if (orden === 'subir') {
  const archivo = sueltos[1];
  if (!archivo || !fs.existsSync(archivo)) fallar(`no existe: ${archivo}`);
  const r = llamar('POST', '/media/uploads', {filename: path.basename(archivo).replace(/\s+/g, '-')});
  if (r.codigo < 200 || r.codigo >= 300 || !r.json?.presignedUrl) fallar(`no se pudo pedir la subida: ${explicar(r)}`);
  const put = correr('curl', ['-sS', '-X', 'PUT', r.json.presignedUrl, '-H', 'Content-Type: video/mp4', '--data-binary', `@${archivo}`, '-w', '%{http_code}', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null'], {permitirFallo: true, timeoutMs: 20 * 60 * 1000});
  if (!/^2\d\d$/.test(put.salida.trim())) fallar(`la subida del vídeo falló (código ${put.salida.trim()})`);
  console.log(`✓ vídeo subido a Blotato`);
  console.log(`URL ${r.json.publicUrl}`);
} else if (orden === 'publicar') {
  const {cuenta, red} = opciones;
  if (!cuenta || !['tiktok', 'instagram'].includes(red) || !opciones['video-url'] || !opciones['texto-archivo']) fallar('faltan --cuenta, --red tiktok|instagram, --video-url o --texto-archivo');
  const texto = fs.readFileSync(opciones['texto-archivo'], 'utf8').trim();
  const target =
    red === 'tiktok'
      ? {targetType: 'tiktok', privacyLevel: opciones.privado ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE', disabledComments: false, disabledDuet: false, disabledStitch: false, isBrandedContent: false, isYourBrand: true, isAiGenerated: true, isDraft: !!opciones.borrador}
      : {targetType: 'instagram', mediaType: 'reel', shareToFeed: true};
  const r = llamar('POST', '/posts', {post: {accountId: String(cuenta), content: {text: texto, mediaUrls: [opciones['video-url']], platform: red}, target}});
  if (r.codigo < 200 || r.codigo >= 300) fallar(`no se pudo publicar: ${explicar(r)}`);
  console.log(`✓ enviado a ${red}${opciones.borrador ? ' (borrador)' : ''} · seguimiento ${r.json?.postSubmissionId}`);
  console.log(`ID ${r.json?.postSubmissionId}`);
} else if (orden === 'estado') {
  const r = llamar('GET', `/posts/${sueltos[1]}`);
  if (r.codigo !== 200) fallar(explicar(r));
  console.log(`estado: ${r.json?.status}${r.json?.publicUrl ? ` · ${r.json.publicUrl}` : ''}${r.json?.errorMessage ? ` · ${r.json.errorMessage}` : ''}`);
} else fallar('uso: blotato.mjs probar | cuentas | subir <video> | publicar ... | estado <id>');
