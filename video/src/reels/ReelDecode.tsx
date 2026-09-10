import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, LabForm, MePhone, ExplainCard, EndCard} from './shared';

// Реел A — «Расшифровка за 10 секунд». Паника → ясность → облегчение.
// Быстрые монтажные склейки допустимы.

const PanicForm: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // мягкий наезд на красную строку (3-я из 4)
  const push = spring({frame: f - 150, fps, durationInFrames: 90, config: {damping: 200, mass: 1.6}});
  const scale = interpolate(push, [0, 1], [1, 1.85]);
  const ty = interpolate(push, [0, 1], [0, -60]);
  return (
    <AbsoluteFill style={{transform: `scale(${scale}) translateY(${ty}px)`, transformOrigin: '52% 60%'}}>
      <LabForm
        lab="ЛАБ. «ГЕМОСВЕТ»"
        patient="Кравцова Н. И., 34 г."
        date="14.09.2026"
        revealFlagAt={30}
        rows={[
          {name: 'Гемоглобин', val: '131 г/л', ref: '120–150'},
          {name: 'Лейкоциты', val: '6,1', ref: '4,0–9,0'},
          {name: 'СОЭ', val: '24 мм/ч', ref: '2–15', flag: true},
          {name: 'Тромбоциты', val: '268', ref: '180–360'},
        ]}
      />
    </AbsoluteFill>
  );
};

export const ReelDecode: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={210}>
      <Scene from={0} dur={210}>
        <PanicForm />
        <Caption lines={['Одна строка —', 'красным']} from={8} dur={132} align="top" scrim={false} tone={T.bad} />
      </Scene>
    </Sequence>

    <Sequence from={210} durationInFrames={240}>
      <Scene from={0} dur={240}>
        <MePhone delay={4}>
          <ExplainCard
            delay={16}
            name="СОЭ"
            val="24 мм/ч"
            ref="референс 2–15 мм/ч"
            chip="Чаще всего — не про тяжёлую болезнь"
            body={
              <>
                СОЭ поднимается почти при любом воспалении — даже после недавней{' '}
                <b style={{background: T.accentSoft, padding: '1px 8px', borderRadius: 6}}>простуды</b>.
                Само по себе это не диагноз.
              </>
            }
            note="Пересдать через 2–3 недели. Показать терапевту вместе с симптомами и осмотром."
          />
        </MePhone>
        <Caption lines={['«Me» объясняет строку', 'простым языком']} from={14} dur={220} />
      </Scene>
    </Sequence>

    <Sequence from={450} durationInFrames={120}>
      <EndCard from={0} dur={120} tagline={['Расшифровка —', 'за 10 секунд']} />
    </Sequence>
  </AbsoluteFill>
);
