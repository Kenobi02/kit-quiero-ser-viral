import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {cargarFuentes, FUENTE_FUERTE, FUENTE_FINA} from './fuentes';

cargarFuentes();

// ---------------------------------------------------------------------------------------------
// Tipos del plan de montaje (los rellena herramientas/montar.mjs; ver referencias/edicion.md).
// Todas las rutas son relativas a editor/public/. Todos los tiempos, en milisegundos.
// ---------------------------------------------------------------------------------------------
export type Medio = {src: string; tipo: 'video' | 'foto'; encuadre?: 'cubrir' | 'encajar'; focoY?: number};
export type Columna = {titulo: string; items: string[]};
export type Plano = {
  tipo: 'video' | 'foto' | 'tarjeta' | 'partido' | 'animacion';
  plantilla?: 'lista' | 'comparativa' | 'cifra'; // animacion (hechas en código: gratis, sin Higgsfield)
  titulo?: string; // animacion lista / comparativa
  items?: string[]; // animacion lista
  izquierda?: Columna; // animacion comparativa ("antes")
  derecha?: Columna; // animacion comparativa ("ahora", en el color de acento)
  valor?: number; // animacion cifra
  sufijo?: string; // animacion cifra ("%", "x", " min"…)
  desdeMs: number;
  hastaMs: number;
  src?: string;
  encuadre?: 'cubrir' | 'encajar';
  focoY?: number; // 0-100: qué altura de la imagen queda a la vista al recortar (50 = centro)
  movimiento?: 'lento' | 'golpe' | 'ninguno';
  ia?: boolean;
  texto?: string; // tarjeta / animacion cifra
  subtexto?: string; // tarjeta
  arriba?: Medio; // partido
  abajo?: Medio; // partido
};
export type Texto = {texto: string; subtexto?: string; desdeMs: number; hastaMs: number; estilo: 'gancho' | 'clave' | 'contador'; y?: number};
export type Palabra = {text: string; startMs: number; endMs: number};
export type PropsVideo = {
  acento: string;
  audio: string | null;
  duracionMs: number;
  planos: Plano[];
  textos: Texto[];
  palabras: Palabra[];
  progreso: boolean;
  subtitulosY?: number;
};

const ANCHO = 1080;
const ALTO = 1920;
const GOLPE_MS = 2500; // en planos con "golpe", un zoom seco cada 2,5 s (algo nuevo en pantalla cada ≤ 4 s)
const aFrames = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

// ---------------------------------------------------------------------------------------------
const Imagen: React.FC<{medio: Medio; estilo?: React.CSSProperties}> = ({medio, estilo}) => {
  const style: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${medio.focoY ?? 50}%`, ...estilo};
  return medio.tipo === 'video' ? <OffthreadVideo src={staticFile(medio.src)} muted style={style} /> : <Img src={staticFile(medio.src)} style={style} />;
};

const MedioVisual: React.FC<{medio: Medio}> = ({medio}) => {
  if (medio.encuadre === 'encajar') {
    // Para grabaciones de pantalla u horizontales: fondo desenfocado + la imagen entera encima.
    return (
      <AbsoluteFill>
        <Imagen medio={medio} estilo={{filter: 'blur(40px) brightness(0.55)', transform: 'scale(1.15)'}} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <Imagen medio={medio} estilo={{objectFit: 'contain'}} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return <Imagen medio={medio} />;
};

function escalaMovimiento(movimiento: Plano['movimiento'], frame: number, durFrames: number, fps: number) {
  const entrada = interpolate(frame, [0, 5], [1.06, 1], {extrapolateRight: 'clamp'}); // pequeño "pop" al entrar
  if (movimiento === 'lento') return entrada * interpolate(frame, [0, durFrames], [1, 1.12]);
  if (movimiento === 'golpe') {
    const tramo = Math.floor((frame / fps) * 1000 / GOLPE_MS);
    return entrada * (tramo % 2 === 0 ? 1 : 1.13);
  }
  return entrada;
}

// ---------------------------------------------------------------------------------------------
// Animaciones hechas en código (como los gráficos del ejemplo épico). Fondo oscuro, letra de la
// marca y el color de acento. Todo entra con movimiento para que haya "algo nuevo" en pantalla.
const FONDO_ANIM = 'radial-gradient(circle at 50% 35%, #262626 0%, #0b0b0b 72%)';
const Animacion: React.FC<{plano: Plano; acento: string}> = ({plano, acento}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = Math.max(1, aFrames(plano.hastaMs - plano.desdeMs, fps));
  const entra = (desde: number) => spring({frame: frame - desde, fps, config: {damping: 14}});
  const titulo = plano.titulo ? (
    <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 96, lineHeight: 1.02, color: acento, textTransform: 'uppercase', textAlign: 'center', marginBottom: 70, transform: `scale(${0.8 + 0.2 * entra(0)})`, opacity: entra(0)}}>{plano.titulo}</div>
  ) : null;
  if (plano.plantilla === 'lista') {
    const items = plano.items || [];
    const paso = Math.max(6, Math.floor((dur * 0.75) / Math.max(1, items.length)));
    return (
      <AbsoluteFill style={{background: FONDO_ANIM, justifyContent: 'center', padding: '0 110px'}}>
        <div style={{marginTop: -220}}>
          {titulo}
          {items.map((it, i) => {
            const s = entra(6 + i * paso);
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 34, marginBottom: 46, opacity: s, transform: `translateX(${(1 - s) * -120}px)`}}>
                <div style={{flex: '0 0 96px', height: 96, borderRadius: 48, background: acento, color: '#0b0b0b', fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
                <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 800, fontSize: 62, lineHeight: 1.1, color: 'white'}}>{it}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }
  if (plano.plantilla === 'comparativa' && plano.izquierda && plano.derecha) {
    const col = (c: Columna, color: string, desde: number, tachado: boolean) => {
      const s = entra(desde);
      return (
        <div style={{flex: 1, opacity: s, transform: `translateY(${(1 - s) * 60}px)`, textAlign: 'center'}}>
          <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 58, color, textTransform: 'uppercase', marginBottom: 34}}>{c.titulo}</div>
          {c.items.map((it, i) => (
            <div key={i} style={{fontFamily: FUENTE_FUERTE, fontWeight: 700, fontSize: 46, lineHeight: 1.15, color: tachado ? 'rgba(255,255,255,0.55)' : 'white', textDecoration: tachado ? 'line-through' : 'none', marginBottom: 26}}>{it}</div>
          ))}
        </div>
      );
    };
    const vs = entra(Math.floor(dur * 0.25));
    return (
      <AbsoluteFill style={{background: FONDO_ANIM, justifyContent: 'center', padding: '0 70px'}}>
        <div style={{marginTop: -200}}>
          {titulo}
          <div style={{display: 'flex', alignItems: 'flex-start', gap: 30}}>
            {col(plano.izquierda, 'rgba(255,255,255,0.75)', 6, true)}
            <div style={{alignSelf: 'center', fontFamily: FUENTE_FINA, fontStyle: 'italic', fontSize: 90, color: acento, transform: `scale(${vs})`}}>vs</div>
            {col(plano.derecha, acento, Math.floor(dur * 0.35), false)}
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  if (plano.plantilla === 'cifra') {
    const objetivo = plano.valor ?? 0;
    const n = interpolate(frame, [4, Math.max(8, dur * 0.55)], [0, objetivo], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const texto = Number.isInteger(objetivo) ? Math.round(n).toLocaleString('es-ES') : n.toFixed(1).replace('.', ',');
    return (
      <AbsoluteFill style={{background: FONDO_ANIM, justifyContent: 'center', alignItems: 'center', padding: '0 90px'}}>
        <div style={{marginTop: -200, textAlign: 'center'}}>
          {titulo}
          <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 250, lineHeight: 1, color: acento}}>{texto}{plano.sufijo || ''}</div>
          <div style={{fontFamily: FUENTE_FINA, fontStyle: 'italic', fontSize: 84, color: 'white', marginTop: 30, opacity: entra(Math.floor(dur * 0.4))}}>{plano.texto}</div>
        </div>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{background: FONDO_ANIM}} />;
};

const PlanoVista: React.FC<{plano: Plano; acento: string}> = ({plano, acento}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = aFrames(plano.hastaMs - plano.desdeMs, fps);
  const escala = escalaMovimiento(plano.movimiento ?? (plano.tipo === 'foto' ? 'lento' : 'ninguno'), frame, dur, fps);

  if (plano.tipo === 'animacion') return <Animacion plano={plano} acento={acento} />;

  if (plano.tipo === 'tarjeta') {
    const s = spring({frame, fps, config: {damping: 13}});
    return (
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #262626 0%, #0b0b0b 70%)', justifyContent: 'center', alignItems: 'center', padding: '0 90px'}}>
        <div style={{transform: `scale(${0.85 + 0.15 * s})`, opacity: s, textAlign: 'center', marginTop: -160}}>
          <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 120, lineHeight: 1.02, color: acento, textTransform: 'uppercase'}}>{plano.texto}</div>
          {plano.subtexto ? <div style={{fontFamily: FUENTE_FINA, fontStyle: 'italic', fontSize: 84, color: 'white', marginTop: 24}}>{plano.subtexto}</div> : null}
        </div>
      </AbsoluteFill>
    );
  }
  if (plano.tipo === 'partido' && plano.arriba && plano.abajo) {
    return (
      <AbsoluteFill>
        <div style={{position: 'absolute', top: 0, left: 0, width: ANCHO, height: ALTO / 2, overflow: 'hidden'}}>
          <div style={{width: '100%', height: '100%', transform: `scale(${escala})`}}>
            <MedioVisual medio={plano.arriba} />
          </div>
        </div>
        <div style={{position: 'absolute', top: ALTO / 2, left: 0, width: ANCHO, height: ALTO / 2, overflow: 'hidden'}}>
          <div style={{width: '100%', height: '100%', transform: `scale(${escala})`}}>
            <MedioVisual medio={plano.abajo} />
          </div>
        </div>
        <div style={{position: 'absolute', top: ALTO / 2 - 4, left: 0, width: ANCHO, height: 8, background: acento}} />
      </AbsoluteFill>
    );
  }
  if (!plano.src) return <AbsoluteFill style={{backgroundColor: '#0b0b0b'}} />;
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#0b0b0b'}}>
      <AbsoluteFill style={{transform: `scale(${escala})`}}>
        <MedioVisual medio={{src: plano.src, tipo: plano.tipo === 'video' ? 'video' : 'foto', encuadre: plano.encuadre, focoY: plano.focoY}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
const TextoVista: React.FC<{texto: Texto; acento: string; enPartido: boolean}> = ({texto, acento, enPartido}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 10}});
  // Por defecto: en pantalla partida, en la parte baja de la mitad de arriba (los subtítulos van en la
  // línea del medio); si no, al 60 % de alto, por debajo de la cara de un primer plano (Paso 5: al 55 % rozaba la barbilla).
  const y = texto.y ?? (enPartido ? 0.36 : 0.6);
  const contenedor: React.CSSProperties = {position: 'absolute', left: 70, right: 70, top: y * ALTO, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center'};
  if (texto.estilo === 'contador') {
    // Marca fija de avance ("1/3", "PASO 2"…), arriba a la izquierda, como el contador del ejemplo épico.
    return (
      <div style={{position: 'absolute', left: 70, top: (texto.y ?? 0.12) * ALTO, background: acento, color: '#0b0b0b', fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 50, padding: '10px 26px', borderRadius: 14, transform: `scale(${0.85 + 0.15 * s})`, transformOrigin: 'left center'}}>{texto.texto}</div>
    );
  }
  if (texto.estilo === 'gancho') {
    return (
      <div style={contenedor}>
        <div style={{maxWidth: 900, background: acento, color: '#0b0b0b', fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 74, lineHeight: 1.08, padding: '18px 34px', textAlign: 'center', textTransform: 'uppercase', transform: `rotate(-2deg) scale(${s})`, boxShadow: '0 14px 40px rgba(0,0,0,0.45)'}}>{texto.texto}</div>
      </div>
    );
  }
  return (
    <div style={{...contenedor, transform: `translateY(-50%) scale(${0.7 + 0.3 * s})`}}>
      <div style={{fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 112, lineHeight: 1, color: acento, textTransform: 'uppercase', textAlign: 'center', WebkitTextStroke: '8px #0b0b0b', paintOrder: 'stroke fill', maxWidth: 900}}>{texto.texto}</div>
      {texto.subtexto ? <div style={{fontFamily: FUENTE_FINA, fontStyle: 'italic', fontSize: 76, color: 'white', marginTop: 10, textShadow: '0 4px 18px rgba(0,0,0,0.9)', textAlign: 'center'}}>{texto.subtexto}</div> : null}
    </div>
  );
};

// Subtítulos palabra a palabra: grupos de hasta 3 palabras, cortando en signos de puntuación y pausas.
function agrupar(palabras: Palabra[]) {
  const grupos: Palabra[][] = [];
  let actual: Palabra[] = [];
  palabras.forEach((p, i) => {
    actual.push(p);
    const sig = palabras[i + 1];
    const corte = actual.length >= 3 || /[.,;:!?…]$/.test(p.text) || (sig && sig.startMs - p.endMs > 400);
    if (corte || !sig) {
      grupos.push(actual);
      actual = [];
    }
  });
  return grupos;
}

const Subtitulos: React.FC<{palabras: Palabra[]; acento: string; y: number}> = ({palabras, acento, y}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const grupos = React.useMemo(() => agrupar(palabras), [palabras]);
  const ms = (frame / fps) * 1000;
  const k = grupos.findIndex((g, i) => ms >= g[0].startMs && ms < (grupos[i + 1]?.[0].startMs ?? g[g.length - 1].endMs + 400));
  if (k < 0) return null;
  const g = grupos[k];
  const s = spring({frame: frame - aFrames(g[0].startMs, fps), fps, config: {damping: 12}});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y * ALTO, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center'}}>
      <div style={{maxWidth: 760, textAlign: 'center', transform: `scale(${0.82 + 0.18 * s})`, fontFamily: FUENTE_FUERTE, fontWeight: 900, fontSize: 84, lineHeight: 1.08, textTransform: 'uppercase', WebkitTextStroke: '8px #0b0b0b', paintOrder: 'stroke fill', textShadow: '0 6px 24px rgba(0,0,0,0.55)'}}>
        {g.map((w, i) => (
          <span key={i} style={{color: ms >= w.startMs && ms < w.endMs + 80 ? acento : 'white'}}>
            {w.text}{' '}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
export const VideoViral: React.FC<PropsVideo> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const planoActual = props.planos.find((p) => ms >= p.desdeMs && ms < p.hastaMs);
  return (
    <AbsoluteFill style={{backgroundColor: '#0b0b0b'}}>
      {props.planos.map((p, i) => (
        <Sequence key={`p${i}`} from={aFrames(p.desdeMs, fps)} durationInFrames={Math.max(1, aFrames(p.hastaMs, fps) - aFrames(p.desdeMs, fps))}>
          <PlanoVista plano={p} acento={props.acento} />
        </Sequence>
      ))}
      {props.textos.map((t, i) => (
        <Sequence key={`t${i}`} from={aFrames(t.desdeMs, fps)} durationInFrames={Math.max(1, aFrames(t.hastaMs, fps) - aFrames(t.desdeMs, fps))}>
          <TextoVista texto={t} acento={props.acento} enPartido={planoActual?.tipo === 'partido'} />
        </Sequence>
      ))}
      {/* En pantalla partida los subtítulos van sobre la línea del medio: más abajo tapaban la cara (Paso 5). */}
      {props.palabras.length ? <Subtitulos palabras={props.palabras} acento={props.acento} y={planoActual?.tipo === 'partido' ? 0.5 : props.subtitulosY ?? 0.74} /> : null}
      {props.progreso ? (
        <div style={{position: 'absolute', left: 0, bottom: 0, height: 12, width: `${(frame / durationInFrames) * 100}%`, background: props.acento}} />
      ) : null}
      {props.audio ? <Audio src={staticFile(props.audio)} /> : null}
    </AbsoluteFill>
  );
};
