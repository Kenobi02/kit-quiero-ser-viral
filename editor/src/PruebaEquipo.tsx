import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {cargarFuentes, FUENTE_FUERTE} from './fuentes';

cargarFuentes();

// Vídeo de 2 s que monta /setup para comprobar que Remotion funciona en este ordenador.
export const PruebaEquipo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#111', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 110, color: '#FFE600', transform: `scale(${interpolate(f, [0, 60], [0.9, 1.1])})`}}>✓ LISTO</div>
    </AbsoluteFill>
  );
};
