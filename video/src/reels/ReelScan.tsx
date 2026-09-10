import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, MePhone, EndCard} from './shared';

// Реел H — «МРТ: половина слов непонятна». Заключение с жаргоном → 2 простые фразы.
// Успокаивающий, но аккуратный тон. Вымышленные данные.

const Conclusion: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 200, mass: 1.5}});
  // ко второй сцене — лёгкий наезд на выделенный термин
  const zoom = spring({frame: f - 210, fps, durationInFrames: 70, config: {damping: 200, mass: 1.6}});
  const scale = interpolate(zoom, [0, 1], [1, 1.32]);
  const ty = interpolate(zoom, [0, 1], [0, -40]);
  const glossO = interpolate(f, [250, 275], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mark = interpolate(f, [40, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 760,
          background: 'linear-gradient(180deg,#FCFAF3,#F3EEE0)',
          borderRadius: 14,
          padding: '64px 60px',
          boxShadow: '0 50px 120px rgba(20,20,30,0.18)',
          fontFamily: T.font,
          opacity: s,
          transform: `scale(${scale}) translateY(${interpolate(s, [0, 1], [46, 0]) + ty}px)`,
          transformOrigin: '50% 44%',
        }}
      >
        <div style={{fontSize: 24, letterSpacing: '0.12em', color: T.ink3}}>
          МРТ ПОЯСНИЧНОГО ОТДЕЛА · ЗАКЛЮЧЕНИЕ
        </div>
        <div style={{fontSize: 22, color: T.ink3, marginTop: 8}}>Тихонов Р. А., 47 лет · 08.09.2026</div>
        <div style={{height: 2, background: 'rgba(28,33,54,0.12)', margin: '30px 0 34px'}} />
        <div style={{fontSize: 34, lineHeight: 1.62, color: T.ink}}>
          МР-картина{' '}
          <span
            style={{
              background: `rgba(126,154,151,${0.32 * mark})`,
              borderRadius: 6,
              padding: '2px 6px',
              boxDecorationBreak: 'clone',
              WebkitBoxDecorationBreak: 'clone',
            }}
          >
            дегенеративно-дистрофических изменений
          </span>{' '}
          пояснично-крестцового отдела. Циркулярная протрузия диска L5–S1 до 3&nbsp;мм без
          компрессии корешков. Признаков спондилолистеза не выявлено.
        </div>
        <div
          style={{
            fontSize: 27,
            color: '#3E6B66',
            marginTop: 26,
            fontWeight: 600,
            opacity: glossO,
            transform: `translateY(${interpolate(glossO, [0, 1], [12, 0])}px)`,
          }}
        >
          → возрастной износ хрящей и межпозвонковых дисков
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PlainBlock: React.FC<{tag: string; delay: number; children: React.ReactNode; tone?: string}> = ({
  tag,
  delay,
  children,
  tone = T.accent,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
        borderLeft: `3px solid ${tone}`,
        padding: '4px 0 4px 22px',
        marginTop: 26,
      }}
    >
      <div style={{fontSize: 21, fontWeight: 700, color: tone, letterSpacing: '0.05em'}}>{tag}</div>
      <div style={{fontSize: 29, lineHeight: 1.44, color: T.ink, marginTop: 10}}>{children}</div>
    </div>
  );
};

const Plain: React.FC = () => (
  <MePhone delay={4}>
    <div style={{fontSize: 30, fontWeight: 700, color: T.ink}}>Заключение МРТ · простыми словами</div>
    <PlainBlock tag="ЧТО НАШЛИ" delay={16}>
      Возрастные изменения в пояснице и небольшое выпячивание одного диска (3 мм). Нервные корешки
      не сдавлены.
    </PlainBlock>
    <PlainBlock tag="ЧТО ЭТО ОБЫЧНО ЗНАЧИТ" delay={34}>
      Частая находка после 40 лет. У многих людей с такой картиной спина не болит вовсе.
    </PlainBlock>
    <PlainBlock tag="КОГДА НУЖЕН ВРАЧ" delay={52} tone={T.warn}>
      Если есть боль, отдающая в ногу, онемение или слабость в стопе — покажите снимок неврологу.
    </PlainBlock>
  </MePhone>
);

export const ReelScan: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={430}>
      <Scene from={0} dur={430}>
        <Conclusion />
        <Caption
          lines={['Заключение МРТ.', 'Половина слов — непонятна']}
          from={12}
          dur={176}
          align="bottom"
        />
        <Caption
          lines={['«Дегенеративно-дистрофические» —', 'это про возрастной износ']}
          from={220}
          dur={200}
          align="bottom"
          tone={T.warn}
          size={44}
        />
      </Scene>
    </Sequence>

    <Sequence from={430} durationInFrames={210}>
      <Scene from={0} dur={210}>
        <Plain />
        <Caption lines={['Что нашли, что значит,', 'когда к врачу']} from={16} dur={190} />
      </Scene>
    </Sequence>

    <Sequence from={640} durationInFrames={170}>
      <EndCard from={0} dur={170} tagline={['С болью или онемением —', 'покажите снимок врачу']} />
    </Sequence>
  </AbsoluteFill>
);
