import {Composition} from 'remotion';
import {MePromo} from './MePromo';
import {PhoneShowcase} from './PhoneShowcase';
import {Promo3D} from './Promo3D';
import {en} from './copy';
import {ReelDecode} from './reels/ReelDecode';
import {ReelHandwriting} from './reels/ReelHandwriting';
import {ReelShowMom} from './reels/ReelShowMom';
import {ReelAboveNormal} from './reels/ReelAboveNormal';
import {ReelFerritin} from './reels/ReelFerritin';
import {ReelReport} from './reels/ReelReport';
import {ReelMail} from './reels/ReelMail';
import {ReelScan} from './reels/ReelScan';

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
      height={1920}
    />
    <Composition id="Promo3D" component={Promo3D} durationInFrames={480} fps={30} width={1080} height={1920} />
    {reel('ReelDecode', ReelDecode, 620)}
    {reel('ReelHandwriting', ReelHandwriting, 585)}
    {reel('ReelShowMom', ReelShowMom, 635)}
    {reel('ReelAboveNormal', ReelAboveNormal, 610)}
    {reel('ReelFerritin', ReelFerritin, 730)}
    {reel('ReelReport', ReelReport, 725)}
    {reel('ReelMail', ReelMail, 730)}
    {reel('ReelScan', ReelScan, 805)}
  </>
);
