# El montaje: el plan, las recetas y la lista de calidad

Cada vídeo se describe en un `plan.json` y lo monta `herramientas/montar.mjs`, que **antes de
montar revisa las reglas** (duración 30-60 s, la persona ≥ 50 % en pantalla, insertos ≤ 5 s, algo
nuevo cada ≤ 4 s, archivos que existen, horizontales sin recortar mal) y para si algo no cumple.
`--solo-revisar` tarda un segundo: úsalo hasta que diga ✓.

## El formato de `plan.json`

```json
{
  "id": "2026-11-08-video-1",
  "salida": "C:/Users/<usuario>/OneDrive/Escritorio/Quiero-ser-viral/videos terminados/2026-11-08-video-1.mp4",
  "acento": "#FFE600",
  "base": {"src": ".../video-1/base.mp4", "focoYPartido": 30},
  "textoHablado": "lo que dice en la base, palabra por palabra, corregido (video-1/texto.txt)",
  "insertos": [
    {"tipo": "animacion", "plantilla": "lista", "titulo": "3 errores", "items": ["Ir con hambre", "Fiarte del light", "No llevar lista"], "desdeMs": 4200, "hastaMs": 8200},
    {"tipo": "recurso", "src": ".../video-1/recursos/carrito.jpg", "desdeMs": 11000, "hastaMs": 13500, "ia": true},
    {"tipo": "partido", "desdeMs": 15000, "hastaMs": 19000, "movimiento": "golpe",
      "arriba": {"src": ".../Escritorio/Quiero-ser-viral/mi-pantalla.mp4", "inicioMs": 12000, "zona": {"x": 0.2, "y": 0.15, "ancho": 0.6, "alto": 0.6}}},
    {"tipo": "animacion", "plantilla": "comparativa", "titulo": "Tu compra", "izquierda": {"titulo": "Antes", "items": ["Con hambre", "Sin lista"]}, "derecha": {"titulo": "Ahora", "items": ["Comida hecha", "Lista en el móvil"]}, "desdeMs": 24000, "hastaMs": 28500},
    {"tipo": "animacion", "plantilla": "cifra", "valor": 3, "sufijo": "", "texto": "errores que todos cometemos", "desdeMs": 31000, "hastaMs": 34000},
    {"tipo": "tarjeta", "texto": "Escríbeme PLAN", "subtexto": "y te paso mi lista", "desdeMs": 38500, "hastaMs": 41500}
  ],
  "textos": [
    {"estilo": "gancho", "texto": "Haces mal la compra", "desdeMs": 0, "hastaMs": 2600},
    {"estilo": "contador", "texto": "1/3", "desdeMs": 9000, "hastaMs": 15000},
    {"estilo": "clave", "texto": "Lee", "subtexto": "los ingredientes", "desdeMs": 20000, "hastaMs": 22500}
  ],
  "progreso": true
}
```

| Campo | Qué es |
|---|---|
| `base` | La grabación ya cortada (`cortes.mjs`). Es la **voz** de todo el vídeo y el plano de fondo: rellena sola los huecos entre insertos, sincronizada. Su `.json` de cortes cuenta cada corte como "algo nuevo". `focoYPartido`: qué altura de la base se ve en la mitad de abajo de la pantalla partida (30 = la cara). `"movimiento": "golpe"` (opcional) añade un zoom seco cada 2,5 s |
| `textoHablado` | Lo que dice la base, en orden. Los subtítulos salen de aquí (bien escritos) con los tiempos que se oyen |
| `insertos` | Lo que tapa a la persona un momento, **sin tocar su voz**. Cada uno ≤ 5 s (mejor 1,5-4), sin solaparse |
| `tipo: recurso` | Una imagen o un vídeo encima (suyo o de Higgsfield). `ia: true` si es de Higgsfield. `inicioMs` en vídeos, `movimiento` (`lento` por defecto en imágenes, `golpe`), `encuadre: encajar` o `zona` en horizontales/pantallas |
| `tipo: partido` | Pantalla partida: el recurso `arriba` y **la persona abajo** (la pone `montar.mjs`, sincronizada). Cuenta como persona en pantalla |
| `tipo: animacion` | Gráficos del editor, gratis: `lista` (`titulo`, `items` que entran uno a uno), `comparativa` (`izquierda` tachada contra `derecha` en el color de acento), `cifra` (`valor` que cuenta, `sufijo`, `texto`) |
| `tipo: tarjeta` | Fondo oscuro con `texto` grande y `subtexto` en cursiva |
| `textos` | Encima de todo: `gancho` (cartel del color de acento, 2-3 s), `clave` (palabra grande + `subtexto`), `contador` (marca fija arriba a la izquierda: "1/3", "PASO 2"). `y` (0-1) para colocar gancho y clave; por defecto 0,6 (0,36 en pantalla partida) |
| `subtitulosY` | Altura de los subtítulos (por defecto 0,74; en pantalla partida van solos a la línea del medio) |

**Las cifras de las animaciones solo pueden salir de lo que la persona dice o de su marca.** Si en
la grabación no hay un número, no se inventa uno para la animación `cifra`.

## Cuándo poner cada cosa

Todo entra **cuando lo dice**. Los tiempos están en `video-N/base-transcripcion.json` (`startMs` de
cada palabra, ya en el tiempo del vídeo final porque la base empieza en 0). Para verlos de un golpe:
`node -e "const p=require('./workspace/<tanda>/video-N/base-transcripcion.json').palabras; console.log(p.map(w=>(w.startMs/1000).toFixed(1)+':'+w.text).join('  '))"`

- Una **lista** entra cuando dice "tres cosas…" y dura lo que tarda en decirlas (máx. 5 s; si dura
  más, parte en contador + palabras clave).
- Una **cifra** cuando dice el número. Una **comparativa** cuando dice "antes… ahora…".
- Un **recurso** cuando nombra algo que se puede enseñar ("el carrito", "tu pantalla").
- Una **palabra clave** en la idea central de cada frase larga.

## Recetas (elige según el formato del viral de referencia)

**A · A cámara con golpes** (la más versátil): gancho en cartel → la base con sus cortes → una
palabra clave o un recurso cada 4-6 s → una animación en el momento clave → tarjeta final con la
llamada a la acción si no la dice claramente.

**B · Pantalla partida** (nicho digital): tramos `partido` con su pantalla arriba (con `zona`) y la
persona abajo mientras explica; entre tramos, la base a pantalla completa.

**C · Lista** (para guiones "3 errores", "3 pasos"): `contador` "1/3, 2/3, 3/3" durante cada punto,
una animación `lista` al principio o al final, un recurso por punto.

En todas: **nunca más de 4 s sin algo nuevo**, y la persona **al menos la mitad** del vídeo.

## Clips y fotos horizontales

Un recurso horizontal recortado a vertical deja solo una franja del centro (en una prueba, a la
persona se le cortó la cabeza). Va con `"encuadre": "encajar"` (entero sobre fondo desenfocado) o
con una `zona` elegida mirando su vista. `montar.mjs` no deja montar si no.

## La lista de calidad del montaje

| Punto | Quién lo mira |
|---|---|
| 1080×1920, 30 fotogramas por segundo, H.264 + AAC, 30-60 s | `comprobar.mjs` |
| Sin pausas de más de 0,35 s en la base (como el ejemplo épico: ninguna de más de 0,7 s) | `cortes.mjs` |
| Empieza por el gancho: ni saludo ni "bueno…" en los primeros segundos | **tú**, en la transcripción de la base |
| Algo nuevo en pantalla cada ≤ 4 s | `montar.mjs` (cuenta cortes, insertos, textos y lo que entra dentro de cada animación) |
| La persona en pantalla ≥ 50 %; insertos ≤ 5 s | `montar.mjs` |
| Al menos una palabra clave, animación o tarjeta cada 10 s | `montar.mjs` (aviso) |
| Subtítulos con ≥ 85 % de las palabras oídas tal cual y en orden | `montar.mjs` |
| Volumen −14 LUFS ± 1, pico ≤ −1 dB, rango ≤ 6 LU | `comprobar.mjs` |
| Sin pantallazos negros o blancos | `comprobar.mjs` |
| **Ni ojos ni boca tapados por un texto** (barbilla y pecho, sí) | **tú**, en la hoja de fotogramas |
| Ningún texto tocando bordes ni bajo los botones (20 % de abajo, 15 % de la derecha) | **tú**, en la hoja |
| Los recursos de IA no muestran personas ni letras raras | **tú**, al generarlos y en la hoja |
| Un solo estilo: una letra, un color de acento | el editor ya lo hace así |

La hoja normal coge 12 fotogramas repartidos y puede saltarse una animación corta: si dudas, saca
fotogramas en los momentos exactos de cada inserto (`ffmpeg -ss <segundo> -i <vídeo> -frames:v 1`).

## Lo que pasó al construir y usar el kit (para no repetirlo)

- Remotion falla a veces con los mismos archivos ("No frame found…"): `montar.mjs` reintenta una
  vez, más despacio. En una tanda real falló 3 de 4 veces con el mismo clip; el reintento lo resolvió.
- Pedir el mismo vídeo dos veces a la vez hacía fallar el montaje: el fondo de `encajar` se prepara
  antes con ffmpeg, y en la pantalla partida la persona de abajo es un trozo aparte de la base.
- En pantalla partida, los subtítulos al 72 % tapaban la cara de la mitad de abajo: van solos a la
  línea del medio.
- Una palabra clave al 55 % rozaba la barbilla en un primer plano: va al 60 %.
- Las palabras clave de 9-10 letras con un signo delante ("¼ PROTEÍNA") llegaban al 88 % del ancho,
  bajo los botones de la derecha: el número va al `subtexto` y la palabra sola arriba.
- Transcribir una pista entera mezclada daba los tiempos desordenados o adelantados (subtítulos hasta
  4 s antes): `montar.mjs` transcribe cada pista por separado.
- La transcripción de una grabación larga (61 s) da los finales de frase hasta 2 s fuera de sitio:
  para decidir qué quitar con `--quitar`, transcribe por tramos de 20 s y fíjate también en las
  pausas que da `cortes.mjs --solo-revisar`.
- Las pausas se miden por el **nivel medio** de cada grabación: con un umbral fijo, en una habitación
  con ruido de fondo no se veía ninguna pausa (61 s → 0 cortes); con el umbral propio, 14 cortes.
- En los subtítulos se perdía el "%" de "al 100 %": el emparejador pega los signos sueltos a la
  palabra anterior.
