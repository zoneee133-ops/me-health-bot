import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Scene, Caption, EndCard} from './shared';

// Реел «Норма с поправкой на пол и возраст». Хук — одна цифра, два разных вердикта.

const MiniRange: React.FC<{
  label: string;
  lo: number;
  hi: number;
  axisMin: number;
  axisMax: number;
  value: number;
  ok: boolean;
  delay: number;
}> = ({label, lo, hi, axisMin, axisMax, value, ok, delay}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  const barW = 640;
  const pos = (v: number) => ((v - axisMin) / (axisMax - axisMin)) * barW;
  const dot = spring({frame: f - delay - 18, fps, config: {damping: 140, mass: 1}});
  const verdictColor = ok ? T.accent : T.warn;

  return (
    <div style={{opacity: s, transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`, marginBottom: 56}}>
      <div style={{fontSize: 30, color: T.ink2, marginBottom: 18}}>{label}</div>
      <div style={{position: 'relative', width: barW, height: 14}}>
        <div style={{position: 'absolute', inset: 0, background: T.line, borderRadius: 7}} />
        <div
          style={{
            position: 'absolute',
            left: pos(lo),
            width: pos(hi) - pos(lo),
            top: 0,
            bottom: 0,
            background: T.accentSoft,
            borderRadius: 7,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: pos(value) - 14,
            top: -13,
            width: 40,
            height: 40,
            borderRadius: 20,
            background: verdictColor,
            opacity: dot,
            transform: `scale(${dot})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {value}
        </div>
      </div>
      <div style={{fontSize: 24, color: verdictColor, fontWeight: 700, marginTop: 34}}>
        {ok ? 'норма' : 'ниже нормы'}
      </div>
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
          marginBottom: 56,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [-16, 0])}px)`,
        }}
      >
        <div style={{fontSize: 40, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em'}}>
          Одинаковая цифра
        </div>
        <div style={{fontSize: 28, color: T.ink2, marginTop: 10}}>в двух бланках — разный вывод</div>
      </div>
      <div>
        <MiniRange label="Мужчина" lo={130} hi={160} axisMin={90} axisMax={170} value={128} ok={false} delay={26} />
        <MiniRange label="Женщина" lo={120} hi={150} axisMin={90} axisMax={170} value={128} ok delay={58} />
      </div>
    </AbsoluteFill>
  );
};

const ReasonsBlock: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 200}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: T.font}}>
      <div
        style={{
          width: 820,
          textAlign: 'center',
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{fontSize: 44, fontWeight: 700, color: T.ink, lineHeight: 1.3, letterSpacing: '-0.02em'}}>
          Референс считают
          <br />
          с поправкой на пол и возраст
        </div>
        <div style={{fontSize: 30, color: T.ink2, marginTop: 30, lineHeight: 1.4}}>
          Сравнивать свой анализ с чужим бланком напрямую не стоит
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ReelRefRange: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={172}>
      <Scene from={0} dur={172}>
        <HookScene />
      </Scene>
    </Sequence>

    <Sequence from={172} durationInFrames={228}>
      <Scene from={0} dur={228}>
        <ReasonsBlock />
      </Scene>
    </Sequence>

    <Sequence from={400} durationInFrames={147}>
      <Scene from={0} dur={147}>
        <Caption lines={['«Me» смотрит именно', 'на ваш диапазон']} from={0} dur={123} align="center" />
      </Scene>
    </Sequence>

    <Sequence from={547} durationInFrames={90}>
      <EndCard from={0} dur={90} tagline={['Ваш диапазон —', 'не чужая таблица']} />
    </Sequence>
  </AbsoluteFill>
);
