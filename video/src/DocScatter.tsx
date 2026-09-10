import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// Хаос бумажных строк рецепта, который на выходе плавно собирается в ровный список.
export const DocScatter: React.FC<{resolveAt: number}> = ({resolveAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const r = spring({frame: f - resolveAt, fps, config: {damping: 200, mass: 1.2}});

  const rows = [
    {w: 420, rot: -7, x: -120, y: -220},
    {w: 520, rot: 5, x: 90, y: -120},
    {w: 360, rot: -3, x: -60, y: -10},
    {w: 480, rot: 9, x: 60, y: 110},
    {w: 300, rot: -6, x: -110, y: 210},
  ];

  return (
    <div style={{position: 'absolute', left: '50%', top: '50%'}}>
      {rows.map((row, i) => {
        const rot = interpolate(r, [0, 1], [row.rot, 0]);
        const x = interpolate(r, [0, 1], [row.x, 0]);
        const y = interpolate(r, [0, 1], [row.y, i * 70 - 140]);
        const wobble = (1 - r) * Math.sin((f + i * 20) / 7) * 3;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: interpolate(r, [0, 1], [row.w, 520]),
              height: 26,
              borderRadius: 13,
              background: interpolate(r, [0, 1], [0, 1]) > 0.5 ? T.ink : T.ink3,
              opacity: 0.85,
              transform: `translate(-50%,-50%) translate(${x}px, ${y + wobble}px) rotate(${rot}deg)`,
            }}
          />
        );
      })}
    </div>
  );
};
