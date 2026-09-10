import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, MePhone, EndCard, Sparkle} from './shared';

// Реел B — «Почерк врача». Лёгкий, почти игривый тон.
// Нечитаемый рецепт → снимок → чистое расписание приёма.

const scrawl = '"Snell Roundhand", "Bradley Hand", "Brush Script MT", cursive';

const Squiggle: React.FC<{y: number; w: number; seed: number}> = ({y, w, seed}) => {
  const d = `M0 ${y} C ${w * 0.15} ${y - 14 - seed}, ${w * 0.3} ${y + 12}, ${w * 0.45} ${y - 6}` +
    ` S ${w * 0.7} ${y + 16 + seed}, ${w * 0.85} ${y - 8} S ${w} ${y + 6}, ${w} ${y}`;
  return <path d={d} stroke={T.ink} strokeOpacity={0.72} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
};

const RxPaper: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 200, mass: 1.5}});
  const tilt = interpolate(s, [0, 1], [-7, -3.5]);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 720,
          height: 900,
          background: 'linear-gradient(180deg,#FCFAF3,#F3EEE0)',
          borderRadius: 12,
          padding: '70px 64px',
          boxShadow: '0 50px 120px rgba(20,20,30,0.18)',
          transform: `rotate(${tilt}deg) translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
          opacity: s,
          fontFamily: T.font,
        }}
      >
        <div style={{fontSize: 24, letterSpacing: '0.12em', color: T.ink3}}>
          ГОРОДСКАЯ ПОЛИКЛИНИКА № 7
        </div>
        <div style={{fontSize: 22, color: T.ink3, marginTop: 8}}>Рецептурный бланк · 14.09.2026</div>
        <div style={{height: 2, background: 'rgba(28,33,54,0.12)', margin: '28px 0 44px'}} />
        <div style={{fontFamily: scrawl, fontSize: 52, color: T.ink, lineHeight: 1.9, opacity: 0.82}}>
          Rp: Метформ… 500<br />
          D.t.d. № 60<br />
          S. по 1 т. ✕ 2 р/д
        </div>
        <svg viewBox="0 0 592 260" width="100%" height="220" style={{marginTop: 30}}>
          <Squiggle y={40} w={592} seed={6} />
          <Squiggle y={110} w={520} seed={10} />
          <Squiggle y={180} w={560} seed={4} />
        </svg>
        <div style={{fontFamily: scrawl, fontSize: 40, color: T.ink, opacity: 0.7, marginTop: 20}}>
          врач ??????
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 4, 8, 20], [0, 0.9, 0.3, 0], {extrapolateRight: 'clamp'});
  const shrink = interpolate(f, [0, 18], [1, 0.9], {extrapolateRight: 'clamp'});
  return (
    <>
      <AbsoluteFill style={{transform: `scale(${shrink})`}}>
        <RxPaper />
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#fff', opacity: o}} />
    </>
  );
};

const Day: React.FC<{d: string; delay: number}> = ({d, delay}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
        background: T.bgDeep,
        borderRadius: 22,
        padding: '24px 28px',
        marginTop: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{fontSize: 30, fontWeight: 600, color: T.ink}}>{d}</div>
      <div style={{fontSize: 25, color: T.ink2}}>08:00 · 20:00 · после еды</div>
    </div>
  );
};

const Schedule: React.FC = () => (
  <MePhone delay={4}>
    <div
      style={{
        background: T.surface,
        border: `2px solid ${T.accentSoft}`,
        borderRadius: 24,
        padding: '28px 30px',
        boxShadow: '0 20px 46px rgba(20,20,30,0.10)',
      }}
    >
      <div style={{fontSize: 24, color: T.ink2}}>Распознано по рецепту</div>
      <div style={{fontSize: 38, fontWeight: 700, color: T.ink, marginTop: 6}}>Метформин 500 мг</div>
      <div style={{fontSize: 25, color: T.ink2, marginTop: 6}}>
        по 1 таблетке 2 раза в день, после еды · 30 дней
      </div>
    </div>
    {['Пн', 'Вт', 'Ср'].map((d, i) => (
      <Day key={d} d={d} delay={20 + i * 6} />
    ))}
  </MePhone>
);

export const ReelHandwriting: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={150}>
      <Scene from={0} dur={150}>
        <RxPaper />
        <Caption lines={['Почерк врача.', 'Знакомая загадка']} from={8} dur={128} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={150} durationInFrames={54}>
      <Scene from={0} dur={54}>
        <Flash />
        <Caption lines={['Фото — в «Me»']} from={2} dur={48} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={204} durationInFrames={246}>
      <Scene from={0} dur={246}>
        <Schedule />
        <Caption lines={['Название, доза и курс —', 'разложены по дням']} from={16} dur={226} />
      </Scene>
    </Sequence>

    <Sequence from={450} durationInFrames={120}>
      <EndCard from={0} dur={120} tagline={['В аптеке —', 'без расшифровки иероглифов']} />
    </Sequence>
  </AbsoluteFill>
);
