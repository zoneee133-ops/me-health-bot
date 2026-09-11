import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Scene, Caption, EndCard} from './shared';

// Реел «Норма у ребёнка — не как у взрослого». Хук — та же цифра, два разных вердикта.

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
          Один и тот же гемоглобин
        </div>
        <div style={{fontSize: 28, color: T.ink2, marginTop: 10}}>в двух разных бланках</div>
      </div>
      <div>
        <MiniRange label="Взрослый" lo={130} hi={160} axisMin={90} axisMax={170} value={118} ok={false} delay={26} />
        <MiniRange label="Ребёнок, 3 года" lo={110} hi={140} axisMin={90} axisMax={170} value={118} ok delay={58} />
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
          У детей нормы меняются
          <br />
          почти для каждого возраста
        </div>
        <div style={{fontSize: 30, color: T.ink2, marginTop: 30, lineHeight: 1.4}}>
          То, что тревожно у взрослого — у трёхлетнего ребёнка обычное значение
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ReelKidsAgeNorms: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={191}>
      <Scene from={0} dur={191}>
        <HookScene />
      </Scene>
    </Sequence>

    <Sequence from={191} durationInFrames={232}>
      <Scene from={0} dur={232}>
        <ReasonsBlock />
      </Scene>
    </Sequence>

    <Sequence from={423} durationInFrames={130}>
      <Scene from={0} dur={130}>
        <Caption
          lines={['«Me» смотрит на возраст', 'ребёнка и объясняет бланк']}
          from={0}
          dur={106}
          align="center"
        />
      </Scene>
    </Sequence>

    <Sequence from={553} durationInFrames={90}>
      <EndCard from={0} dur={90} tagline={['Возраст ребёнка — не мелочь.', 'Мы его учитываем']} />
    </Sequence>
  </AbsoluteFill>
);
