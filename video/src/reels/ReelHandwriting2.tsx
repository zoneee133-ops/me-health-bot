import {AbsoluteFill, Sequence} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, EndCard} from './shared';
import {RxPaper, Flash, Schedule} from './ReelHandwriting';

// Реел B2 — тот же формат, что залетел («Почерк врача», 139 просм.), но с более
// сильным разговорным хуком и быстрее темпом (короче сцены, раньше первый кат).

export const ReelHandwriting2: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={110}>
      <Scene from={0} dur={110}>
        <RxPaper />
        <Caption lines={['Вернулся от врача.', 'И вообще не вдупляешь']} from={4} dur={100} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={110} durationInFrames={48}>
      <Scene from={0} dur={48}>
        <Flash />
        <Caption lines={['Фото — и всё ясно']} from={2} dur={42} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={158} durationInFrames={210}>
      <Scene from={0} dur={210}>
        <Schedule />
        <Caption lines={['Название, доза, дни —', 'разложено само']} from={14} dur={192} />
      </Scene>
    </Sequence>

    <Sequence from={368} durationInFrames={108}>
      <EndCard from={0} dur={108} tagline={['Без гадания,', 'что там писали']} />
    </Sequence>
  </AbsoluteFill>
);
