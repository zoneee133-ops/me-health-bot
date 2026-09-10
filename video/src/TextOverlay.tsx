import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// Премиальный субтитр: тонкая линия-акцент, плавный подъём по пружине, мягкий выход.
export const TextOverlay: React.FC<{
  lines: string[];
  startAt: number;
  endAt: number;
  align?: 'center' | 'bottom';
  size?: number;
}> = ({lines, startAt, endAt, align = 'center', size = 64}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = f - startAt;

  const enter = spring({frame: local, fps, config: {damping: 200, mass: 0.9}});
  const exit = interpolate(f, [endAt - 12, endAt], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(enter, exit);
  const y = interpolate(enter, [0, 1], [26, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 96,
        ...(align === 'bottom' ? {bottom: 220} : {top: '50%', transform: 'translateY(-50%)'}),
        textAlign: 'center',
        opacity,
      }}
    >
      <div
        style={{
          width: 56,
          height: 3,
          borderRadius: 2,
          background: T.accent,
          margin: '0 auto 30px',
          transform: `translateY(${y}px)`,
          opacity,
        }}
      />
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: T.font,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1.28,
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
