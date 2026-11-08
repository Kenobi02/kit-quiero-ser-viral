# Recursos y animaciones

Lo que tapa a la persona un momento mientras sigue hablando. Por orden de preferencia:

1. **Animaciones del editor** (gratis, siempre disponibles): `lista`, `comparativa`, `cifra`,
   `tarjeta`, y el `contador` y las palabras `clave` como textos. Formato en `edicion.md`.
2. **Recursos suyos**: los vídeos sin hablar que dejó en su carpeta (su negocio, su producto, su
   pantalla). Lo más auténtico.
3. **Recursos de Higgsfield** (opcional, de pago): imágenes y clips de **objetos, lugares e
   ilustraciones**. Salen mucho mejor que nada genérico, pero el kit funciona igual sin ellos.

## Higgsfield: qué y cuánto (medido en noviembre de 2026, plan Starter)

| Recurso | Modelo | Coste | Para qué |
|---|---|---|---|
| Imagen | `flux_2` (o `nano_banana_2_lite`) | 1 cr | Un objeto, un lugar, una ilustración. En el vídeo se mueve sola (acercamiento lento) |
| Clip 5 s a 480p | `seedance_2_0_mini` | 2,5 cr | Movimiento real (vapor, un plato girando, una calle) |
| Clip 5 s a 720p | `seedance_2_0_mini` | 5 cr | Lo mismo, más nítido |

Unos **5-10 créditos por vídeo** con 2-4 recursos. Con el plan Pro de Higgsfield hay más créditos al
mes (recomendado si se usa a menudo); el kit está probado con Starter.

### Reglas de los recursos de IA

- **Nunca personas** (ni caras, ni manos en primer plano, ni siluetas que parezcan alguien real).
  Objetos, lugares, comida, pantallas, ilustraciones, iconos, texturas.
- Nada de marcas registradas ni logos de terceros.
- Sin texto dentro de la imagen (la IA escribe letras raras): el texto lo pone el editor.
- **Mira cada uno antes de usarlo.** Si sale una persona, letras, algo deforme o no se entiende qué
  es, no se usa (y se dice; no se repite sin preguntar, porque cuesta).
- Se le dice a la persona que lleva recursos de IA, para que marque la etiqueta al publicar.

### Cómo se piden

Primero el coste de todo junto y el saldo, y un **"sí"**:
```bash
node herramientas/higgs.mjs saldo
node herramientas/higgs.mjs coste flux_2 --prompt "<descripción>" --aspect_ratio 9:16
node herramientas/higgs.mjs coste seedance_2_0_mini --prompt "<descripción>" --duration 5 --aspect_ratio 9:16 --resolution 480p
```
Después, cada uno a `workspace/<tanda>/video-N/recursos/`:
```bash
node herramientas/higgs.mjs crear flux_2 --salida workspace/<tanda>/video-N/recursos/<nombre>.png \
  --aspect_ratio 9:16 --prompt "Photorealistic vertical photo of <objeto o lugar>, <luz>, <estilo de la marca>. No people, no hands, no text, no logos."
node herramientas/higgs.mjs crear seedance_2_0_mini --salida workspace/<tanda>/video-N/recursos/<nombre>.mp4 \
  --duration 5 --aspect_ratio 9:16 --resolution 480p \
  --prompt "Cinematic vertical b-roll of <objeto o lugar> with gentle motion, <luz>. No people, no hands, no text, no logos."
```
Para animar una imagen ya generada: `--start-image <imagen>` en el clip. El sonido del clip no se
usa (la voz es la de la base). `higgs.mjs` reintenta una vez si Higgsfield devuelve "failed" (pasa a
veces y no cobra) y dice lo gastado.

### Si algo falla

| Mensaje | Qué hacer |
|---|---|
| "sin sesión en Higgsfield" | `node herramientas/equipo.mjs entrar-higgsfield`, o seguir sin recursos de IA |
| "no quedan créditos suficientes" | Para, dile su saldo y sigue con animaciones y recursos suyos |
| "falló dos veces" | No reintentes más; ese hueco va con una animación |
| "exige un plan superior" | Ese modelo no está en su plan: usa los de esta tabla |
