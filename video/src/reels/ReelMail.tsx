import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, MePhone, ExplainCard, EndCard} from './shared';

// Реел G — «Анализы приходят сами». Письмо из лаборатории → Me подхватывает → уже с пояснением.
// Лёгкий, необременительный тон. Вымышленные данные.

const Row: React.FC<{from: string; subj: string; delay: number; hot?: boolean; pull?: number}> = ({
  from,
  subj,
  delay,
  hot,
  pull = 0,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  const leave = pull
    ? spring({frame: f - pull, fps, durationInFrames: 40, config: {damping: 200, mass: 1.2}})
    : 0;
  return (
    <div
      style={{
        display: 'flex',
        gap: 22,
        alignItems: 'flex-start',
        padding: '26px 30px',
        borderRadius: 20,
        background: hot ? T.accentSoft : 'transparent',
        borderBottom: `2px solid ${T.line}`,
        opacity: interpolate(s, [0, 1], [0, 1]) * (1 - leave),
        transform: `translateX(${interpolate(s, [0, 1], [26, 0]) + leave * 520}px)`,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          flexShrink: 0,
          background: hot ? T.accent : T.bgDeep,
          color: hot ? '#fff' : T.ink2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 700,
        }}
      >
        {from[0]}
      </div>
      <div style={{flex: 1}}>
        <div style={{fontSize: 26, fontWeight: 600, color: T.ink}}>{from}</div>
        <div style={{fontSize: 24, color: T.ink2, marginTop: 6, lineHeight: 1.4}}>{subj}</div>
      </div>
      {hot ? <div style={{width: 12, height: 12, borderRadius: 6, background: T.accent, marginTop: 8}} /> : null}
    </div>
  );
};

const Inbox: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 4, fps, config: {damping: 200, mass: 1.4}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 860,
          background: T.surface,
          borderRadius: 40,
          padding: '44px 26px',
          boxShadow: '0 40px 90px rgba(20,20,30,0.13)',
          fontFamily: T.font,
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [44, 0])}px)`,
        }}
      >
        <div style={{fontSize: 26, fontWeight: 700, color: T.ink2, padding: '0 30px 22px'}}>
          Входящие
        </div>
        <Row from="Магнитбанк" subj="Выписка по счёту за август" delay={10} />
        <Row
          from="Лаборатория «Аквилон»"
          subj="Результаты готовы: Иванова М. С. от 06.09.2026"
          delay={22}
          hot
          pull={150}
        />
        <Row from="Госуслуги" subj="Запись к врачу подтверждена" delay={34} />
      </div>
    </AbsoluteFill>
  );
};

const Tap: React.FC<{delay: number; label: string; y: number}> = ({delay, label, y}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.1}});
  const press = spring({frame: f - delay - 18, fps, durationInFrames: 22, config: {damping: 120}});
  const done = f > delay + 22;
  return (
    <div
      style={{
        position: 'relative',
        marginTop: y,
        padding: '30px 34px',
        borderRadius: 22,
        border: `2px solid ${done ? T.accent : T.line}`,
        background: done ? T.accentSoft : T.surface,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px) scale(${interpolate(
          press,
          [0, 0.5, 1],
          [1, 0.97, 1],
        )})`,
      }}
    >
      <span style={{fontSize: 30, fontWeight: 600, color: T.ink}}>{label}</span>
      <span style={{fontSize: 30, color: done ? T.accent : T.ink3}}>{done ? '✓' : '›'}</span>
    </div>
  );
};

const Setup: React.FC = () => (
  <MePhone delay={4}>
    <div style={{fontSize: 30, fontWeight: 700, color: T.ink}}>Подключить почту</div>
    <div style={{fontSize: 24, color: T.ink2, marginTop: 8, lineHeight: 1.4}}>
      Один раз — и новые анализы приходят в «Me» сами
    </div>
    <Tap delay={16} label="Gmail" y={28} />
    <Tap delay={70} label="Разрешить доступ к письмам" y={16} />
  </MePhone>
);

export const ReelMail: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={190}>
      <Scene from={0} dur={190}>
        <Inbox />
        <Caption
          lines={['Результаты приходят на почту —', 'и теряются среди писем']}
          from={10}
          dur={176}
          align="bottom"
          size={46}
        />
      </Scene>
    </Sequence>

    <Sequence from={190} durationInFrames={190}>
      <Scene from={0} dur={190}>
        <Setup />
        <Caption lines={['Gmail или Яндекс —', 'два касания, один раз']} from={16} dur={170} />
      </Scene>
    </Sequence>

    <Sequence from={380} durationInFrames={220}>
      <Scene from={0} dur={220}>
        <MePhone delay={4}>
          <ExplainCard
            delay={16}
            name="Гемоглобин"
            val="118 г/л"
            ref="референс 120–150 г/л"
            tone="warn"
            chip="Чуть ниже нормы"
            body={
              <>
                «Me» уже{' '}
                <b style={{background: T.accentSoft, padding: '1px 8px', borderRadius: 6}}>
                  разобрал письмо
                </b>{' '}
                — небольшое снижение часто связано с нехваткой железа и обратимо.
              </>
            }
            note="Ничего вручную вносить не нужно. Показать терапевту — если слабость или снижение повторяется."
          />
        </MePhone>
        <Caption lines={['В приложении — уже', 'с объяснением']} from={16} dur={200} />
      </Scene>
    </Sequence>

    <Sequence from={600} durationInFrames={130}>
      <EndCard from={0} dur={130} tagline={['Анализы приходят сами.', 'Спорное — покажите врачу']} />
    </Sequence>
  </AbsoluteFill>
);
