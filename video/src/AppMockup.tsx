import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';
import {useCopy} from './CopyContext';

const Phone: React.FC<{children: React.ReactNode; scale?: number}> = ({children, scale = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 880,
      transform: `translate(-50%,-50%) scale(${scale})`,
      background: T.surface,
      borderRadius: 56,
      padding: '54px 44px',
      boxShadow: '0 50px 120px rgba(20,20,30,0.16)',
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40}}>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 18,
          background: T.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 64 64" width="34" height="34">
          <path
            d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z"
            fill="#fff"
          />
        </svg>
      </div>
      <div style={{fontFamily: T.font, fontSize: 30, fontWeight: 600, color: T.ink}}>Me</div>
    </div>
    {children}
  </div>
);

const Card: React.FC<{
  delay: number;
  children: React.ReactNode;
  highlight?: boolean;
  dim?: boolean;
}> = ({delay, children, highlight, dim}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  const y = interpolate(s, [0, 1], [40, 0]);
  return (
    <div
      style={{
        opacity: dim ? s * 0.4 : s,
        transform: `translateY(${y}px)`,
        background: highlight ? T.surface : T.bgDeep,
        border: highlight ? `2px solid ${T.warnSoft}` : '2px solid transparent',
        borderRadius: 28,
        padding: '30px 34px',
        marginBottom: 22,
        boxShadow: highlight ? '0 22px 50px rgba(20,20,30,0.10)' : 'none',
      }}
    >
      {children}
    </div>
  );
};

const Row: React.FC<{name: string; val: string; ref?: string; tone?: 'warn' | 'ok'}> = ({
  name,
  val,
  ref: refText,
  tone,
}) => (
  <>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
      <div style={{fontFamily: T.font, fontSize: 34, fontWeight: 600, color: T.ink}}>{name}</div>
      <div
        style={{
          fontFamily: T.font,
          fontSize: 36,
          fontWeight: 700,
          color: tone === 'warn' ? T.warn : T.ink,
        }}
      >
        {val}
      </div>
    </div>
    {refText && (
      <div style={{fontFamily: T.font, fontSize: 23, color: T.ink3, marginTop: 8}}>{refText}</div>
    )}
  </>
);

// Экран разбора анализа: карточки въезжают по пружине, одна подсвечена.
export const AppAnalysis: React.FC<{scale?: number}> = ({scale}) => {
  const c = useCopy().analysis;
  return (
  <Phone scale={scale}>
    <Card delay={4} dim>
      <Row name={c.hb} val="134" ref={c.hbRef} tone="ok" />
    </Card>
    <Card delay={12} highlight>
      <Row name={c.glucose} val="6,4" ref={c.glucoseRef} tone="warn" />
      <div style={{fontFamily: T.font, fontSize: 30, lineHeight: 1.42, color: T.ink, marginTop: 22}}>
        {c.notDiabetesPre}
        <b style={{background: T.accentSoft, padding: '2px 10px', borderRadius: 8}}>{c.notDiabetes}</b>
        {c.notDiabetesPost}
      </div>
      <div style={{fontFamily: T.font, fontSize: 25, lineHeight: 1.42, color: T.ink2, marginTop: 18}}>
        {c.analysisNote}
      </div>
    </Card>
    <Card delay={20} dim>
      <Row name={c.lymph} val="31 %" ref={c.lymphRef} tone="ok" />
    </Card>
  </Phone>
  );
};

// Экран календаря: рецепт превращается в расписание приёма.
export const AppCalendar: React.FC<{scale?: number}> = ({scale}) => {
  const c = useCopy().calendar;
  return (
  <Phone scale={scale}>
    <Card delay={4} highlight>
      <div style={{fontFamily: T.font, fontSize: 26, color: T.ink2, marginBottom: 6}}>{c.byRx}</div>
      <div style={{fontFamily: T.font, fontSize: 40, fontWeight: 700, color: T.ink}}>{c.drug}</div>
      <div style={{fontFamily: T.font, fontSize: 27, color: T.ink2, marginTop: 6}}>{c.dose}</div>
    </Card>
    {c.days.map((d, i) => (
      <Card key={d} delay={12 + i * 5}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontFamily: T.font, fontSize: 30, fontWeight: 600, color: T.ink}}>{d}</div>
          <div style={{display: 'flex', gap: 12}}>
            <span style={{fontFamily: T.font, fontSize: 25, color: T.ink2}}>08:00</span>
            <span style={{fontFamily: T.font, fontSize: 25, color: T.ink2}}>20:00</span>
          </div>
        </div>
      </Card>
    ))}
  </Phone>
  );
};
