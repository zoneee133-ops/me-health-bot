import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Scene, Caption, EndCard} from './shared';

// Реел «Чекап перед спортом». Хук — знакомая ситуация с тренером + визуальный ребус из аббревиатур.

const Chip: React.FC<{label: string; delay: number; x: number}> = ({label, delay, x}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 160, mass: 0.9}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) scale(${interpolate(s, [0, 1], [0.85, 1])})`,
        background: '#fff',
        boxShadow: '0 10px 26px rgba(28,33,54,0.10)',
        borderRadius: 20,
        padding: '18px 30px',
        fontSize: 34,
        fontWeight: 700,
        color: T.ink,
        border: `2px solid ${T.accentSoft}`,
      }}
    >
      {label}
    </div>
  );
};

const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = spring({frame: f - 2, fps, config: {damping: 200}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: T.font}}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: 80,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [-16, 0])}px)`,
        }}
      >
        <div style={{fontSize: 42, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em'}}>
          Тренер попросил
        </div>
        <div style={{fontSize: 42, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em'}}>
          анализы перед залом
        </div>
      </div>
      <div style={{position: 'relative', width: 700, height: 110}}>
        <Chip label="Fe" delay={30} x={0} />
        <Chip label="КФК" delay={44} x={190} />
        <Chip label="СОЭ" delay={58} x={410} />
        <Chip label="Электролиты" delay={72} x={40} />
      </div>
      <div
        style={{
          marginTop: 260,
          fontSize: 30,
          color: T.warn,
          fontWeight: 600,
          opacity: spring({frame: f - 90, fps, config: {damping: 200}}),
        }}
      >
        и бланк — ребус из аббревиатур
      </div>
    </AbsoluteFill>
  );
};

export const ReelSportCheckup: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={147}>
      <Scene from={0} dur={147}>
        <HookScene />
      </Scene>
    </Sequence>

    <Sequence from={147} durationInFrames={200}>
      <Scene from={0} dur={200}>
        <Caption lines={['Смотрят не только', 'на общий анализ']} from={0} dur={90} align="top" scrim={false} />
        <Caption
          lines={['Важно — как организм', 'переносит нагрузку в принципе']}
          from={78}
          dur={122}
          align="center"
        />
      </Scene>
    </Sequence>

    <Sequence from={347} durationInFrames={171}>
      <Scene from={0} dur={171}>
        <Caption lines={['Разобрать бланк —', 'не проблема']} from={0} dur={80} align="top" scrim={false} />
        <Caption
          lines={['А вот приступать к нагрузке', 'или нет — решает врач']}
          from={70}
          dur={101}
          align="center"
          tone={T.warn}
        />
      </Scene>
    </Sequence>

    <Sequence from={518} durationInFrames={90}>
      <EndCard from={0} dur={90} tagline={['Бланк прочитать просто.', 'Решение — за врачом']} />
    </Sequence>
  </AbsoluteFill>
);
