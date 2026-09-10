import {Composition} from 'remotion';
import {MePromo} from './MePromo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MePromo"
    component={MePromo}
    durationInFrames={690}
    fps={30}
    width={1080}
    height={1920}
  />
);
