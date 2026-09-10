import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, MePhone, EndCard} from './shared';

// Реел F — «Приём у врача за 7 минут». Хаос бумаг → один чистый отчёт → взгляд врача.
// Спокойный, компетентный тон. Вымышленные данные.

const slips = [
  {t: 'Биохимия · 2023', x: -150, y: -260, r: -11},
  {t: 'ОАК · 2024', x: 180, y: -170, r: 8},
  {t: 'Гормоны ЩЖ · 2024', x: -210, y: 40, r: -6},
  {t: 'Липиды · 2025', x: 140, y: 150, r: 13},
  {t: 'HbA1c · 2025', x: -70, y: 300, r: -9},
  {t: 'ОАК · 2026', x: 200, y: 330, r: 5},
];

// Хаотичная стопка старых бланков, которая затем «схлопывается» к центру.
const Stack: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const collapse = spring({frame: f - 150, fps, durationInFrames: 60, config: {damping: 200, mass: 1.4}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      {slips.map((s, i) => {
        const inn = spring({frame: f - 6 - i * 5, fps, config: {damping: 200, mass: 1.2}});
        const x = interpolate(collapse, [0, 1], [s.x, 0]);
        const y = interpolate(collapse, [0, 1], [s.y, 0]);
        const r = interpolate(collapse, [0, 1], [s.r, 0]);
        const op = interpolate(collapse, [0, 1], [1, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 420,
              padding: '34px 36px',
              background: 'linear-gradient(180deg,#FCFAF3,#F1ECDD)',
              borderRadius: 14,
              boxShadow: '0 26px 60px rgba(20,20,30,0.16)',
              fontFamily: T.font,
              opacity: Math.min(inn, op),
              transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${interpolate(
                inn,
                [0, 1],
                [0.9, 1],
              )})`,
            }}
          >
            <div style={{fontSize: 26, fontWeight: 700, color: T.ink}}>{s.t}</div>
            <div style={{height: 8, width: '70%', background: T.line, borderRadius: 4, marginTop: 18}} />
            <div style={{height: 8, width: '52%', background: T.line, borderRadius: 4, marginTop: 12}} />
            <div style={{height: 8, width: '61%', background: T.line, borderRadius: 4, marginTop: 12}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Block: React.FC<{title: string; delay: number; children: React.ReactNode}> = ({
  title,
  delay,
  children,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
        marginTop: 22,
      }}
    >
      <div style={{fontSize: 22, fontWeight: 600, color: T.accent, letterSpacing: '0.04em'}}>
        {title}
      </div>
      <div style={{marginTop: 12}}>{children}</div>
    </div>
  );
};

const Report: React.FC<{doctor?: boolean}> = ({doctor}) => (
  <MePhone delay={4}>
    <div
      style={{
        background: T.surface,
        border: `2px solid ${T.accentSoft}`,
        borderRadius: 24,
        padding: '30px 32px',
        boxShadow: '0 22px 50px rgba(20,20,30,0.10)',
      }}
    >
      <div style={{fontSize: 30, fontWeight: 700, color: T.ink}}>
        {doctor ? 'Что нужно врачу' : 'Отчёт к приёму'}
      </div>
      <div style={{fontSize: 22, color: T.ink3, marginTop: 6}}>Соколов А. В., 58 лет · терапевт</div>

      <Block title="ДИНАМИКА" delay={doctor ? 4 : 24}>
        {[
          ['Глюкоза', '5,4 → 5,8 → 6,1 ммоль/л'],
          ['Холестерин ЛПНП', '4,1 → 3,6 → 3,4 ммоль/л'],
          ['ТТГ', '3,0 → 2,7 мЕд/л'],
        ].map(([k, v]) => (
          <div key={k} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0'}}>
            <span style={{fontSize: 25, color: T.ink}}>{k}</span>
            <span style={{fontSize: 24, color: T.ink2, fontVariantNumeric: 'tabular-nums'}}>{v}</span>
          </div>
        ))}
      </Block>

      <Block title="ЛЕКАРСТВА" delay={doctor ? 8 : 34}>
        <div style={{fontSize: 25, color: T.ink, lineHeight: 1.5}}>
          Аторвастатин 20 мг — вечер · Эутирокс 50 мкг — утро
        </div>
      </Block>

      <Block title="ЖАЛОБЫ" delay={doctor ? 12 : 44}>
        <div style={{fontSize: 25, color: T.ink, lineHeight: 1.5}}>
          Одышка при подъёме на 3-й этаж, 2 месяца. Отёки голеней к вечеру.
        </div>
      </Block>
    </div>
  </MePhone>
);

export const ReelReport: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={210}>
      <Scene from={0} dur={210}>
        <Stack />
        <Caption
          lines={['Стопка старых бланков.', 'На приём — семь минут']}
          from={10}
          dur={196}
          align="bottom"
        />
      </Scene>
    </Sequence>

    <Sequence from={210} durationInFrames={260}>
      <Scene from={0} dur={260}>
        <Report />
        <Caption lines={['«Me» собирает их', 'в один лист']} from={16} dur={240} />
      </Scene>
    </Sequence>

    <Sequence from={470} durationInFrames={150}>
      <Scene from={0} dur={150}>
        <Report doctor />
        <Caption lines={['Врач видит главное сразу']} from={12} dur={134} />
      </Scene>
    </Sequence>

    <Sequence from={620} durationInFrames={150}>
      <EndCard from={0} dur={150} tagline={['Приём — по делу.', 'Лист можно показать врачу']} />
    </Sequence>
  </AbsoluteFill>
);
