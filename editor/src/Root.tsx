import React from 'react';
import {Composition} from 'remotion';
import {VideoViral, PropsVideo} from './VideoViral';
import {PruebaEquipo} from './PruebaEquipo';

const FPS = 30;

// Las props reales las escribe herramientas/montar.mjs a partir del plan de montaje de cada vídeo.
const ejemplo: PropsVideo = {
  acento: '#FFE600',
  audio: null,
  duracionMs: 3000,
  planos: [{tipo: 'tarjeta', desdeMs: 0, hastaMs: 3000, texto: 'QUIERO SER VIRAL', subtexto: 'plantilla vacía'}],
  textos: [],
  palabras: [],
  progreso: true,
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="VideoViral"
      component={VideoViral}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={90}
      defaultProps={ejemplo}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round((props.duracionMs / 1000) * FPS))})}
    />
    <Composition id="PruebaEquipo" component={PruebaEquipo} fps={FPS} width={1080} height={1920} durationInFrames={60} />
  </>
);
