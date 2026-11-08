// La cadena de limpieza de voz, compartida por voz.mjs y montar.mjs.
// Quita graves de fondo, reduce ruido, iguala la voz y la deja al volumen de las redes (−14 LUFS).
// El limitador del final evita que se sature (en la prueba, sin él, el pico llegó a +1,6 dB).
export const CADENA_VOZ = 'highpass=f=80,afftdn=nf=-30,acompressor=threshold=-24dB:ratio=3:attack=10:release=200:makeup=4,loudnorm=I=-14:TP=-1.5:LRA=9,alimiter=limit=0.79:level=false';
