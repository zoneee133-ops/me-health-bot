import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// Минималистичный силуэт человека. Плечо плавно разгорается красным по пружине.
export const HumanAvatar: React.FC<{glowAt: number}> = ({glowAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const appear = spring({frame: f - 4, fps, config: {damping: 200}});
  const glow = spring({frame: f - glowAt, fps, config: {damping: 120, mass: 1.4}});
  const pulse = 0.5 + 0.5 * Math.sin((f - glowAt) / 9);
  const glowStrength = glow * (0.55 + 0.45 * pulse);

  const y = interpolate(appear, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%,-50%) translateY(${y}px)`,
        opacity: appear,
      }}
    >
      <svg width="620" height="900" viewBox="0 0 310 450">
        <defs>
          <radialGradient id="hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={T.bad} stopOpacity={0.9} />
            <stop offset="100%" stopColor={T.bad} stopOpacity={0} />
          </radialGradient>
        </defs>
        <g fill={T.ink} opacity={0.92}>
          <circle cx="155" cy="52" r="34" />
          <rect x="112" y="96" width="86" height="150" rx="40" />
          <rect x="70" y="110" width="34" height="130" rx="17" />
          <rect x="206" y="110" width="34" height="130" rx="17" />
          <rect x="120" y="240" width="34" height="150" rx="17" />
          <rect x="156" y="240" width="34" height="150" rx="17" />
        </g>
        {/* горячая точка — правое плечо */}
        <circle cx="212" cy="120" r="80" fill="url(#hot)" opacity={glowStrength} />
        <circle cx="212" cy="120" r="20" fill={T.bad} opacity={Math.min(1, glowStrength + 0.2)} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -6,
          transform: 'translateX(-50%)',
          fontFamily: T.font,
          fontSize: 27,
          color: T.ink2,
          opacity: glow,
          whiteSpace: 'nowrap',
        }}
      >
        Правое плечо · требует внимания
      </div>
    </div>
  );
};
