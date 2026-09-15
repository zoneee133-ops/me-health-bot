import {AbsoluteFill, Sequence} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, EndCard} from './shared';
import {RxPaper, Flash, Schedule} from './ReelHandwriting';

// Реел B3 — тот же проверенный формат, хук через цифру (сильнее цепляет с первого кадра).

export const ReelHandwriting3: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={68}>
      <Scene from={0} dur={68}>
        <RxPaper />
        <Caption lines={['3 слова из 15', 'вообще разборчивы']} from={2} dur={62} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={68} durationInFrames={30}>
      <Scene from={0} dur={30}>
        <Flash />
        <Caption lines={['Сфоткал — и готово']} from={1} dur={26} align="top" scrim={false} />
      </Scene>
    </Sequence>

    <Sequence from={98} durationInFrames={130}>
      <Scene from={0} dur={130}>
        <Schedule />
        <Caption lines={['Остальные 12 слов', 'тоже расшифрованы']} from={9} dur={119} />
      </Scene>
    </Sequence>

    <Sequence from={228} durationInFrames={66}>
      <EndCard from={0} dur={66} tagline={['Любой почерк —', 'без проблем']} />
    </Sequence>
  </AbsoluteFill>
);
