import {AbsoluteFill, Sequence} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, EndCard} from './shared';
import {RxPaper, Flash, Schedule} from './ReelHandwriting';

// Реел B2 — тот же формат, что залетел («Почерк врача», 139 просм.), но с более
// сильным разговорным хуком и быстрее темпом (короче сцены, раньше первый кат).

export const ReelHandwriting2: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={77}>
      <Scene from={0} dur={77}>
        <RxPaper />
        <Caption lines={['Вернулся от врача.', 'И вообще не вдупляешь']} from={3} dur={70} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={77} durationInFrames={34}>
      <Scene from={0} dur={34}>
        <Flash />
        <Caption lines={['Фото — и всё ясно']} from={1} dur={30} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={111} durationInFrames={147}>
      <Scene from={0} dur={147}>
        <Schedule />
        <Caption lines={['Название, доза, дни —', 'разложено само']} from={10} dur={135} />
      </Scene>
    </Sequence>

    <Sequence from={258} durationInFrames={76}>
      <EndCard from={0} dur={76} tagline={['Без гадания,', 'что там писали']} />
    </Sequence>
  </AbsoluteFill>
);
