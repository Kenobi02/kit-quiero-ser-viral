import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Tipografías libres (licencia OFL) que viajan con el kit: no hace falta internet para montar.
export const FUENTE_FUERTE = 'Montserrat Kit';
export const FUENTE_FINA = 'Instrument Serif Kit';

let cargadas = false;
export function cargarFuentes() {
  if (cargadas) return;
  cargadas = true;
  loadFont({family: FUENTE_FUERTE, url: staticFile('fuentes/Montserrat.ttf'), weight: '100 900'});
  loadFont({family: FUENTE_FINA, url: staticFile('fuentes/InstrumentSerif-Italic.ttf'), style: 'italic', weight: '400'});
}
