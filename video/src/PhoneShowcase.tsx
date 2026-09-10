import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

const W = 1080;

const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const drift = interpolate(f, [0, 700], [0, 22]);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg,#FCFAF5 0%,#F0EBDF 100%)'}}>
      <svg width="100%" height="100%" style={{position: 'absolute'}}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={-260 + i * 300 + drift} y1={-120} x2={260 + i * 300 + drift} y2={1300}
            stroke="#1C2136" strokeOpacity={0.045} strokeWidth={2} />
        ))}
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(55% 45% at 50% 46%, rgba(255,255,255,0.75), rgba(255,255,255,0) 70%)'}} />
    </AbsoluteFill>
  );
};

// Телефон виден верхними ~65% — как в референсе, выезжает снизу.
const Phone: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 200, mass: 1.8}});
  const y = interpolate(s, [0, 1], [90, 0]);
  const float = Math.sin(f / 42) * 7;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 348,
      transform: `translateX(-50%) translateY(${y + float}px) perspective(2400px) rotateY(-9deg) rotateX(3deg)`,
      opacity: s,
    }}>
      <div style={{
        width: 560, height: 1000, borderRadius: 72, background: '#0E1220', padding: 14,
        boxShadow: '0 60px 130px rgba(20,20,30,0.22), 0 12px 34px rgba(20,20,30,0.12)',
      }}>
        <div style={{width: '100%', height: '100%', borderRadius: 58, overflow: 'hidden', background: T.bg, position: 'relative', padding: '46px 32px'}}>
          <div style={{position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 150, height: 30, background: '#0E1220', borderRadius: '0 0 18px 18px', zIndex: 5}} />
          <Brand />
          {children}
        </div>
      </div>
    </div>
  );
};

const Brand: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26}}>
    <div style={{width: 44, height: 44, borderRadius: 13, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg viewBox="0 0 64 64" width="26" height="26"><path d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z" fill="#fff" /></svg>
    </div>
    <div style={{fontFamily: T.font, fontSize: 24, fontWeight: 600, color: T.ink}}>Me</div>
  </div>
);

const Card: React.FC<{delay: number; children: React.ReactNode; hi?: boolean; dim?: boolean}> = ({delay, children, hi, dim}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.2}});
  return (
    <div style={{
      opacity: dim ? s * 0.4 : s,
      transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
      background: hi ? '#fff' : T.bgDeep, borderRadius: 24, padding: '24px 26px', marginBottom: 18,
      boxShadow: hi ? '0 18px 44px rgba(20,20,30,0.10)' : 'none',
    }}>{children}</div>
  );
};

const Row: React.FC<{n: string; v: string; r?: string; warn?: boolean}> = ({n, v, r, warn}) => (
  <>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
      <div style={{fontFamily: T.font, fontSize: 28, fontWeight: 600, color: T.ink}}>{n}</div>
      <div style={{fontFamily: T.font, fontSize: 30, fontWeight: 700, color: warn ? T.warn : T.ink}}>{v}</div>
    </div>
    {r && <div style={{fontFamily: T.font, fontSize: 19, color: T.ink3, marginTop: 6}}>{r}</div>}
  </>
);

const ScreenAnalysis: React.FC = () => (
  <>
    <Card delay={8} dim><Row n="Гемоглобин" v="134" r="120 – 150 г/л · норма" /></Card>
    <Card delay={14} hi>
      <Row n="Глюкоза" v="6,4" r="норма 3,9 – 5,9 ммоль/л" warn />
      <div style={{fontFamily: T.font, fontSize: 24, lineHeight: 1.4, color: T.ink, marginTop: 16}}>
        Это <b style={{background: T.accentSoft, padding: '1px 8px', borderRadius: 6}}>не диабет</b>. Чаще всего — кровь сдавали не натощак.
      </div>
    </Card>
    <Card delay={20} dim><Row n="Лимфоциты" v="31 %" r="19 – 37 % · норма" /></Card>
  </>
);

const ScreenCalendar: React.FC = () => (
  <>
    <Card delay={8} hi>
      <div style={{fontFamily: T.font, fontSize: 20, color: T.ink2}}>По рецепту</div>
      <div style={{fontFamily: T.font, fontSize: 32, fontWeight: 700, color: T.ink, marginTop: 4}}>Метформин 500 мг</div>
      <div style={{fontFamily: T.font, fontSize: 21, color: T.ink2, marginTop: 4}}>утром и вечером · 10 дней</div>
    </Card>
    {['Пн', 'Вт', 'Ср', 'Чт'].map((d, i) => (
      <Card key={d} delay={13 + i * 4}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontFamily: T.font, fontSize: 26, fontWeight: 600, color: T.ink}}>{d}</div>
          <div style={{fontFamily: T.font, fontSize: 21, color: T.ink2}}>08:00 · 20:00</div>
        </div>
      </Card>
    ))}
  </>
);

const ScreenFamily: React.FC = () => (
  <>
    <div style={{fontFamily: T.font, fontSize: 26, fontWeight: 600, color: T.ink, marginBottom: 16}}>Близкие</div>
    <Card delay={8} hi>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 54, height: 54, borderRadius: 27, background: 'linear-gradient(160deg,#7BC96F,#38A0A0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26}}>💚</div>
        <div style={{flex: 1}}>
          <div style={{fontFamily: T.font, fontSize: 26, fontWeight: 600, color: T.ink}}>Мама</div>
          <div style={{fontFamily: T.font, fontSize: 19, color: T.accent}}>подключена</div>
        </div>
      </div>
    </Card>
    <Card delay={16}>
      <div style={{fontFamily: T.font, fontSize: 22, color: T.ink2}}>Сегодня</div>
      <div style={{fontFamily: T.font, fontSize: 34, fontWeight: 700, color: T.ink, marginTop: 6}}>Всё в норме</div>
    </Card>
  </>
);

const Caption: React.FC<{lines: string[]; dur: number}> = ({lines, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 8, fps, config: {damping: 200, mass: 1.3}});
  const o = Math.min(s, interpolate(f, [dur - 14, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{position: 'absolute', top: 118, left: 90, right: 90, textAlign: 'center', opacity: o, transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`}}>
      {lines.map((l, i) => (
        <div key={i} style={{fontFamily: T.font, fontWeight: 700, fontSize: 56, lineHeight: 1.18, letterSpacing: '-0.02em', color: T.ink}}>{l}</div>
      ))}
    </div>
  );
};

const Scene: React.FC<{cap: string[]; dur: number; children: React.ReactNode}> = ({cap, dur, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 16, dur - 16, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Phone>{children}</Phone>
      <Caption lines={cap} dur={dur} />
    </AbsoluteFill>
  );
};

export const PhoneShowcase: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <Backdrop />
    <Sequence from={0} durationInFrames={155}><Scene cap={['Непонятный анализ —', 'простыми словами']} dur={155}><ScreenAnalysis /></Scene></Sequence>
    <Sequence from={155} durationInFrames={155}><Scene cap={['Рецепт — в расписание', 'приёма лекарств']} dur={155}><ScreenCalendar /></Scene></Sequence>
    <Sequence from={310} durationInFrames={150}><Scene cap={['Здоровье родителей —', 'под присмотром']} dur={150}><ScreenFamily /></Scene></Sequence>
    <Sequence from={460} durationInFrames={120}><End /></Sequence>
  </AbsoluteFill>
);

const End: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 200}});
  const o = interpolate(f, [0, 16, 104, 120], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: o}}>
      <div style={{textAlign: 'center', transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`}}>
        <div style={{width: 128, height: 128, borderRadius: 40, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 36px', boxShadow: '0 30px 70px rgba(20,20,30,0.16)'}}>
          <svg viewBox="0 0 64 64" width="76" height="76"><path d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z" fill="#fff" /></svg>
        </div>
        <div style={{fontSize: 72, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em'}}>Me</div>
        <div style={{fontSize: 32, color: T.ink2, marginTop: 12}}>Бесплатно в Telegram</div>
        <div style={{fontSize: 28, color: T.accent, marginTop: 22, fontWeight: 600}}>@me_abouthealth_bot</div>
      </div>
    </AbsoluteFill>
  );
};
