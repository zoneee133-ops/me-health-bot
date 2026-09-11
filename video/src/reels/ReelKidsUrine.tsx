import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Scene} from './shared';

// Реел «Анализ мочи у ребёнка». Хук сразу на пугающем слове — без разгона.

const RangeScene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lo = 0;
  const hi = 5;
  const target = 9;
  const axisMin = 0;
  const axisMax = 12;
  const barW = 760;

  const titleIn = spring({frame: f - 2, fps, config: {damping: 200}});
  const count = spring({frame: f - 12, fps, durationInFrames: 40, config: {damping: 200}});
  const val = interpolate(count, [0, 1], [lo, target]);
  const pos = (v: number) => ((v - axisMin) / (axisMax - axisMin)) * barW;

  const barIn = spring({frame: f - 2, fps, config: {damping: 200, mass: 1.3}});
  const dot = spring({frame: f - 30, fps, config: {damping: 140, mass: 1}});

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: T.font}}>
      <div
        style={{
          marginTop: -40,
          textAlign: 'center',
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [-16, 0])}px)`,
        }}
      >
        <div style={{fontSize: 44, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em'}}>
          Лейкоциты у ребёнка
        </div>
        <div style={{fontSize: 30, color: T.warn, fontWeight: 600, marginTop: 10}}>
          и вы уже гуглите «инфекция»
        </div>
      </div>
      <div style={{marginTop: 96, opacity: barIn, transform: `translateY(${interpolate(barIn, [0, 1], [30, 0])}px)`}}>
        <div style={{fontSize: 30, color: T.ink2, textAlign: 'center', marginBottom: 40}}>
          В поле зрения, моча
        </div>
        <div style={{position: 'relative', width: barW, height: 14, margin: '0 auto'}}>
          <div style={{position: 'absolute', inset: 0, background: T.line, borderRadius: 7}} />
          <div
            style={{
              position: 'absolute',
              left: pos(lo),
              width: pos(hi) - pos(lo),
              top: 0,
              bottom: 0,
              background: T.accent,
              borderRadius: 7,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: pos(val) - 3,
              top: -22,
              width: 6,
              height: 58,
              background: T.warn,
              borderRadius: 3,
              opacity: dot,
              transform: `scaleY(${dot})`,
              transformOrigin: 'top',
            }}
          />
        </div>
        <div style={{position: 'relative', width: barW, margin: '30px auto 0', height: 40}}>
          <span style={{position: 'absolute', left: pos(lo) - 10, fontSize: 24, color: T.ink3}}>{lo}</span>
          <span style={{position: 'absolute', left: pos(hi) - 10, fontSize: 24, color: T.ink3}}>{hi}</span>
        </div>
        <div style={{textAlign: 'center', marginTop: 40}}>
          <span style={{fontSize: 120, fontWeight: 700, color: T.warn, letterSpacing: '-0.03em'}}>
            {Math.round(val)}
          </span>
        </div>
        <div style={{textAlign: 'center', fontSize: 28, color: T.ink2, marginTop: 10}}>
          выше нормы
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Reason: React.FC<{text: string; delay: number; idx: number}> = ({text, delay, idx}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
        margin: '26px 0',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          border: `3px solid ${T.accent}`,
          color: T.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {idx}
      </div>
      <div style={{fontSize: 42, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em'}}>{text}</div>
    </div>
  );
};

const ReasonsScene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const title = spring({frame: f - 6, fps, config: {damping: 200}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: T.font}}>
      <div style={{width: 820}}>
        <div
          style={{
            fontSize: 34,
            color: T.ink2,
            marginBottom: 30,
            opacity: title,
            transform: `translateY(${interpolate(title, [0, 1], [20, 0])}px)`,
          }}
        >
          Так бывает, когда:
        </div>
        <Reason idx={1} text="баночка постояла" delay={16} />
        <Reason idx={2} text="собрали не первую порцию" delay={44} />
        <Reason idx={3} text="тара была не совсем чистая" delay={72} />
      </div>
    </AbsoluteFill>
  );
};

const ClosingScene: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 6, fps, config: {damping: 200, mass: 1.1}});
  const o = interpolate(f, [0, 16, dur - 24, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.font,
        opacity: o,
        padding: '0 120px',
      }}
    >
      <div style={{textAlign: 'center', transform: `scale(${interpolate(s, [0, 1], [0.92, 1])})`}}>
        <div style={{width: 56, height: 3, borderRadius: 2, background: T.accent, margin: '0 auto 34px'}} />
        <div style={{fontSize: 58, fontWeight: 700, color: T.ink, lineHeight: 1.28, letterSpacing: '-0.02em'}}>
          Пересдайте утром,<br />правильно
        </div>
        <div style={{fontSize: 30, color: T.ink2, marginTop: 30, lineHeight: 1.4}}>
          Держится — покажите педиатру. Разово — обычно просто сбор.
        </div>
        <div style={{fontSize: 30, color: T.accent, marginTop: 40, fontWeight: 600}}>
          @me_abouthealth_bot
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ReelKidsUrine: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />
    <Sequence from={0} durationInFrames={137}>
      <Scene from={0} dur={137}>
        <RangeScene />
      </Scene>
    </Sequence>
    <Sequence from={137} durationInFrames={225}>
      <Scene from={0} dur={225}>
        <ReasonsScene />
      </Scene>
    </Sequence>
    <Sequence from={362} durationInFrames={184}>
      <ClosingScene dur={184} />
    </Sequence>
  </AbsoluteFill>
);
