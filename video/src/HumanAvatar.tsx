import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// Артикулированный анатомический силуэт: кости — линиями, суставы — точками.
// Правое плечо плавно разгорается: так «Me» показывает проблемную зону.
export const HumanAvatar: React.FC<{glowAt: number}> = ({glowAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const appear = spring({frame: f - 6, fps, config: {damping: 200, mass: 1.6}});
  const draw = spring({frame: f - 10, fps, durationInFrames: 46, config: {damping: 200}});
  const glow = spring({frame: f - glowAt, fps, config: {damping: 200, mass: 2}});
  const pulse = 0.5 + 0.5 * Math.sin((f - glowAt) / 15);
  const hot = glow * (0.6 + 0.4 * pulse);
  const yOff = interpolate(appear, [0, 1], [20, 0]);

  // опорные точки скелета (viewBox 300x520)
  const P = {
    head: [150, 60],
    neck: [150, 104],
    sh_l: [104, 124],
    sh_r: [196, 124],
    el_l: [86, 210],
    el_r: [214, 210],
    wr_l: [92, 292],
    wr_r: [208, 292],
    hip_c: [150, 250],
    hip_l: [124, 262],
    hip_r: [176, 262],
    kn_l: [120, 360],
    kn_r: [180, 360],
    an_l: [116, 452],
    an_r: [184, 452],
  } as const;

  const bone = (a: readonly number[], b: readonly number[]) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
  const bones = [
    bone(P.neck, P.hip_c),
    bone(P.sh_l, P.sh_r),
    bone(P.sh_l, P.el_l),
    bone(P.el_l, P.wr_l),
    bone(P.sh_r, P.el_r),
    bone(P.el_r, P.wr_r),
    bone(P.hip_l, P.hip_r),
    bone(P.hip_c, P.hip_l),
    bone(P.hip_c, P.hip_r),
    bone(P.hip_l, P.kn_l),
    bone(P.kn_l, P.an_l),
    bone(P.hip_r, P.kn_r),
    bone(P.kn_r, P.an_r),
  ].join(' ');

  const joints: (readonly [number, number] | readonly number[])[] = [
    P.sh_r, P.sh_l, P.el_l, P.el_r, P.wr_l, P.wr_r, P.hip_l, P.hip_r, P.kn_l, P.kn_r, P.an_l, P.an_r,
  ];

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%,-50%) translateY(${yOff}px)`,
        opacity: appear,
      }}
    >
      <svg width="520" height="900" viewBox="0 0 300 520">
        <defs>
          <radialGradient id="hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={T.bad} stopOpacity={0.8} />
            <stop offset="55%" stopColor={T.bad} stopOpacity={0.22} />
            <stop offset="100%" stopColor={T.bad} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* мягкая тень-объём под фигурой */}
        <ellipse cx="150" cy="486" rx="66" ry="12" fill={T.ink} opacity={0.06} />

        {/* кости — плавная прорисовка */}
        <path
          d={bones}
          fill="none"
          stroke={T.ink}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
          strokeDasharray={2600}
          strokeDashoffset={interpolate(draw, [0, 1], [2600, 0])}
        />

        {/* голова */}
        <circle
          cx={P.head[0]}
          cy={P.head[1]}
          r={interpolate(draw, [0, 0.4, 1], [0, 0, 26])}
          fill={T.ink}
          opacity={0.9}
        />

        {/* суставы */}
        {joints.map((j, i) => {
          const s = spring({frame: f - 22 - i * 2, fps, config: {damping: 200, mass: 1.3}});
          const isHot = i === 0;
          return (
            <circle
              key={i}
              cx={j[0]}
              cy={j[1]}
              r={interpolate(s, [0, 1], [0, isHot ? 10 : 7])}
              fill={isHot ? T.bad : T.surface}
              stroke={isHot ? T.bad : T.ink}
              strokeWidth={3}
              opacity={isHot ? Math.min(1, hot + 0.35) : s * 0.85}
            />
          );
        })}

        {/* красная зона: мягкое ядро + расходящиеся кольца */}
        <g opacity={glow}>
          <circle cx={P.sh_r[0]} cy={P.sh_r[1]} r={76} fill="url(#hot)" opacity={hot} />
          {[0, 1, 2].map((k) => {
            const t = ((f - glowAt) / 30 + k / 3) % 1;
            return (
              <circle
                key={k}
                cx={P.sh_r[0]}
                cy={P.sh_r[1]}
                r={16 + t * 60}
                fill="none"
                stroke={T.bad}
                strokeWidth={2}
                opacity={glow * (1 - t) * 0.45}
              />
            );
          })}
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 30,
          transform: 'translateX(-50%)',
          fontFamily: T.font,
          fontSize: 26,
          color: T.bad,
          opacity: glow,
          whiteSpace: 'nowrap',
          background: T.badSoft,
          padding: '10px 24px',
          borderRadius: 999,
        }}
      >
        Правое плечо · требует внимания
      </div>
    </div>
  );
};
