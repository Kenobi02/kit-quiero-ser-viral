---
description: Conectar Blotato para que el kit pueda publicar solo (opcional, de pago)
---

Guía al usuario para conectar Blotato, en español, sin jerga y sin pedirle nunca la clave por el
chat. Valida cada paso con ✓ o ✗.

1. **Explícale antes** (en 4 líneas): Blotato es un servicio de pago aparte que publica en TikTok e
   Instagram por él. Sin Blotato el kit funciona entero (deja vídeos y textos listos para subir a
   mano). Su API (la conexión que usa el kit) **solo funciona con un plan de pago**, y según su
   documentación **generar la clave termina la prueba gratuita y activa el cobro en ese momento**.
   Precio actual: que lo mire en blotato.com antes de decidir. Pregunta si sigue adelante.
2. Que cree su cuenta en blotato.com y **conecte allí** su TikTok y su Instagram (desde su panel,
   botón de conectar cuentas). El kit nunca ve sus contraseñas.
3. Que genere la clave en my.blotato.com → Settings → API → *Generate API Key* (recuérdale el aviso
   del cobro) y la copie.
4. Crea `.env.local` copiando `.env.example` (si no existe ya) y dile: "Abre el archivo `.env.local`
   en el panel de la izquierda de VS Code, sustituye `pega-aqui-tu-clave` por tu clave, guarda
   (Ctrl+S o Cmd+S) y escribe *listo*". **Nunca le pidas que la pegue en el chat**; si lo hace, dile
   que la borre del mensaje y la regenere en Blotato.
5. `node herramientas/blotato.mjs probar` → ✓ la clave funciona (si 401: mal copiada; si 403: sin
   plan de pago).
6. `node herramientas/blotato.mjs cuentas` → ✓ aparecen su TikTok y su Instagram con su id.
7. Pon `"blotato": true` en `.claude/setup-completado.json`.
8. Dile con honestidad: "La conexión está hecha según la documentación oficial de Blotato. La
   primera vez que publiquemos lo haremos en privado o en borrador para comprobar que llega bien."
   Siguiente acción: "Cuando tengas vídeos terminados, dime cuál publicar."
