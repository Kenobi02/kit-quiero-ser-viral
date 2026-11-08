---
name: quiero-ser-viral
description: "Convierte la marca de una persona y sus grabaciones hablando a cámara en vídeos verticales de 30 a 60 segundos para TikTok e Instagram Reels, editados como los virales de su nicho: cuestionario de marca, investigación de los Shorts más vistos con cifras reales, 3 guiones para que la persona los grabe, cortes sin pausas ni tomas falsas con zoom alterno, subtítulos palabra a palabra, palabras clave, animaciones (listas, contadores, comparativas, cifras), recursos encima de su voz (suyos o generados con Higgsfield, que es opcional), comprobación de calidad y textos con hashtags; publica solo si la persona dice sí. Usa esta skill cuando el usuario quiera hacerse viral, crear vídeos para TikTok o Instagram, que le escriban guiones para grabar, editar sus vídeos hablando a cámara, saber qué funciona en su nicho, continuar una tanda de vídeos o publicar los vídeos terminados. Triggers: 'quiero ser viral', 'hazme vídeos', 'quiero vídeos para tiktok', 'dame guiones para grabar', 'edita mis vídeos', 'ya grabé', 'listo', 'qué está funcionando en mi nicho', 'investiga los virales', 'otra tanda de vídeos', 'continúa los vídeos', 'publica los vídeos', '/viral'."
---

# Quiero ser viral

De la marca de la persona y sus grabaciones salen **vídeos verticales de 30 a 60 s** (uno por
cada guion que grabe, hasta 3), editados como los virales de su nicho. Los vídeos terminados van a
`Escritorio/Quiero-ser-viral/videos terminados/`. Todo lo demás va a `workspace/`.

Narra cada fase en una línea ("Buscando los Shorts más vistos de tu nicho…", "Quitando las pausas
de tu grabación…", "Montando el vídeo 2…"). La persona no sabe de tecnología: cero jerga sin
traducir, y cada mensaje acaba con lo que tiene que hacer ahora.

**Las herramientas se ejecutan con `node herramientas/<nombre>.mjs` desde la carpeta del kit.**
La persona nunca abre una terminal: los comandos los ejecutas tú.

**Higgsfield es opcional.** Mira `.claude/setup-completado.json` (`higgsfield_cuenta`): sin él, los
recursos son animaciones del editor y los vídeos propios de la persona. Con él, además, imágenes y
clips generados (objetos, lugares, ilustraciones; nunca personas), siempre con el coste por delante.

---

## Paso 0 — ¿Tanda nueva o continuar?

1. Si no existe `.claude/setup-completado.json` → di que primero hay que escribir `/setup` y para.
2. **Continuar**: si hay una carpeta `workspace/AAAA-MM-DD-tanda/` con `estado.md` sin el paso 8
   marcado, di en qué paso se quedó y retoma por el primero sin marcar. **Lo hecho no se repite**
   (ni las preguntas, ni lo ya generado con créditos). Si estaba esperando sus grabaciones (paso 3
   hecho, 4 sin hacer), pregúntale si ya las tiene.
3. **Tanda nueva**: crea `workspace/AAAA-MM-DD-tanda/` (fecha de hoy; si existe, añade `-2`) con un
   `estado.md` con los pasos 1-8 en casillas. Márcalos **a medida que avanzas**.

## Paso 1 — El cuestionario de marca

- Si existe `workspace/marca.md`: resúmelo en 3 líneas y pregunta "¿Sigue igual o cambiamos algo?".
  Si su consentimiento es el de la versión anterior del kit ("animar mi foto y generar mi voz"),
  vuelve a hacer **solo la pregunta 10** con el texto nuevo y actualiza esa línea.
- Si no: el cuestionario de `referencias/cuestionario.md` (dos tandas de 5, nunca las 10 seguidas)
  y escribe `workspace/marca.md` con su plantilla.
- **Sin el "sí" al consentimiento (pregunta 10) no se sigue.** Sin llamada a la acción tampoco: si no
  la da, se pregunta otra vez con ejemplos. Sin color de marca → amarillo `#FFE600`.

## Paso 2 — Investigar qué funciona en su nicho

Sigue `referencias/investigacion.md`: etiquetas → `investigar.mjs etiquetas` → filtrar a mano (fuera
lo que no es de su nicho o de su idioma, un vídeo por creador) → los 3 más vistos → `analizar` cada
uno (**mira su hoja de fotogramas** y lee su transcripción) → TikTok por el buscador (visitas "sin
datos") → `workspace/<tanda>/investigacion.md`, con el gancho de cada viral **copiado literal**.

## Paso 3 — Tres guiones para que los grabe

Sigue `referencias/guiones.md`: un guion por viral, con su patrón y nunca su texto.

1. Escribe los 3 en `workspace/<tanda>/guiones.md` y cada uno en `video-N/guion.txt`.
2. Comprueba **con comandos**: palabras (80-165), gancho (≤ 10 palabras, sin saludo) y
   `node herramientas/copia.mjs --guion-archivo workspace/<tanda>/video-N/guion.txt workspace/<tanda>/investigacion/*-transcripcion.json`.
3. Enséñaselos como **3 opciones**: título, de qué viral sale cada uno y el guion entero.
   Pregunta: **"¿Te gustan así o cambio algo?"** Si cambia algo, se reescribe y se comprueba otra vez.
4. Con su "sí": `node herramientas/carpeta.mjs crear` (crea y abre `Escritorio/Quiero-ser-viral/`
   con su `LEEME`) y guarda ahí `guiones para grabar.txt` (los 3 guiones, grandes y limpios, para
   leerlos en la pantalla mientras graba).
5. Dile en 6 líneas cómo grabar (los consejos de `referencias/guiones.md`): graba **los que quiera**
   de los 3, uno por vídeo, en vertical, deja los vídeos en la carpeta y escribe **listo**.
   Marca el paso 3 y **espera**: la persona puede tardar horas o días.

## Paso 4 — Revisar sus grabaciones

Sigue `referencias/grabaciones.md`.

1. `node herramientas/material.mjs "<carpeta del escritorio>" --salida workspace/<tanda>/material.json --vistas workspace/<tanda>/vistas`
2. **Mira las vistas** de cada vídeo: ¿es una grabación de guion, un recurso suyo o una grabación de
   pantalla? ¿Dónde tiene la cara (para `--focoY`)? ¿Sale otra persona? (si sí, pregunta si tiene
   su permiso).
3. Transcribe cada grabación por tramos (`transcribir.mjs --desde/--hasta`, de 20 en 20 s) y empareja
   cada una con su guion (`alinear.mjs` contra cada `guion.txt`: el de más % es el suyo). **Si
   ninguno pasa del 40 %**, no es una grabación de los guiones: díselo y pregunta si se edita tal
   cual (ver `referencias/grabaciones.md`).
4. Lee cada transcripción con sus tiempos y apunta en `workspace/<tanda>/video-N/cortes.md` qué
   sobra: el saludo, las tomas repetidas (se queda **la última**), la despedida, lo que no tiene que
   ver. Cuéntale en cristiano los problemas (voz baja: se arregla sola; horizontal: se recorta;
   música de fondo: no se puede quitar, quizá convenga repetirla).

## Paso 5 — La base: su grabación sin pausas

Por cada grabación, en `workspace/<tanda>/video-N/`:

1. `node herramientas/cortes.mjs "<grabación>" --salida workspace/<tanda>/video-N/base.mp4 --quitar "<ms-ms,...>" --focoY <cara> --solo-revisar`
   → mira los tramos y la duración que queda: **entre 30 y 60 s**. Si pasa de 60, quita algo más
   (con su permiso si es contenido); si no llega a 30, díselo.
2. El mismo comando sin `--solo-revisar` → `base.mp4` (vertical, sin pausas de más de 0,35 s, con el
   zoom alternando en cada corte y la voz limpia a −14 LUFS).
3. `node herramientas/transcribir.mjs workspace/<tanda>/video-N/base.mp4 --salida workspace/<tanda>/video-N/base-transcripcion.json`
   y escribe en `video-N/texto.txt` **lo que dice de verdad**, corrigiendo los errores del
   transcriptor (nombres de marcas, "Claude" que oye "cloud"). Es el `textoHablado` del montaje.
4. Comprueba el principio: **los primeros segundos tienen que ser su gancho**, no un saludo ni un
   "bueno…". Si no, vuelve al punto 1 y quítalo.

## Paso 6 — Recursos y animaciones

Sigue `referencias/recursos.md`. Mirando `base-transcripcion.json` (qué dice y cuándo):

1. Decide **dónde** entra cada recurso: cuando nombra algo que se puede enseñar, una lista, una cifra,
   un antes y después, un paso. Insertos de 1,5 a 4 s; **la persona en pantalla al menos el 50 %**.
2. Para cada uno elige **qué** es, por este orden:
   - una **animación** del editor (lista, comparativa, cifra, tarjeta, contador): gratis;
   - un **recurso suyo** (sus vídeos sin hablar, su pantalla);
   - un **recurso de Higgsfield** (imagen o clip de un objeto, un lugar o una ilustración; **nunca
     personas**), solo si lo tiene conectado.
3. Si hay recursos de Higgsfield: lista lo que vas a generar con su coste
   (`node herramientas/higgs.mjs coste …`) y su saldo (`higgs.mjs saldo`), y pide un **"sí"**. Sin
   "sí" no se gasta nada. Genera con `higgs.mjs crear` a `video-N/recursos/` y **mira cada uno** antes
   de usarlo (¿sale una persona? ¿letras raras? ¿se entiende?). Si no vale, no se usa.

## Paso 7 — Montaje y comprobación

Sigue `referencias/edicion.md` (formato del plan, recetas y lista de calidad).

1. Escribe `workspace/<tanda>/video-N/plan.json` con la `base`, el `textoHablado`, los `insertos` y
   los `textos` (gancho, palabras clave, contador). Salida:
   `<Escritorio>/Quiero-ser-viral/videos terminados/AAAA-MM-DD-video-N.mp4` (`carpeta.mjs ruta`).
2. `node herramientas/montar.mjs <plan.json> --solo-revisar` → corrige hasta que diga ✓.
3. `node herramientas/montar.mjs <plan.json>` → monta (2-4 minutos por vídeo).
4. `node herramientas/comprobar.mjs <video.mp4>` → todo ✓, y **mira la hoja de fotogramas** (y los
   momentos de cada animación): ni ojos ni boca tapados por un texto, nada tocando bordes, nada
   importante abajo del todo ni en el borde derecho, subtítulos a tiempo. Si algo falla, corrige el
   plan y vuelve a montar (máximo 2 vueltas; si sigue, díselo con la hoja delante).

## Paso 8 — Textos, entrega y publicar

1. `workspace/<tanda>/textos-para-publicar.md` (plantilla en `referencias/publicar.md`): por vídeo,
   texto con el gancho en los primeros 150 caracteres, 3-5 hashtags, sonido sugerido y, si lleva
   recursos de Higgsfield, el recordatorio de marcar **contenido creado con IA**.
2. `node herramientas/carpeta.mjs abrir terminados` y resumen en 6 líneas: los vídeos (duración, %
   de pantalla con la persona), créditos gastados (si hubo) y que las comprobaciones salieron ✓.
3. **"Míralos en el móvil. ¿Cuáles quieres publicar, y dónde?"** Solo con un "sí" por vídeo y por
   red: a mano (instrucciones de `referencias/publicar.md`) o con Blotato si está conectado.
4. Marca el paso 8 y cierra: "¿Preparamos los guiones de la semana que viene?".

---

## Reglas

- **Solo grabaciones de la persona** (o de quien le haya dado permiso). El kit no genera ni anima
  caras ni voces.
- **Nada se publica ni se gasta sin un "sí" explícito.** El coste en créditos se enseña antes.
- **No se copia**: de los virales, el patrón (gancho, estructura, ritmo, formato); nunca su texto
  (6 palabras seguidas = copia), sus imágenes ni su audio. Se descargan solo para analizarlos.
- **No se inventa nada**: ni visitas, ni datos del guion, ni cifras en las animaciones. Lo que no
  se midió es "sin datos"; lo que falta se pregunta.
- **La persona en pantalla ≥ 50 %** de cada vídeo. Recursos de IA: objetos, lugares, ilustraciones;
  **nunca personas inventadas**.
- **No se salta el acceso de TikTok ni de Instagram** ni se piden sus contraseñas.
- **Sin música con derechos.** El sonido en tendencia se añade desde la app al publicar.
- Las claves van a `.env.local`, nunca por el chat.
- Sin Higgsfield el kit funciona entero. Con Higgsfield, para mejor calidad de recursos se recomienda
  el plan Pro (más créditos); el kit está probado con Starter.
