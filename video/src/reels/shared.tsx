import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';

// Тёплый премиальный фон с очень медленным дыханием (как Background, но самостоятельный).
export const ReelBg: React.FC = () => {
  const f = useCurrentFrame();
  const shift = interpolate(f, [0, 600], [0, 4], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{background: `linear-gradient(${168 + shift}deg, ${T.bg} 0%, ${T.bgDeep} 100%)`}}
    />
  );
};

// Нижний градиентный скрим — мягкая подложка под подпись, без тяжёлой плашки.
const Scrim: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 620,
      background: `linear-gradient(to top, ${T.bg} 4%, rgba(245,241,232,0.86) 34%, rgba(245,241,232,0) 100%)`,
    }}
  />
);

// Премиальная подпись: тонкая линия-акцент + текст средней насыщенности.
// scrim по умолчанию включён; можно выключить для типографских сцен.
export const Caption: React.FC<{
  lines: string[];
  from: number;
  dur: number;
  size?: number;
  align?: 'bottom' | 'center' | 'top';
  scrim?: boolean;
  tone?: string;
  dark?: boolean;
}> = ({lines, from, dur, size = 52, align = 'bottom', scrim = true, tone = T.accent, dark = false}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = f - from;
  const enter = spring({frame: local, fps, config: {damping: 200, mass: 1.3}});
  const exit = interpolate(f, [from + dur - 16, from + dur], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const o = Math.min(enter, exit);
  const y = interpolate(enter, [0, 1], [22, 0]);

  const pos: React.CSSProperties =
    align === 'bottom'
      ? {bottom: 190}
      : align === 'top'
        ? {top: 210}
        : {top: '50%', transform: 'translateY(-50%)'};

  return (
    <>
      {scrim && align === 'bottom' && <div style={{opacity: o}}><Scrim /></div>}
      <div style={{position: 'absolute', left: 110, right: 110, textAlign: 'center', opacity: o, ...pos}}>
        <div
          style={{
            width: 56,
            height: 3,
            borderRadius: 2,
            background: tone,
            margin: '0 auto 26px',
            transform: `translateY(${y}px) scaleX(${0.4 + 0.6 * enter})`,
          }}
        />
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: T.font,
              fontWeight: 600,
              fontSize: size,
              lineHeight: 1.32,
              letterSpacing: '-0.015em',
              color: dark ? '#EAF1F7' : T.ink,
              transform: `translateY(${y}px)`,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </>
  );
};

// Сцена с общим fade in/out по краям.
export const Scene: React.FC<{from: number; dur: number; children: React.ReactNode}> = ({
  from,
  dur,
  children,
}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [from, from + 14, from + dur - 14, from + dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Sparkle: React.FC<{size: number; color?: string}> = ({size, color = '#fff'}) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <path
      d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z"
      fill={color}
    />
  </svg>
);

// Финальная карточка: знак-искра, «Me», подзаголовок, хендл бота.
export const EndCard: React.FC<{from: number; dur: number; tagline: string[]}> = ({
  from,
  dur,
  tagline,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - from, fps, config: {damping: 200, mass: 1}});
  const o = interpolate(f, [from, from + 16, from + dur - 16, from + dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: o}}>
      <div style={{textAlign: 'center', transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`}}>
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: 38,
            background: T.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 40px',
            boxShadow: '0 28px 68px rgba(20,20,30,0.18)',
          }}
        >
          <Sparkle size={74} />
        </div>
        {tagline.map((l, i) => (
          <div
            key={i}
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: T.ink,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
            }}
          >
            {l}
          </div>
        ))}
        <div style={{fontSize: 34, color: T.ink2, marginTop: 26}}>Бесплатно в Telegram</div>
        <div style={{fontSize: 32, color: T.accent, marginTop: 12, fontWeight: 600}}>
          @me_abouthealth_bot
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Фиктивный бланк лаборатории. Вымышленные лаба и пациент.
export const LabForm: React.FC<{
  lab: string;
  patient: string;
  date: string;
  rows: {name: string; val: string; ref: string; flag?: boolean; low?: boolean}[];
  revealFlagAt?: number;
}> = ({lab, patient, date, rows, revealFlagAt = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 200, mass: 1.4}});
  const flagPulse = spring({frame: f - revealFlagAt, fps, config: {damping: 120, mass: 1}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 812,
          background: T.surface,
          borderRadius: 24,
          padding: '64px 66px',
          boxShadow: '0 40px 90px rgba(20,20,30,0.13)',
          transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
          opacity: s,
          fontFamily: T.font,
        }}
      >
        <div style={{fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: '0.04em'}}>{lab}</div>
        <div style={{fontSize: 23, color: T.ink3, marginTop: 10}}>
          {patient} · {date}
        </div>
        <div style={{height: 2, background: T.line, margin: '34px 0 10px'}} />
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '26px 0',
              borderBottom: `2px solid ${T.line}`,
            }}
          >
            <div style={{flex: 1}}>
              <div style={{fontSize: 30, fontWeight: 600, color: T.ink}}>{r.name}</div>
              <div style={{fontSize: 21, color: T.ink3, marginTop: 6}}>реф. {r.ref}</div>
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: r.flag ? (r.low ? T.warn : T.bad) : T.ink,
                background: r.flag
                  ? r.low
                    ? `rgba(169,128,60,${0.07 + 0.11 * flagPulse})`
                    : `rgba(200,68,58,${0.06 + 0.1 * flagPulse})`
                  : 'transparent',
                padding: '6px 16px',
                borderRadius: 10,
              }}
            >
              {r.val}
              {r.flag ? (r.low ? '  ↓' : '  ↑') : ''}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Экран приложения «Me»: белая карточка-телефон с шапкой-брендом.
export const MePhone: React.FC<{children: React.ReactNode; delay?: number}> = ({
  children,
  delay = 0,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.4}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 860,
          background: T.surface,
          borderRadius: 52,
          padding: '52px 44px',
          boxShadow: '0 40px 90px rgba(20,20,30,0.13)',
          transform: `translateY(${interpolate(s, [0, 1], [46, 0])}px) scale(${interpolate(
            s,
            [0, 1],
            [0.96, 1],
          )})`,
          opacity: s,
          fontFamily: T.font,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 34}}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 17,
              background: T.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkle size={33} />
          </div>
          <div style={{fontSize: 29, fontWeight: 600, color: T.ink}}>Me</div>
        </div>
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const ExplainCard: React.FC<{
  delay: number;
  name: string;
  val: string;
  ref: string;
  chip: string;
  body: React.ReactNode;
  note?: string;
  tone?: 'warn' | 'bad';
}> = ({delay, name, val, ref: refText, chip, body, note, tone = 'warn'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.2}});
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [34, 0])}px)`,
        background: T.surface,
        border: `2px solid ${tone === 'bad' ? T.badSoft : T.warnSoft}`,
        borderRadius: 26,
        padding: '32px 34px',
        boxShadow: '0 22px 50px rgba(20,20,30,0.10)',
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <div style={{fontSize: 34, fontWeight: 600, color: T.ink}}>{name}</div>
        <div style={{fontSize: 36, fontWeight: 700, color: tone === 'bad' ? T.bad : T.warn}}>
          {val}
        </div>
      </div>
      <div style={{fontSize: 22, color: T.ink3, marginTop: 8}}>{refText}</div>
      <div
        style={{
          display: 'inline-block',
          fontSize: 22,
          fontWeight: 600,
          padding: '9px 18px',
          borderRadius: 999,
          background: T.accentSoft,
          color: '#3E6B66',
          marginTop: 22,
        }}
      >
        {chip}
      </div>
      <div style={{fontSize: 29, lineHeight: 1.44, color: T.ink, marginTop: 22}}>{body}</div>
      {note && (
        <div style={{fontSize: 24, lineHeight: 1.44, color: T.ink2, marginTop: 18}}>{note}</div>
      )}
    </div>
  );
};
