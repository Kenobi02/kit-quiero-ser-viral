# Kit Quiero ser viral

Un kit para Claude Code que te dice **qué grabar** y después **edita lo que grabas** como los vídeos
que se hacen virales en tu nicho. Escribes *Quiero ser viral*, contestas unas preguntas sobre tu
marca, el kit investiga los vídeos cortos más vistos de tu tema y te propone 3 guiones. Los grabas
con el móvil, los dejas en una carpeta del escritorio, escribes *listo*, y recibes cada vídeo
editado para TikTok e Instagram, con su texto y sus hashtags. Solo se publica lo que tú digas.

**Entra** el cuestionario de tu marca y los vídeos que grabes hablando a cámara con los guiones que
te propone el kit → **sale** un vídeo vertical de 30 a 60 segundos por cada grabación (hasta 3),
editado como los virales de tu nicho (sin pausas, con zooms, subtítulos, palabras clave, recursos y
animaciones), con su texto y sus hashtags, y que solo se publica si tú dices "sí".

No hace falta saber de IA ni de edición: tú conversas, grabas y confirmas; Claude hace el resto.

---

## Qué hace exactamente

1. **Te pregunta por tu marca** (una vez): a qué te dedicas, a quién le hablas, tu tema, tu tono,
   qué quieres que haga quien te ve y qué no dirías nunca. Se guarda para las siguientes tandas.
2. **Investiga tu nicho**: busca los YouTube Shorts más vistos de tus etiquetas, **con sus visitas
   reales**, descarta lo que no es de tu tema o de tu idioma, elige los 3 más vistos de creadores
   distintos y analiza cada uno: su gancho (copiado literal), su estructura, su ritmo y su formato.
   Completa con vídeos de TikTok encontrados por el buscador (sin cifras: TikTok no las deja leer).
3. **Te escribe 3 guiones para grabar**, uno por viral, tomando su patrón y nunca su texto (lo
   comprueba con un comando). Te los deja en la carpeta del escritorio para leerlos mientras grabas.
4. **Revisa tus grabaciones**: sabe qué guion es cada una al escucharla, te avisa si algo no va bien
   (voz baja, grabado en horizontal, música de fondo) y decide qué sobra (el saludo, las tomas falsas,
   la despedida).
5. **Quita las pausas** (como los editores de los virales: ninguna de más de 0,35 s) y alterna el
   zoom en cada corte para que el salto no se note. Limpia y sube tu voz al volumen de las redes.
6. **Añade recursos y animaciones** justo cuando hablas de cada cosa: listas que aparecen punto por
   punto, contadores "1/3", comparativas "antes / ahora", cifras que cuentan, tarjetas, pantalla
   partida con tu pantalla arriba y tú abajo, y tus propios vídeos. Si conectas **Higgsfield**
   (opcional), también imágenes y clips generados de objetos, lugares e ilustraciones.
7. **Monta y comprueba** cada vídeo con Remotion (el programa que lo edita): subtítulos palabra a
   palabra, formato, volumen y una hoja de fotogramas para que ningún texto te tape la cara.
8. **Te lo entrega** en `Escritorio/Quiero-ser-viral/videos terminados/` con su texto para publicar,
   y publica solo lo que digas (a mano con instrucciones, o con Blotato si lo conectas).

## Cómo se asegura la calidad

| Lo que tiene cada vídeo | Cómo se comprueba |
|---|---|
| Guion de 80-165 palabras con gancho de ≤ 10 palabras que **no saluda** | Antes de enseñártelo |
| Ningún tramo de 6 palabras seguidas copiado de un viral | `copia.mjs` |
| Empieza por tu gancho, sin saludo ni "bueno…" | Al cortar tu grabación |
| Sin pausas de más de 0,35 s | `cortes.mjs` |
| Algo nuevo en pantalla cada 4 s como mucho (corte, zoom, palabra clave, animación, recurso) | Al revisar el plan |
| **Tú sales en pantalla al menos la mitad del vídeo** | Al revisar el plan |
| Subtítulos palabra a palabra, bien escritos y a tiempo | Transcriptor + emparejador |
| Volumen de redes (−14 LUFS), sin saturar | `comprobar.mjs` |
| Ningún texto te tapa los ojos ni la boca, ni cae donde TikTok pone sus botones | Hoja de fotogramas |
| Los recursos de IA (si los hay) nunca muestran personas | Mirándolos uno a uno |
| Vertical 1080×1920 a 30 fotogramas por segundo, de 30 a 60 s | `comprobar.mjs` |

**Lo que nadie puede prometer**: que un vídeo se haga viral. Pesan el tema, el creador y la
constancia. El kit te da vídeos con las piezas que tienen los virales; las visitas no se garantizan.

## Cómo se usa

1. `/setup` — una vez. Instala y comprueba todo (unos 10 minutos).
2. Escribe:
   ```
   Quiero ser viral
   ```
3. Graba los guiones que quieras, déjalos en `Escritorio/Quiero-ser-viral/` y escribe `listo`.
4. Los vídeos aparecen en `Escritorio/Quiero-ser-viral/videos terminados/`.

| Comando | Para qué |
|---|---|
| `/setup` | Instalar y comprobar. Una sola vez |
| `/viral` | Lo mismo que escribir "Quiero ser viral" |
| `/blotato` | Conectar Blotato para publicar solo (opcional, de pago) |

Frases útiles: *"listo"* (ya grabé), *"¿cómo grabo?"*, *"continúa los vídeos"*, *"publica el vídeo 2
en TikTok"*, *"¿qué está funcionando en mi nicho?"*, *"cambia mi marca"*.

Tiempos: investigar y escribir los guiones, unos 10 minutos; editar, unos 5 minutos por vídeo (casi
todo es esperar). Si se corta, no se pierde nada ni se paga dos veces.

**Este kit no trae ejemplo de práctica**: la mejor prueba es tu primera grabación. Sin Higgsfield,
no gasta nada.

## Qué hay dentro

```
kit-quiero-ser-viral/
├── EMPIEZA-AQUI.md      Arrancar en 5 minutos
├── README.md            Este archivo
├── CLAUDE.md            El cerebro: cómo se comporta Claude en este kit
├── .claude/             Los comandos (/setup, /viral, /blotato) y la skill con sus guías
├── herramientas/        Los programas del kit (investigar, revisar, cortar, montar, comprobar…)
├── editor/              La plantilla de vídeo de Remotion, sus animaciones y sus tipografías
├── workspace/           Tu marca, la investigación, los guiones y el trabajo de cada tanda
├── package.json         La lista de piezas que instala /setup
├── LICENSE              Licencia MIT
└── .env.example         Plantilla para la clave de Blotato (solo si lo usas)
```

## Qué cuesta usarlo

| Qué | Coste |
|---|---|
| Claude Code | Tu plan de Claude (Pro o superior), el que ya usas |
| Higgsfield (opcional: recursos generados) | De pago, en créditos. Medido al construir el kit: imagen 1 crédito, clip de 5 s 2,5 (480p) o 5 (720p); **unos 5-10 créditos por vídeo** con 2-4 recursos. Te enseña el coste y tu saldo **antes** de gastar. El plan Starter basta; para usarlo a menudo se recomienda el **Pro** (más créditos al mes). Precios en higgsfield.ai |
| Blotato (opcional, publicar solo) | De pago. Su conexión solo funciona con plan de pago y **generar la clave termina la prueba gratuita y activa el cobro**. Sin Blotato, publicas a mano en 2 minutos |
| Remotion (el editor) | Gratis para particulares, empresas de hasta 3 trabajadores y organizaciones sin ánimo de lucro. Empresas de 4 trabajadores o más necesitan su licencia de empresa (remotion.pro) |
| yt-dlp (el lector de YouTube), ffmpeg (el que procesa vídeo y audio), el transcriptor y las tipografías | Gratis |
| Espacio en disco | Unos 1,5 GB (piezas del kit + transcriptor) |

## Qué NO hace

- **No genera ni anima caras ni voces**: trabaja con tus grabaciones reales. Tampoco usa fotos.
- **No lee TikTok ni Instagram directamente**: bloquean la lectura automática y el kit no se lo
  salta. Las cifras salen de YouTube Shorts; de TikTok solo enlaces y textos (visitas "sin datos").
- **No publica nada sin tu "sí"**, vídeo a vídeo, ni gasta créditos sin enseñarte antes el coste.
- **No copia** vídeos de otros: los descarga solo para analizarlos y los borra.
- **No mete personas hechas con IA** en los recursos, ni música con derechos (el sonido en tendencia
  lo añades desde la app al publicar).
- **No quita la música de fondo** de una grabación: graba sin música.
- **No publica solo sin Blotato**, ni programa un calendario, ni analiza tus resultados después.
- **No inventa** visitas, datos ni cifras: lo que no se pudo medir aparece como "sin datos".

## Seguridad y privacidad

- Tus grabaciones se quedan en tu ordenador: se editan aquí. A Higgsfield (si lo usas) solo van las
  descripciones de los recursos que se generan. **Los archivos generados en Higgsfield tienen un
  enlace público** (imposible de adivinar, pero quien lo tenga puede abrirlo).
- La clave de Blotato va en `.env.local`, que nunca se comparte ni se sube a GitHub. Nunca se pide
  por el chat.
- El kit no conoce ni pide tus contraseñas de TikTok, Instagram o Higgsfield (entras desde el
  navegador).

## Windows y Mac

Funciona igual en los dos; las diferencias las gestiona Claude (cómo encontrar el escritorio, cómo
abrir carpetas, cómo instalar Node.js). **Probado en Windows 11.** En Mac está descrito pero no
probado: el transcriptor puede pedir las herramientas de Apple (`xcode-select --install`, una
ventana de "Instalar"). En Windows necesitas Git para Windows (git-scm.com/download/win), que
Claude Code ya pide al instalarse.

## Lo que se descubrió al construirlo (para que no te pille por sorpresa)

- **La primera versión hacía hablar una foto tuya con IA.** Se quitó: no quedaba natural. Tu
  grabación de verdad funciona mejor.
- **Las pausas se miden con el nivel de cada grabación**: con un umbral fijo, en una habitación con
  ruido no se veía ninguna pausa; con el propio, se quitaron 14 en 61 segundos.
- **El transcriptor descoloca los tiempos** en grabaciones largas: el kit transcribe por tramos y
  coloca cada subtítulo en su sitio.
- **Remotion falla a veces** con los mismos archivos: el kit reintenta una vez, más despacio.
- **La conexión con Blotato** está hecha según su documentación oficial y comprobada sin cuenta (su
  API responde); no se pudo publicar de prueba con una cuenta real. La primera vez se publica en
  privado o en borrador.

## Si algo falla

Escribe **"tengo un error"** y pega el mensaje tal cual: Claude tiene una tabla de errores conocidos
con la causa y la solución de cada uno. Si tras dos intentos sigue atascado, pregunta en la
comunidad donde conseguiste el kit pegando el error literal.

## Licencia

El kit (sus documentos, su skill, sus herramientas y su plantilla de vídeo) se publica con licencia
**MIT**: puedes usarlo, copiarlo, modificarlo y compartirlo, también con fines comerciales, siempre
que mantengas el aviso de `LICENSE`. Las piezas de terceros de abajo conservan sus propias licencias
(ojo con la de Remotion si tu empresa tiene 4 trabajadores o más).

## Piezas de terceros

Remotion (licencia Remotion, ver arriba), ffmpeg (vía `ffmpeg-static`), yt-dlp (Unlicense),
whisper.cpp (MIT, vía `@remotion/install-whisper-cpp`), el programa de Higgsfield
(`@higgsfield/cli`) y las tipografías Montserrat e Instrument Serif (SIL Open Font License, en
`editor/public/fuentes/`). Se instalan con `/setup`; no viajan dentro del kit salvo las tipografías.
