# Revisar las grabaciones y sacar la base

La persona graba con el móvil los guiones que quiera y deja los vídeos en
`Escritorio/Quiero-ser-viral/`. Puede dejar también **recursos suyos** (vídeos sin hablar, su
pantalla). Desde la v2 el kit **no usa fotos ni audios sueltos**.

## 1 · Qué hay en la carpeta

`herramientas/material.mjs` mide cada archivo y lo clasifica solo:

| Clase | Qué es | Para qué sirve |
|---|---|---|
| `grabacion` | Vídeo con al menos 15 s de voz | La **base** de un vídeo: su voz y su cara |
| `recurso` | Vídeo sin voz (o casi) | Encima de la base, como inserto o en la pantalla partida |
| fotos y audios | — | Se ignoran con un aviso |

**Mira las vistas** (tira de 6 fotogramas por vídeo): una "grabación" puede ser en realidad una
grabación de pantalla con su voz (sirve como recurso para `partido`, no como base de un guion).
Apunta dónde tiene la cara (arriba, centro) para `--focoY` de `cortes.mjs` (35-45 suele ir bien en
un selfi).

| Lo que dice la herramienta | Qué le dices | ¿Se para? |
|---|---|---|
| `FALTA_GRABACION` | "No encuentro ningún vídeo en el que se te oiga hablar. Graba al menos uno de los guiones" | Sí |
| `HORIZONTAL` | "La grabaste en horizontal: la recorto al centro. Para las próximas, móvil en vertical" | No |
| `VOZ_BAJA` | "Se te oye bajo; lo subo y lo limpio yo. La próxima vez, más cerca del móvil" | No |
| `BAJA_RES` | "Se verá algo borrosa; graba en 1080p si tu móvil lo permite" | No |
| `MUY_LARGA` | "Es muy larga: ¿es un solo guion o varios seguidos? Dime en qué minuto empieza cada uno" | Pregunta |
| `IGNORADA` / `IGNORADO` | "Las fotos y los audios sueltos ya no los uso: solo tus vídeos" | No |
| `DUPLICADO`, `VACIO`, `ILEGIBLE`, `NO_SOPORTADO` | "Ese archivo no lo puedo usar; si era importante, vuelve a exportarlo" | No |
| Sale otra persona como protagonista | "En este sale otra persona: ¿tienes su permiso?" | Pregunta |
| Se oye música de fondo | "Lleva música de fondo y no se puede quitar: si puedes, repítela sin música" | Pregunta |

## 2 · Qué guion es cada grabación

Transcribe cada grabación **por tramos de 20 s** (`transcribir.mjs --desde 0 --hasta 20`, `--desde 20
--hasta 40`…: entera, los tiempos se descolocan) y compara el texto con cada `guion.txt`:
`node herramientas/alinear.mjs <transcripción> --texto-archivo workspace/<tanda>/video-N/guion.txt`
El guion con más % es el suyo. Es normal que no lo lea palabra por palabra (50-90 %): se edita lo que
**dijo**, no lo que ponía.

**Si ningún guion pasa del 40 %, no es una grabación de los guiones** (en la prueba de la v2, un selfi
grabado antes dio 18-22 % con los tres). Díselo y pregunta: "¿Lo edito tal cual, como un vídeo con lo
que dices ahí, o prefieres grabar uno de los guiones?". Si es tal cual: se edita su contenido (el
formato del viral que más se le parezca sirve de receta) y los textos para publicar salen de lo que
dice.

**Lo que dice la grabación también se revisa.** Si promete algo falso o que no es suyo (resultados que
no tiene, algo "100 % automático" que no lo es), díselo con la frase exacta y su segundo, y que decida
si se quita con `--quitar`. El kit no refuerza esas frases con palabras clave ni animaciones.

## 3 · Qué se quita (`--quitar`)

Lee la transcripción con sus tiempos y apunta en `video-N/cortes.md` los tramos que sobran, en
milisegundos **de la grabación original**:

- **El saludo** ("hola, qué tal", "bueno, a ver"): el vídeo empieza por el gancho.
- **Tomas falsas**: si repite una frase, se queda **la última** (la buena) y se quita la anterior
  entera, desde el principio de la frase fallida hasta justo antes de la buena.
- **La despedida** ("chao, chao", "venga, un saludo") y lo que dice mirando el móvil al parar.
- **Lo que no tiene que ver** con el guion, si alarga el vídeo por encima de 60 s.

Las **pausas** no hace falta marcarlas: `cortes.mjs` quita solas las de más de 0,35 s.
Antes de montar, `--solo-revisar` enseña los tramos que quedan y la duración final.

## 4 · El texto de la base

Tras sacar `base.mp4`, transcríbela y escribe en `video-N/texto.txt` lo que dice de verdad, con los
errores del transcriptor corregidos ("cloud" → "Claude", nombres de marcas, cifras). Es el
`textoHablado` del plan: los subtítulos salen de ahí.
