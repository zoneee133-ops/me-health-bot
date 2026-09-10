import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {T} from './theme';

// Спокойный тёплый фон с очень медленным дыханием градиента.
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const shift = interpolate(f, [0, 450], [0, 8], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% ${28 + shift}%, ${T.bg} 0%, ${T.bgDeep} 100%)`,
      }}
    />
  );
};
