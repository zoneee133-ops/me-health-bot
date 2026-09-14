import {Composition} from 'remotion';
import {MePromo} from './MePromo';
import {PhoneShowcase} from './PhoneShowcase';
import {Promo3D} from './Promo3D';
import {en} from './copy';
import {ReelDecode} from './reels/ReelDecode';
import {ReelHandwriting} from './reels/ReelHandwriting';
import {ReelHandwriting2} from './reels/ReelHandwriting2';
import {ReelHandwriting3} from './reels/ReelHandwriting3';
import {ReelShowMom} from './reels/ReelShowMom';
import {ReelAboveNormal} from './reels/ReelAboveNormal';
import {ReelFerritin} from './reels/ReelFerritin';
import {ReelReport} from './reels/ReelReport';
import {ReelMail} from './reels/ReelMail';
import {ReelScan} from './reels/ReelScan';
import {ReelKidsUrine} from './reels/ReelKidsUrine';
import {ReelSportCheckup} from './reels/ReelSportCheckup';
import {ReelKidsAgeNorms} from './reels/ReelKidsAgeNorms';
import {ReelRefRange} from './reels/ReelRefRange';
import {ReelGlitchTranslator} from './reels/ReelGlitchTranslator';

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
    {reel('ReelHandwriting2', ReelHandwriting2, 334)}
    {reel('ReelHandwriting3', ReelHandwriting3, 294)}
    {reel('ReelShowMom', ReelShowMom, 700)}
    {reel('ReelAboveNormal', ReelAboveNormal, 610)}
    {reel('ReelFerritin', ReelFerritin, 730)}
    {reel('ReelReport', ReelReport, 725)}
    {reel('ReelMail', ReelMail, 730)}
    {reel('ReelScan', ReelScan, 805)}
    {reel('ReelKidsUrine', ReelKidsUrine, 560)}
    {reel('ReelSportCheckup', ReelSportCheckup, 622)}
    {reel('ReelKidsAgeNorms', ReelKidsAgeNorms, 657)}
    {reel('ReelRefRange', ReelRefRange, 651)}
    {reel('ReelGlitchTranslator', ReelGlitchTranslator, 810)}
  </>
);
