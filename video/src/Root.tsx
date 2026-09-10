import {Composition} from 'remotion';
import {MePromo} from './MePromo';
import {PhoneShowcase} from './PhoneShowcase';
import {en} from './copy';
import {ReelDecode} from './reels/ReelDecode';
import {ReelHandwriting} from './reels/ReelHandwriting';
import {ReelShowMom} from './reels/ReelShowMom';
import {ReelAboveNormal} from './reels/ReelAboveNormal';

const reel = (id: string, component: React.FC, durationInFrames: number) => (
  <Composition
    id={id}
    component={component}
    durationInFrames={durationInFrames}
    fps={30}
    width={1080}
    height={1920}
  />
);

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
    {reel('ReelDecode', ReelDecode, 570)}
    {reel('ReelHandwriting', ReelHandwriting, 570)}
    {reel('ReelShowMom', ReelShowMom, 620)}
    {reel('ReelAboveNormal', ReelAboveNormal, 480)}
  </>
);
