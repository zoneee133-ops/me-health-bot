import {AbsoluteFill, Sequence} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, EndCard} from './shared';
import {RxPaper, Flash, Schedule} from './ReelHandwriting';

// Реел B3 — тот же проверенный формат, хук через цифру (сильнее цепляет с первого кадра).

export const ReelHandwriting3: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={110}>
      <Scene from={0} dur={110}>
        <RxPaper />
        <Caption lines={['3 слова из 15', 'вообще разборчивы']} from={4} dur={100} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={110} durationInFrames={48}>
      <Scene from={0} dur={48}>
        <Flash />
        <Caption lines={['Сфоткал — и готово']} from={2} dur={42} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={158} durationInFrames={210}>
      <Scene from={0} dur={210}>
        <Schedule />
        <Caption lines={['Остальные 12 слов', 'тоже расшифрованы']} from={14} dur={192} />
      </Scene>
    </Sequence>

    <Sequence from={368} durationInFrames={108}>
      <EndCard from={0} dur={108} tagline={['Любой почерк —', 'без проблем']} />
    </Sequence>
  </AbsoluteFill>
);
