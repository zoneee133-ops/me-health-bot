import {Composition} from 'remotion';
import {MePromo} from './MePromo';
import {PhoneShowcase} from './PhoneShowcase';
import {en} from './copy';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MePromo"
      component={MePromo}
      durationInFrames={690}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="MePromoEN"
      component={MePromo}
      durationInFrames={690}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{copy: en}}
    />
    <Composition
      id="PhoneShowcase"
      component={PhoneShowcase}
      durationInFrames={580}
      fps={30}
      width={1080}
      height={1080}
    />
  </>
);
