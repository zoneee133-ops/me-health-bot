import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, EndCard, MePhone, Sparkle} from './shared';

// Реел «Малыш Ми» — маскот-капсула разбирает хаос медицинского жаргона по кусочкам.
// Нативная анимация в Remotion (spring squash&stretch), без внешних Lottie-файлов.

type Term = {label: string; plain: string; x: number; y: number};

const TERMS: Term[] = [
  {label: 'Лейкоциты ↑', plain: 'Иммунитет воюет с простудой', x: 260, y: 560},
  {label: 'НПВС', plain: 'Обезболивающее', x: 800, y: 780},
  {label: 'QD', plain: '1 раз в день', x: 420, y: 1080},
];

// Тайминги (кадры внутри общей сцены "магии", from=180):
// приезд к термину N, захват, начало следующего перегона.
const ARRIVE = [40, 130, 220];
const CAPTURE_DUR = 20;
const HOME_X = 540;
const HOME_Y = 1500;

const DocShock: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({frame: f, fps: 30, config: {damping: 200, mass: 1.3}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#0A0A0C'}}>
      <div
        style={{
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
          width: 700,
          height: 880,
          background: 'linear-gradient(180deg,#FCFAF3,#F3EEE0)',
          borderRadius: 14,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          padding: '60px 54px',
        }}
      >
        <div style={{fontSize: 26, color: T.ink3, letterSpacing: '0.06em'}}>ВЫПИСКА ИЗ БОЛЬНИЦЫ</div>
        <div style={{height: 2, background: T.line, margin: '26px 0 40px'}} />
        <div style={{fontFamily: T.font, fontSize: 32, color: T.ink2, lineHeight: 2}}>
          Лейкоциты 11.2 ↑<br />
          Rp: НПВС QD<br />
          Гипоэхогенность структуры<br />
          Контроль ч/з 10 дней
        </div>
      </div>
    </AbsoluteFill>
  );
};

const JargonBit: React.FC<{label: string; x: number; y: number; seed: number}> = ({label, x, y, seed}) => {
  const f = useCurrentFrame();
  const shake = Math.sin(f / 3 + seed) * 3;
  const rot = Math.sin(f / 6 + seed) * 8;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) translateX(${shake}px)`,
        background: '#fff',
        padding: '14px 22px',
        borderRadius: 10,
        fontFamily: T.font,
        fontWeight: 700,
        fontSize: 34,
        color: T.bad,
        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
      }}
    >
      {label}
    </div>
  );
};

const ChaosScene: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 15], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#0A0A0C', opacity: o}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, rgba(200,68,58,0.4), #12080A 75%)'}} />
      {TERMS.map((t, i) => (
        <JargonBit key={i} label={t.label} x={t.x} y={t.y} seed={i * 13} />
      ))}
    </AbsoluteFill>
  );
};

// Маскот: капсула-таблетка с глазками, squash&stretch на прыжках.
const Mascot: React.FC<{x: number; y: number; squash: number; wave?: boolean; scale?: number}> = ({
  x,
  y,
  squash,
  wave,
  scale = 1,
}) => {
  const f = useCurrentFrame();
  const blink = Math.sin(f / 14) > 0.96 ? 0.15 : 1;
  const armSwing = wave ? Math.sin(f / 4) * 25 : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${scale}) scaleX(${1 / squash}) scaleY(${squash})`,
      }}
    >
      <div
        style={{
          width: 130,
          height: 180,
          borderRadius: 65,
          background: `linear-gradient(160deg, ${T.accent}, #5F827E)`,
          boxShadow: '0 18px 36px rgba(20,20,30,0.3)',
          position: 'relative',
        }}
      >
        <div style={{position: 'absolute', top: 58, left: 28, width: 22, height: 22 * blink, borderRadius: '50%', background: '#1C2136'}} />
        <div style={{position: 'absolute', top: 58, left: 78, width: 22, height: 22 * blink, borderRadius: '50%', background: '#1C2136'}} />
        <div
          style={{
            position: 'absolute',
            top: 96,
            left: 48,
            width: 34,
            height: 16,
            borderRadius: 12,
            border: '3px solid #1C2136',
            borderTop: 'none',
          }}
        />
        {/* ручка */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            right: -14,
            width: 46,
            height: 14,
            borderRadius: 8,
            background: T.accent,
            transformOrigin: 'left center',
            transform: `rotate(${20 + armSwing}deg)`,
          }}
        />
      </div>
    </div>
  );
};

const Confetti: React.FC<{x: number; y: number; born: number}> = ({x, y, born}) => {
  const f = useCurrentFrame();
  const local = f - born;
  if (local < 0 || local > 22) return null;
  const o = interpolate(local, [0, 4, 18, 22], [0, 1, 1, 0]);
  const s = interpolate(local, [0, 8], [0.3, 1.3], {extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, opacity: o}}>
      <Sparkle size={70} color={T.accent} />
    </div>
  );
};

const ClearedCard: React.FC<{term: Term; index: number; capturedAt: number}> = ({term, index, capturedAt}) => {
  const f = useCurrentFrame();
  const s = spring({frame: f - capturedAt, fps: 30, config: {damping: 200, mass: 1.1}});
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        top: 1160 + index * 130,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
        background: T.surface,
        borderRadius: 20,
        padding: '20px 26px',
        boxShadow: '0 16px 40px rgba(20,20,30,0.12)',
      }}
    >
      <div style={{fontSize: 24, color: T.ink3, textDecoration: 'line-through'}}>{term.label}</div>
      <div style={{fontSize: 28, fontWeight: 700, color: T.ink, marginTop: 4}}>{term.plain}</div>
    </div>
  );
};

const MagicScene: React.FC = () => {
  const f = useCurrentFrame();

  // тон фона: красный -> мятный по мере зачистки терминов
  const cleared = ARRIVE.filter((a) => f > a + CAPTURE_DUR).length;
  const tintProgress = interpolate(cleared, [0, TERMS.length], [0, 1]);
  const red = [200, 68, 58];
  const mint = [126, 154, 151];
  const mix = red.map((c, i) => Math.round(c + (mint[i] - c) * tintProgress));

  // позиция маскота: перегон между точками
  let mx = HOME_X;
  let my = HOME_Y;
  let squash = 1;
  const stops = [
    {x: HOME_X, y: HOME_Y, at: 0},
    ...TERMS.map((t, i) => ({x: t.x, y: t.y, at: ARRIVE[i]})),
    {x: HOME_X, y: HOME_Y - 60, at: ARRIVE[ARRIVE.length - 1] + CAPTURE_DUR + 40},
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (f >= a.at && f <= b.at) {
      const p = interpolate(f, [a.at, b.at], [0, 1], {extrapolateRight: 'clamp'});
      mx = interpolate(p, [0, 1], [a.x, b.x]);
      my = interpolate(p, [0, 1], [a.y, b.y]) - Math.sin(p * Math.PI) * 120;
      squash = 1 + Math.sin(p * Math.PI) * 0.25;
    } else if (f > b.at) {
      mx = b.x;
      my = b.y;
    }
  }
  // пружинный "поп" в момент захвата
  ARRIVE.forEach((a) => {
    const local = f - a;
    if (local >= 0 && local < CAPTURE_DUR) {
      squash = 1 - Math.sin((local / CAPTURE_DUR) * Math.PI) * 0.35;
    }
  });

  return (
    <AbsoluteFill style={{background: `rgb(${mix[0]},${mix[1]},${mix[2]})`}}>
      <AbsoluteFill style={{background: '#0A0A0C', opacity: 0.55}} />
      {TERMS.map((t, i) => {
        const captured = f > ARRIVE[i] + CAPTURE_DUR;
        if (captured) return <ClearedCard key={i} term={t} index={i} capturedAt={ARRIVE[i] + CAPTURE_DUR} />;
        return <JargonBit key={i} label={t.label} x={t.x} y={t.y} seed={i * 13} />;
      })}
      {ARRIVE.map((a, i) => (
        <Confetti key={i} x={TERMS[i].x} y={TERMS[i].y} born={a} />
      ))}
      <Mascot x={mx} y={my} squash={squash} />
    </AbsoluteFill>
  );
};

const FinaleUI: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({frame: f, fps: 30, config: {damping: 200, mass: 1.2}});
  return (
    <AbsoluteFill style={{background: T.bg}}>
      <MePhone delay={0}>
        <div style={{opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`}}>
          <div style={{background: T.accentSoft, borderRadius: 22, padding: '26px 28px'}}>
            <div style={{fontSize: 24, color: T.ink2}}>Расписано за тебя</div>
            <div style={{fontSize: 32, fontWeight: 700, color: T.ink, marginTop: 6}}>НПВС — 1 раз в день</div>
          </div>
          <div
            style={{
              background: '#1C2136',
              borderRadius: 20,
              padding: '20px 26px',
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{position: 'relative', width: 44, height: 60, flexShrink: 0, overflow: 'visible'}}>
              <Mascot x={22} y={30} squash={1} wave scale={0.34} />
            </div>
            <div style={{fontSize: 26, color: '#EAF1F7', fontWeight: 600}}>
              Время принять таблетку 💊
            </div>
          </div>
        </div>
      </MePhone>
    </AbsoluteFill>
  );
};

const FamilyBonus: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({frame: f, fps: 30, config: {damping: 200, mass: 1.2}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: T.bg}}>
      <div
        style={{
          position: 'relative',
          width: 200,
          height: 260,
          opacity: s,
          transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
        }}
      >
        <Mascot x={100} y={130} squash={1} wave />
      </div>
    </AbsoluteFill>
  );
};

export const ReelMascot: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={60}>
      <DocShock />
      <Caption lines={['Когда прочитал диагноз', 'в 2 часа ночи…']} from={10} dur={48} align="top" scrim={false} dark />
    </Sequence>

    <Sequence from={60} durationInFrames={120}>
      <ChaosScene />
    </Sequence>

    <Sequence from={180} durationInFrames={300}>
      <MagicScene />
    </Sequence>

    <Sequence from={480} durationInFrames={130}>
      <FinaleUI />
      <Caption lines={['Me переводит с врачебного', 'на человеческий']} from={90} dur={40} align="top" />
    </Sequence>

    <Sequence from={610} durationInFrames={80}>
      <FamilyBonus />
      <Caption lines={['Отправь маме —', 'ей тоже нужен Ми']} from={10} dur={65} align="bottom" />
    </Sequence>

    <Sequence from={690} durationInFrames={130}>
      <EndCard from={0} dur={130} tagline={['Малыш Ми.', 'Серия 1: рецепт']} />
    </Sequence>
  </AbsoluteFill>
);
