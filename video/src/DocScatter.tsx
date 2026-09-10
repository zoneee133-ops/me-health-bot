import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// Каракули рукописного рецепта, которые плавно выпрямляются в ровные типографские строки.
export const DocScatter: React.FC<{resolveAt: number}> = ({resolveAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // строки: у каждой набор «слов» (сегментов). В хаосе — свой поворот/сдвиг/дрожь.
  const lines = [
    {words: [180, 90, 140], rot: -8, x: -70, y: -190},
    {words: [120, 200, 70, 110], rot: 6, x: 60, y: -95},
    {words: [90, 160, 130], rot: -4, x: -40, y: 0},
    {words: [150, 80, 190], rot: 9, x: 50, y: 95},
    {words: [110, 140, 90], rot: -7, x: -60, y: 190},
  ];

  const paper = spring({frame: f - resolveAt + 6, fps, config: {damping: 200, mass: 1.6}});
  return (
    <div style={{position: 'absolute', left: '50%', top: '54%'}}>
      <div
        style={{
          position: 'absolute',
          width: 560,
          height: 420,
          left: -280,
          top: -210,
          background: T.surface,
          borderRadius: 20,
          boxShadow: '0 40px 90px rgba(20,20,30,0.10)',
          opacity: 0.55 + paper * 0.4,
          transform: `rotate(${interpolate(paper, [0, 1], [-4, 0])}deg) scale(${interpolate(paper, [0, 1], [0.94, 1])})`,
        }}
      />
      {lines.map((ln, i) => {
        const r = spring({
          frame: f - resolveAt - i * 3,
          fps,
          config: {damping: 200, mass: 1.4},
        });
        const rot = interpolate(r, [0, 1], [ln.rot, 0]);
        const x = interpolate(r, [0, 1], [ln.x, 0]);
        const y = interpolate(r, [0, 1], [ln.y, i * 62 - 124]);
        const wob = (1 - r) * Math.sin((f + i * 25) / 9) * 2.5;
        const col = r < 0.5 ? T.ink3 : T.ink;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              display: 'flex',
              gap: interpolate(r, [0, 1], [10, 14]),
              transform: `translate(-50%,-50%) translate(${x}px, ${y + wob}px) rotate(${rot}deg)`,
            }}
          >
            {ln.words.map((w, j) => (
              <div
                key={j}
                style={{
                  width: w,
                  height: interpolate(r, [0, 1], [10 + (j % 2) * 6, 22]),
                  borderRadius: interpolate(r, [0, 1], [6, 7]),
                  background: col,
                  opacity: 0.85,
                  // в хаосе — скруглённые «росчерки», в порядке — ровные бруски
                  transform: `skewX(${interpolate(r, [0, 1], [(j % 2 ? 1 : -1) * 14, 0])}deg)`,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
