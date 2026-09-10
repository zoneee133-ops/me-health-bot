import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

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
export const AppAnalysis: React.FC<{scale?: number}> = ({scale}) => (
  <Phone scale={scale}>
    <Card delay={4} dim>
      <Row name="Гемоглобин" val="134" ref="120 – 150 г/л · норма" tone="ok" />
    </Card>
    <Card delay={12} highlight>
      <Row name="Глюкоза" val="6,4" ref="норма 3,9 – 5,9 ммоль/л" tone="warn" />
      <div
        style={{
          fontFamily: T.font,
          fontSize: 30,
          lineHeight: 1.42,
          color: T.ink,
          marginTop: 22,
        }}
      >
        Это <b style={{background: T.accentSoft, padding: '2px 10px', borderRadius: 8}}>не диабет</b>.
        Чаще всего — если кровь сдавали не натощак.
      </div>
      <div style={{fontFamily: T.font, fontSize: 25, lineHeight: 1.42, color: T.ink2, marginTop: 18}}>
        Пересдать утром натощак. Показать терапевту на плановом приёме.
      </div>
    </Card>
    <Card delay={20} dim>
      <Row name="Лимфоциты" val="31 %" ref="19 – 37 % · норма" tone="ok" />
    </Card>
  </Phone>
);

// Экран календаря: рецепт превращается в расписание приёма.
export const AppCalendar: React.FC<{scale?: number}> = ({scale}) => (
  <Phone scale={scale}>
    <Card delay={4} highlight>
      <div style={{fontFamily: T.font, fontSize: 26, color: T.ink2, marginBottom: 6}}>По рецепту</div>
      <div style={{fontFamily: T.font, fontSize: 40, fontWeight: 700, color: T.ink}}>
        Метформин 500 мг
      </div>
      <div style={{fontFamily: T.font, fontSize: 27, color: T.ink2, marginTop: 6}}>
        утром и вечером, после еды · 10 дней
      </div>
    </Card>
    {['Пн', 'Вт', 'Ср', 'Чт'].map((d, i) => (
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
