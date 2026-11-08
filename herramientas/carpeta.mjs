// La carpeta del escritorio donde la persona deja su material y recibe sus vídeos.
// Uso:
//   node herramientas/carpeta.mjs crear     → crea Escritorio/Quiero-ser-viral/ y "videos terminados/", y la abre
//   node herramientas/carpeta.mjs ruta      → dice dónde está
//   node herramientas/carpeta.mjs abrir [terminados]
import fs from 'node:fs';
import path from 'node:path';
import {carpetaUsuario, carpetaTerminados, abrirEnSistema, args, fallar} from './comun.mjs';

const LEEME = `QUÉ DEJAR EN ESTA CARPETA
=========================

1. TUS GRABACIONES (lo único obligatorio)
   Un vídeo por cada guion que hayas grabado (graba los que quieras de los 3).
   No hace falta ponerles un nombre especial: el kit sabe cuál es cuál al escucharlos.

   Cómo grabar para que quede bien:
   - Móvil en VERTICAL, a la altura de los ojos (apoyado, no en la mano si puedes).
   - Luz de frente (una ventana delante de ti, nunca detrás).
   - Sitio sin ruido y SIN MÚSICA de fondo (la música no se puede quitar después).
   - Habla cerca del móvil, con energía, como si se lo contaras a un amigo.
   - Lee el guion a tu manera: no tiene que ser palabra por palabra.
   - Si te equivocas, para un segundo y repite la frase entera: el kit se queda con la buena.
   - Las pausas no importan: el kit las quita.

2. RECURSOS TUYOS (opcional)
   Vídeos cortos sin hablar que sirvan para poner encima mientras hablas: tu negocio, tu
   producto, tus manos trabajando, una grabación de tu pantalla.

Solo material TUYO, o de alguien que te haya dado permiso.

Cuando termines, vuelve a VS Code y escribe: listo

Los vídeos terminados aparecerán en la carpeta "videos terminados".
`;

const {sueltos} = args();
const orden = sueltos[0] || 'ruta';
const base = carpetaUsuario();

if (orden === 'crear') {
  fs.mkdirSync(carpetaTerminados(), {recursive: true});
  const leeme = path.join(base, 'LEEME - que poner aqui.txt');
  if (!fs.existsSync(leeme)) fs.writeFileSync(leeme, LEEME, 'utf8');
  abrirEnSistema(base);
  console.log(`✓ carpeta lista y abierta: ${base}`);
  console.log(`✓ los vídeos terminados irán a: ${carpetaTerminados()}`);
} else if (orden === 'ruta') {
  console.log(base);
  // Antes de la primera tanda es normal que no exista: no se marca como error (Paso 7: una ✗ aquí asustaba).
  console.log(fs.existsSync(base) ? '✓ ya existe' : 'todavía no existe: se creará al empezar tu primera tanda');
} else if (orden === 'abrir') {
  const destino = sueltos[1] === 'terminados' ? carpetaTerminados() : base;
  if (!fs.existsSync(destino)) fallar(`no existe todavía: ${destino}`);
  abrirEnSistema(destino);
  console.log(`✓ abierta: ${destino}`);
} else fallar(`orden desconocida: ${orden}`);
