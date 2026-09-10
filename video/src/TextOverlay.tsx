import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// Премиальный субтитр: тонкая линия-акцент, очень мягкий подъём, плавный уход.
export const TextOverlay: React.FC<{
  lines: string[];
  startAt: number;
  endAt: number;
  align?: 'center' | 'bottom' | 'top';
  size?: number;
}> = ({lines, startAt, endAt, align = 'center', size = 64}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = f - startAt;

  const enter = spring({frame: local, fps, config: {damping: 200, mass: 1.4}});
  const exit = interpolate(f, [endAt - 20, endAt], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(enter, exit);
  const y = interpolate(enter, [0, 1], [18, 0]);

  const pos =
    align === 'bottom'
      ? {bottom: 210}
      : align === 'top'
        ? {top: 168}
        : {top: '50%', transform: 'translateY(-50%)'};

  return (
    <div style={{position: 'absolute', left: 96, right: 96, textAlign: 'center', opacity, ...pos}}>
      <div
        style={{
          width: 54,
          height: 3,
          borderRadius: 2,
          background: T.accent,
          margin: '0 auto 28px',
          transform: `translateY(${y}px)`,
          opacity: opacity * 0.9,
        }}
      />
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: T.font,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1.3,
            letterSpacing: '-0.015em',
            color: T.ink,
            transform: `translateY(${y}px)`,
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};
