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

// Глянцевый манекен из примитивов three.js — не анатомическая модель, стилизованный
// силуэт наподобие витринного манекена, с подсветкой сустава для "рентген"-эффекта.
const GlowFigure: React.FC<{highlightFrame: number}> = ({highlightFrame}) => {
  const f = useCurrentFrame();
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) group.current.rotation.y = f * 0.012;
  });

  const pulse = 0.5 + 0.5 * Math.sin(Math.max(0, f - highlightFrame) / 6);
  const highlightActive = f > highlightFrame;
  const mannequin = '#F2F3F5';

  const glossy = (
    <meshStandardMaterial color={mannequin} metalness={0.15} roughness={0.12} envMapIntensity={1.4} />
  );

  const legMaterial = (
    <meshStandardMaterial
      color={highlightActive ? T.bad : mannequin}
      emissive={highlightActive ? T.bad : '#000000'}
      emissiveIntensity={highlightActive ? 0.9 + pulse * 0.6 : 0}
      metalness={0.15}
      roughness={0.12}
    />
  );

  // Все сегменты строго вертикальны (без наклона/смещения по Z), поэтому силуэт
  // остаётся цельным при повороте камеры вокруг Y — швы не "разъезжаются".
  return (
    <group ref={group} position={[0, -0.3, 0]}>
      {/* голова — вытянутое яйцо, без лица */}
      <mesh position={[0, 3.4, 0]} scale={[0.62, 0.86, 0.68]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        {glossy}
      </mesh>
      {/* шея */}
      <mesh position={[0, 2.85, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 16]} />
        {glossy}
      </mesh>
      {/* плечевые шарниры */}
      <mesh position={[-0.56, 2.5, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        {glossy}
      </mesh>
      <mesh position={[0.56, 2.5, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        {glossy}
      </mesh>
      {/* торс — единая капсула от плеч до таза */}
      <mesh position={[0, 1.3, 0]} scale={[1, 1, 0.85]}>
        <capsuleGeometry args={[0.55, 1.4, 8, 16]} />
        {glossy}
      </mesh>
      {/* тазобедренные шарниры */}
      <mesh position={[-0.28, 0.05, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        {glossy}
      </mesh>
      <mesh position={[0.28, 0.05, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        {glossy}
      </mesh>

      {/* руки — прямо вдоль тела, без сгиба и смещения по Z */}
      <mesh position={[-0.68, 1.35, 0]}>
        <capsuleGeometry args={[0.14, 2.3, 8, 16]} />
        {glossy}
      </mesh>
      <mesh position={[-0.68, 0.06, 0]}>
        <sphereGeometry args={[0.13, 18, 18]} />
        {glossy}
      </mesh>
      <mesh position={[0.68, 1.35, 0]}>
        <capsuleGeometry args={[0.14, 2.3, 8, 16]} />
        {glossy}
      </mesh>
      <mesh position={[0.68, 0.06, 0]}>
        <sphereGeometry args={[0.13, 18, 18]} />
        {glossy}
      </mesh>

      {/* ноги — прямо вниз, единая капсула на каждую */}
      <mesh position={[-0.28, -1.15, 0]}>
        <capsuleGeometry args={[0.22, 1.9, 8, 16]} />
        {glossy}
      </mesh>
      <mesh position={[-0.28, -2.25, 0]}>
        <sphereGeometry args={[0.18, 20, 20]} />
        {glossy}
      </mesh>
      <mesh position={[-0.28, -2.32, 0.14]} scale={[0.85, 0.5, 1.6]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        {glossy}
      </mesh>

      <mesh position={[0.28, -1.15, 0]}>
        <capsuleGeometry args={[0.22, 1.9, 8, 16]} />
        {legMaterial}
      </mesh>
      <mesh position={[0.28, -2.25, 0]}>
        <sphereGeometry args={[0.18, 20, 20]} />
        {legMaterial}
      </mesh>
      <mesh position={[0.28, -2.32, 0.14]} scale={[0.85, 0.5, 1.6]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        {glossy}
      </mesh>
      {/* маркер-подсветка сустава колена */}
      <mesh position={[0.3, -1.55, 0.24]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        {legMaterial}
      </mesh>
    </group>
  );
};

const XrayScene: React.FC<{highlightFrame: number}> = ({highlightFrame}) => {
  const f = useCurrentFrame();
  const camZ = interpolate(f, [0, 60], [19, 16], {extrapolateRight: 'clamp'});
  return (
    <ThreeCanvas linear width={1080} height={1920} style={{background: '#0A0A0C'}}>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 5, 5]} intensity={140} color="#ffffff" />
      <pointLight position={[-3, 1, 4]} intensity={70} color={T.accent} />
      <pointLight position={[0, -2, 5]} intensity={50} color="#ffffff" />
      <perspectiveCamera makeDefault position={[0, 2.6, camZ]} fov={42} />
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

    <Sequence from={90} durationInFrames={230}>
      <AbsoluteFill style={{background: '#0A0A0C'}}>
        <XrayScene highlightFrame={90} />
        <GreenSweep />
        <ExplainOverlay delay={130} />
      </AbsoluteFill>
    </Sequence>

    <Sequence from={320} durationInFrames={130}>
      <EndCard from={0} dur={130} tagline={['Переводим медицину', 'на человеческий']} />
    </Sequence>
  </AbsoluteFill>
);
