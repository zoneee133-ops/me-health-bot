import * as THREE from 'three';
import {useMemo, useRef} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useFrame} from '@react-three/fiber';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, EndCard, Sparkle} from './shared';

// Реел «Цифровой рентген» — хаос бумаг → светящаяся 3D-фигура тела → карточка объяснения.

const pseudoRand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const PANIC_DOCS = ['инфильтрация...', 'лимфоцитоз...', 'гипоэхогенный...', 'АЛТ 62 ↑', 'СОЭ 24'];

const PaperChaos: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#0A0A0C', alignItems: 'center', justifyContent: 'center'}}>
      {PANIC_DOCS.map((doc, i) => {
        const seed = i * 17;
        const x = 540 + Math.sin(f / 8 + seed) * (200 + i * 60);
        const y = 960 + Math.cos(f / 7 + seed) * (300 + i * 80);
        const rot = Math.sin(f / 10 + seed) * 20;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%,-50%) rotate(${rot}deg)`,
              background: '#fff',
              padding: '14px 20px',
              borderRadius: 10,
              fontFamily: T.font,
              fontWeight: 700,
              fontSize: 30,
              color: T.bad,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            {doc}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(200,68,58,0.25), transparent 70%)',
        }}
      />
    </AbsoluteFill>
  );
};

// Абстрактная светящаяся фигура человека из примитивов three.js — не анатомическая модель,
// стилизованный силуэт для "рентген"-эффекта.
const GlowFigure: React.FC<{highlightFrame: number}> = ({highlightFrame}) => {
  const f = useCurrentFrame();
  const group = useRef<THREE.Group>(null);
  const kneeRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (group.current) group.current.rotation.y = f * 0.012;
  });

  const glow = T.accent;
  const pulse = 0.5 + 0.5 * Math.sin(Math.max(0, f - highlightFrame) / 6);
  const highlightActive = f > highlightFrame;

  return (
    <group ref={group}>
      {/* голова */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      {/* торс */}
      <mesh position={[0, 1.4, 0]}>
        <capsuleGeometry args={[0.62, 1.8, 8, 16]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      {/* руки */}
      <mesh position={[-1.0, 1.5, 0]} rotation={[0, 0, 0.25]}>
        <capsuleGeometry args={[0.18, 1.6, 8, 16]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.5} transparent opacity={0.75} />
      </mesh>
      <mesh position={[1.0, 1.5, 0]} rotation={[0, 0, -0.25]}>
        <capsuleGeometry args={[0.18, 1.6, 8, 16]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.5} transparent opacity={0.75} />
      </mesh>
      {/* ноги */}
      <mesh position={[-0.32, -0.9, 0]}>
        <capsuleGeometry args={[0.22, 1.9, 8, 16]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.5} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0.32, -0.9, 0]} ref={kneeRef}>
        <capsuleGeometry args={[0.22, 1.9, 8, 16]} />
        <meshStandardMaterial
          color={highlightActive ? T.bad : glow}
          emissive={highlightActive ? T.bad : glow}
          emissiveIntensity={highlightActive ? 0.8 + pulse * 0.6 : 0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
};

const XrayScene: React.FC<{highlightFrame: number}> = ({highlightFrame}) => {
  const f = useCurrentFrame();
  const camZ = interpolate(f, [0, 60], [11, 8.5], {extrapolateRight: 'clamp'});
  return (
    <ThreeCanvas linear width={1080} height={1920} style={{background: '#0A0A0C'}}>
      <ambientLight intensity={1.1} />
      <pointLight position={[3, 4, 5]} intensity={90} color={T.accent} />
      <pointLight position={[-3, -2, 4]} intensity={60} color="#ffffff" />
      <pointLight position={[0, 0, 6]} intensity={50} color={T.accent} />
      <perspectiveCamera makeDefault position={[0, 0.7, camZ]} fov={55} />
      <GlowFigure highlightFrame={highlightFrame} />
    </ThreeCanvas>
  );
};

const ExplainOverlay: React.FC<{delay: number}> = ({delay}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.2}});
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        bottom: 420,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${T.accent}`,
          borderRadius: 22,
          padding: '26px 30px',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{fontSize: 24, color: '#B9C6C4', textDecoration: 'line-through', opacity: 0.7}}>
          Гонартроз, гипоэхогенность
        </div>
        <div style={{fontSize: 34, fontWeight: 700, color: '#EAF1F7', marginTop: 10}}>
          Лёгкий ушиб колена. Заживёт за 5 дней
        </div>
      </div>
    </div>
  );
};

const GreenSweep: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 55%, rgba(126,154,151,0.28), transparent 60%)`,
        opacity: o,
        pointerEvents: 'none',
      }}
    />
  );
};

export const ReelXrayBody: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={90}>
      <PaperChaos />
      <Caption lines={['Что на самом деле значат', 'твои анализы?']} from={10} dur={75} align="top" scrim={false} dark />
    </Sequence>

    <Sequence from={90} durationInFrames={360}>
      <AbsoluteFill style={{background: '#0A0A0C'}}>
        <XrayScene highlightFrame={90} />
        <GreenSweep />
        <ExplainOverlay delay={130} />
      </AbsoluteFill>
    </Sequence>

    <Sequence from={450} durationInFrames={130}>
      <EndCard from={0} dur={130} tagline={['Переводим медицину', 'на человеческий']} />
    </Sequence>
  </AbsoluteFill>
);
