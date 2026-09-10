import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';
import {Background} from './Background';
import {TextOverlay} from './TextOverlay';
import {AppAnalysis, AppCalendar} from './AppMockup';
import {HumanAvatar} from './HumanAvatar';
import {DocScatter} from './DocScatter';
import {AppFamily} from './AppFamily';

const Fade: React.FC<{children: React.ReactNode; in_: number; out: number; dur: number}> = ({
  children,
  in_,
  out,
  dur,
}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, in_, dur - out, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// Медленный премиальный наезд без дрожи — чистый CSS transform.
const SlowPush: React.FC<{children: React.ReactNode; from: number; to: number; dur: number}> = ({
  children,
  from,
  to,
  dur,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f, fps, durationInFrames: dur, config: {damping: 200, mass: 2}});
  const s = interpolate(p, [0, 1], [from, to]);
  return (
    <AbsoluteFill style={{transform: `scale(${s})`, transformOrigin: '50% 46%'}}>{children}</AbsoluteFill>
  );
};

export const MePromo: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: T.font, background: T.bg}}>
      <Background />

      {/* 1. Хук 0–90 */}
      <Sequence from={0} durationInFrames={96}>
        <Fade in_={20} out={22} dur={96}>
          <SlowPush from={1.10} to={1.0} dur={96}>
            <DocScatter resolveAt={40} />
          </SlowPush>
          <TextOverlay
            lines={['Медицинские анализы —', 'это сложно?']}
            startAt={6}
            endAt={92}
            align="top"
            size={62}
          />
        </Fade>
      </Sequence>

      {/* 2A. Рецепт → календарь 90–210 */}
      <Sequence from={90} durationInFrames={120}>
        <Fade in_={22} out={22} dur={120}>
          <SlowPush from={1.04} to={1.0} dur={120}>
            <AppCalendar />
          </SlowPush>
          <TextOverlay
            lines={['Почерк из рецепта —', 'в понятное расписание']}
            startAt={10}
            endAt={116}
            align="bottom"
            size={54}
          />
        </Fade>
      </Sequence>

      {/* 2B. Аватар, плечо разгорается 210–300 */}
      <Sequence from={210} durationInFrames={90}>
        <Fade in_={22} out={22} dur={90}>
          <HumanAvatar glowAt={26} />
          <TextOverlay
            lines={['Показывает, где именно', 'что-то не так']}
            startAt={8}
            endAt={86}
            align="bottom"
            size={54}
          />
        </Fade>
      </Sequence>

      {/* 3. Подключение мамы 300–390 */}
      <Sequence from={300} durationInFrames={90}>
        <Fade in_={22} out={22} dur={90}>
          <AppFamily />
          <TextOverlay
            lines={['Подключаете маму —', 'ей всё видно крупно и просто']}
            startAt={6}
            endAt={86}
            align="bottom"
            size={50}
          />
        </Fade>
      </Sequence>

      {/* 4. CTA 390–450 */}
      <Sequence from={390} durationInFrames={60}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

const CTA: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 200, mass: 1}});
  const o = interpolate(f, [0, 14, 52, 60], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{alignItems: 'center', justifyContent: 'center', opacity: o}}
    >
      <div
        style={{
          transform: `scale(${interpolate(s, [0, 1], [0.86, 1])})`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: 38,
            background: T.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 44px',
            boxShadow: '0 28px 70px rgba(20,20,30,0.18)',
          }}
        >
          <svg viewBox="0 0 64 64" width="76" height="76">
            <path
              d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z"
              fill="#fff"
            />
          </svg>
        </div>
        <div style={{fontSize: 96, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em'}}>Me</div>
        <div style={{fontSize: 40, color: T.ink2, marginTop: 16, letterSpacing: '-0.01em'}}>
          Пойми своё здоровье
        </div>
      </div>
    </AbsoluteFill>
  );
};
