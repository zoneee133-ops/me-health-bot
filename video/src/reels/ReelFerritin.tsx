import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, LabForm, MePhone, ExplainCard, EndCard} from './shared';

// Реел E — «Устал, а анализы в норме». Гемоглобин в норме, ферритин низкий.
// Спокойный, поясняющий тон. Вымышленные лаба и пациент.

const FerritinForm: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // мягкий наезд на строку ферритина (последняя)
  const push = spring({frame: f - 150, fps, durationInFrames: 96, config: {damping: 200, mass: 1.6}});
  const scale = interpolate(push, [0, 1], [1, 1.5]);
  const ty = interpolate(push, [0, 1], [0, -70]);
  return (
    <AbsoluteFill style={{transform: `scale(${scale}) translateY(${ty}px)`, transformOrigin: '52% 72%'}}>
      <LabForm
        lab="ЛАБ. «АКВИЛОН»"
        patient="Морозова Е. П., 41 г."
        date="03.09.2026"
        revealFlagAt={34}
        rows={[
          {name: 'Гемоглобин', val: '128 г/л', ref: '120–150'},
          {name: 'Эритроциты', val: '4,4', ref: '3,9–5,0'},
          {name: 'MCV', val: '82 фл', ref: '80–100'},
          {name: 'Ферритин', val: '9 нг/мл', ref: '30–150', flag: true, low: true},
        ]}
      />
    </AbsoluteFill>
  );
};

export const ReelFerritin: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={380}>
      <Scene from={0} dur={380}>
        <FerritinForm />
        <Caption
          lines={['Анализы «в норме» —', 'а сил нет']}
          from={10}
          dur={130}
          align="top"
          scrim={false}
        />
        <Caption
          lines={['Гемоглобин держится.', 'А запас железа — на нуле']}
          from={196}
          dur={176}
          align="bottom"
          tone={T.warn}
        />
      </Scene>
    </Sequence>

    <Sequence from={380} durationInFrames={220}>
      <Scene from={0} dur={220}>
        <MePhone delay={4}>
          <ExplainCard
            delay={16}
            name="Ферритин"
            val="9 нг/мл"
            ref="референс 30–150 нг/мл"
            chip="Запас железа в организме"
            tone="warn"
            body={
              <>
                Ферритин показывает, сколько железа отложено «про запас». Он{' '}
                <b style={{background: T.accentSoft, padding: '1px 8px', borderRadius: 6}}>
                  падает первым
                </b>{' '}
                — задолго до того, как снизится гемоглобин.
              </>
            }
            note="Отсюда усталость при «нормальном» общем анализе. Показать терапевту — обсудить причину и приём железа."
          />
        </MePhone>
        <Caption lines={['«Норма» — это ещё', 'не вся картина']} from={16} dur={200} />
      </Scene>
    </Sequence>

    <Sequence from={600} durationInFrames={130}>
      <EndCard from={0} dur={130} tagline={['Спросите врача', 'про ферритин']} />
    </Sequence>
  </AbsoluteFill>
);
