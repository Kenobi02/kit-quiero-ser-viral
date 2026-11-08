# Investigar qué funciona en el nicho

**Lo que se sabe (comprobado al construir el kit, noviembre 2026):**

| Fuente | Qué da | Cómo |
|---|---|---|
| YouTube Shorts por etiqueta | ✓ Visitas reales, duración, canal, fecha, título | `investigar.mjs etiquetas` |
| YouTube por búsqueda de texto | ✓ Pero salen pocos virales | `investigar.mjs buscar` (plan B; añade "#shorts" sola: sin eso solo trae tutoriales largos) |
| Lo que dice cada Short | ✓ Transcripción con tiempos + hoja de fotogramas + cortes | `investigar.mjs analizar` |
| TikTok | Solo en parte: enlaces y texto por el buscador; **sin visitas** | herramienta de búsqueda con `allowed_domains: ["tiktok.com"]`; `investigar.mjs tiktok <url>` da título y autor |
| TikTok/Instagram directos | ✗ Bloquean la lectura automática. **No se intenta saltar** | Si la persona quiere, que pegue enlaces o capturas (en la captura se ven las visitas) |

Muchos virales de TikTok se resuben a Shorts: por eso YouTube es la fuente con cifras.

## 1 · Etiquetas

Entre 4 y 6, sacadas de `marca.md` (tema, país, idioma), de concretas a amplias, **sin tildes ni
espacios**. Ejemplo para "ejercicio en casa para mamás · España":
`entrenamientoencasa,ejerciciosencasa,mamasfit,rutinarapida,fitness`.

Las amplias (`ia`, `fitness`, `humor`) traen los vídeos más vistos pero casi siempre de otro tema
o de otro país: sirven para tener cifras de referencia, no para elegir.

## 2 · Filtrar (a mano, con una línea de por qué)

Fuera:
- Lo que no es del nicho (en la prueba, el más visto de `#automatizacion` era de máquinas de
  carpintería; los de `#ia` eran humor hecho con IA).
- Lo que no está en el idioma de la persona.
- Más de 90 s (la herramienta ya los quita).
- Un segundo vídeo del mismo creador (se queda el más visto).
- Los que **dependen de algo que el kit no hace**: transformar con IA la cara de una persona real o
  imitar a un famoso (suplantación), o montar escenas de películas y series (derechos). Se ven en la
  hoja de fotogramas, no en el título: por eso se mira siempre. Su idea puede servir de inspiración
  (p. ej. "cuando te pasa X…"), pero no cuentan entre los 3.

Se prefieren los de los últimos 12 meses. Si uno muy visto es más antiguo, vale, diciendo la fecha.

## 3 · Elegir los 3

Los 3 más vistos que queden. Si quedan menos de 3: `buscar` con 2-3 frases del tema; si aun así
faltan, se le piden enlaces a la persona. **Nunca se rellena con un vídeo que no se pudo medir
como si tuviera cifra.**

## 4 · Analizar cada uno

`node herramientas/investigar.mjs analizar <url> --dir workspace/<tanda>/investigacion`

Abre `<id>-fotogramas.jpg` (12 fotogramas) y `<id>-transcripcion.json`. Apunta:
- **Gancho literal**: la primera frase, copiada tal cual de la transcripción.
- **Estructura**: lista, error común, mito o realidad, antes y después, paso a paso, historia,
  pregunta y respuesta, demostración.
- **Formato visual**: a cámara, pantalla partida (recurso arriba, persona abajo), solo
  imágenes con voz, texto grande en pantalla, capturas.
- **Ritmo**: segundos por plano (lo da la herramienta) y palabras por segundo.
- **Por qué funciona**, en una línea, sin adornos.

## 5 · Plantilla de `investigacion.md`

```markdown
# Investigación · AAAA-MM-DD

Nicho: … · Idioma: … · Etiquetas: #… #… #…
Revisados: N Shorts (≤ 90 s) · Descartados: N (motivo principal: …)

## Los 3 elegidos

### 1 · "<título>" — <canal>
- Visitas: 389.127 (medidas el AAAA-MM-DD) · Duración: 51 s · Publicado: AAAA-MM-DD
- Enlace: https://www.youtube.com/shorts/…
- Gancho (literal): "…"
- Estructura: … · Formato: … · Ritmo: un corte cada 1,5 s · 3,2 palabras/s
- Por qué funciona: …

### 2 · …
### 3 · …

## Inspiración de TikTok (sin cifras)
| Enlace | Autor | De qué va | Visitas |
|---|---|---|---|
| … | … | … | sin datos |

## Descartados destacados
| Vídeo | Visitas | Por qué no |
|---|---|---|
```
