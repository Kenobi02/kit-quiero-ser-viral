# Textos y publicación

## Plantilla de `textos-para-publicar.md`

```markdown
# Textos para publicar · AAAA-MM-DD

## Vídeo 1 · <título interno>
Archivo: videos terminados/AAAA-MM-DD-video-1.mp4 · Duración: 47 s

**Texto** (cópialo tal cual):
<el gancho en la primera línea, dentro de los primeros 150 caracteres>
<1-2 líneas de valor>
<la llamada a la acción>

**Hashtags**: #… #… #… (1-2 amplios del nicho + 2-3 concretos; 3 a 5 en total)

**Sonido**: añade desde la app un sonido en tendencia <tipo: instrumental tranquilo / enérgico>,
con el volumen muy bajo para que se entienda tu voz.

**Antes de publicar** (solo si el vídeo lleva recursos de Higgsfield): marca que es **contenido
creado con IA** (ver abajo).
```

Reglas: los hashtags salen de las etiquetas de la investigación que sí eran de su nicho; nada de
`#fyp`, `#viral` o `#parati` como únicos (se pueden añadir, no sustituyen a los del tema).
Nunca se prometen visitas en el texto.

## La etiqueta de IA (si el vídeo lleva recursos de Higgsfield)

La persona y su voz son reales, pero si el vídeo lleva imágenes o clips generados con IA que parecen
reales, TikTok e Instagram piden marcarlo. Ante la duda, se marca: no resta alcance y evita avisos.
Las opciones cambian de sitio con las actualizaciones; lo que se busca es:
- **TikTok**: al publicar, en "Más opciones", activar la etiqueta de **contenido generado por IA**.
- **Instagram**: al publicar el reel, en "Configuración avanzada", activar la **etiqueta de IA**.
Si no la encuentra donde se le dice, que busque "IA" en las opciones de la pantalla de publicar.

## Publicar a mano (lo normal, gratis)

**Desde el móvil** (recomendado: así puede elegir el sonido en tendencia)
1. Pasa el vídeo al móvil: WhatsApp a ti mismo (como **documento**, para que no pierda calidad),
   Google Drive, iCloud o AirDrop.
2. Abre TikTok (o Instagram) → **+** → elige el vídeo de la galería.
3. Añade el sonido en tendencia con el volumen bajo.
4. Pega el texto y los hashtags de `textos-para-publicar.md`.
5. Marca la etiqueta de IA y publica.

**Desde el ordenador**: tiktok.com/upload, o instagram.com → Crear → Reel. Mismos pasos 4 y 5.

## Publicar con Blotato (opcional, de pago)

Solo si la persona lo pidió y conectó Blotato con `/blotato` (clave en `.env.local`).

1. Pregunta por cada vídeo y cada red: **"¿Publico el vídeo 2 en TikTok? (sí/no)"**. Un "sí" por
   vídeo y por red. Un "publica todo" vale solo si nombra qué vídeos y qué redes.
2. `node herramientas/blotato.mjs cuentas` → elige el `id` de la red que toca.
3. `node herramientas/blotato.mjs subir "<video.mp4>"` → apunta la `URL`.
4. Guarda el texto del vídeo en `workspace/<tanda>/video-N/texto.txt` y:
   `node herramientas/blotato.mjs publicar --cuenta <id> --red tiktok --texto-archivo <texto.txt> --video-url <URL> [--borrador] [--privado]`
   La **primera vez**, propón `--privado` (TikTok: solo lo ves tú) o `--borrador`, para comprobar
   que llega bien. En TikTok el kit marca siempre `isAiGenerated: true`.
5. `node herramientas/blotato.mjs estado <ID>` hasta `published` o `failed` (espera 1-2 min entre
   consultas). Si `failed`, dile el motivo literal.
6. Apunta en `workspace/<tanda>/publicado.md`: fecha, vídeo, red, estado y enlace.

Nota honesta (también en el README): la conexión con Blotato está hecha según su documentación
oficial y comprobada sin cuenta (la API responde); no se ha podido publicar de prueba con una
cuenta real al construir el kit.
