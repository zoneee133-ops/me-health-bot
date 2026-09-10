import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

// ── Backdrop: тёплая студия, мягкая тень на "полу", слабые диагонали ──
const Backdrop: React.FC<{w: number; h: number}> = ({w, h}) => {
  const f = useCurrentFrame();
  const drift = interpolate(f, [0, 500], [0, 20]);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg,#FCFAF5 0%,#EFEADE 100%)'}}>
      <svg width="100%" height="100%" style={{position: 'absolute'}}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={-300 + i * (w / 4) + drift} y1={-120} x2={200 + i * (w / 4) + drift} y2={h + 120}
            stroke="#1C2136" strokeOpacity={0.04} strokeWidth={2} />
        ))}
      </svg>
      <AbsoluteFill style={{background: `radial-gradient(60% 45% at 50% 44%, rgba(255,255,255,0.8), rgba(255,255,255,0) 72%)`}} />
      {/* мягкая тень на полу */}
      <div style={{position: 'absolute', left: '50%', top: h * 0.72, transform: 'translateX(-50%)', width: w * 0.6, height: h * 0.11, borderRadius: '50%', background: 'rgba(28,33,54,0.10)', filter: 'blur(38px)'}} />
    </AbsoluteFill>
  );
};

// ── Телефон с экраном Me ──
const Phone: React.FC<{cx: number; cy: number; pw: number; ph: number}> = ({cx, cy, pw, ph}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 6, fps, config: {damping: 200, mass: 1.6}});
  const y = interpolate(s, [0, 1], [80, 0]);
  const float = Math.sin(f / 44) * 8;
  const k = ph / 900; // масштаб внутренностей экрана
  return (
    <div style={{
      position: 'absolute', left: cx, top: cy,
      transform: `translate(-50%,-50%) translateY(${y + float}px) perspective(2600px) rotateY(-9deg) rotateX(3deg)`,
      opacity: s,
    }}>
      <div style={{
        width: pw, height: ph, borderRadius: 58 * k, background: '#0E1220', padding: 12 * k,
        boxShadow: '0 70px 130px rgba(20,20,30,0.24), 0 14px 36px rgba(20,20,30,0.12)',
      }}>
        <div style={{width: '100%', height: '100%', borderRadius: 48 * k, overflow: 'hidden', background: T.bg, position: 'relative', padding: `${44 * k}px ${28 * k}px`}}>
          <div style={{position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 130 * k, height: 26 * k, background: '#0E1220', borderRadius: `0 0 16px 16px`, zIndex: 5}} />
          <div style={{display: 'flex', alignItems: 'center', gap: 10 * k, marginBottom: 22 * k}}>
            <div style={{width: 40 * k, height: 40 * k, borderRadius: 12 * k, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <svg viewBox="0 0 64 64" width={24 * k} height={24 * k}><path d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z" fill="#fff" /></svg>
            </div>
            <div style={{fontFamily: T.font, fontSize: 22 * k, fontWeight: 600, color: T.ink}}>Me</div>
          </div>
          <ScreenCard k={k} delay={16} dim><SRow k={k} n="Гемоглобин" v="134" r="120 – 150 г/л · норма" /></ScreenCard>
          <ScreenCard k={k} delay={22} hi>
            <SRow k={k} n="Глюкоза" v="6,4" r="норма 3,9 – 5,9 ммоль/л" warn />
            <div style={{fontFamily: T.font, fontSize: 20 * k, lineHeight: 1.4, color: T.ink, marginTop: 12 * k}}>
              Это <b style={{background: T.accentSoft, padding: '1px 6px', borderRadius: 5}}>не диабет</b>. Скорее всего — сдавали не натощак.
            </div>
          </ScreenCard>
          <ScreenCard k={k} delay={28} dim><SRow k={k} n="Лимфоциты" v="31 %" r="19 – 37 % · норма" /></ScreenCard>
        </div>
      </div>
    </div>
  );
};

const ScreenCard: React.FC<{k: number; delay: number; children: React.ReactNode; hi?: boolean; dim?: boolean}> = ({k, delay, children, hi, dim}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.2}});
  return (
    <div style={{
      opacity: dim ? s * 0.4 : s,
      transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
      background: hi ? '#fff' : T.bgDeep, borderRadius: 20 * k, padding: `${18 * k}px ${20 * k}px`, marginBottom: 14 * k,
      boxShadow: hi ? '0 16px 40px rgba(20,20,30,0.10)' : 'none',
    }}>{children}</div>
  );
};

const SRow: React.FC<{k: number; n: string; v: string; r?: string; warn?: boolean}> = ({k, n, v, r, warn}) => (
  <>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
      <div style={{fontFamily: T.font, fontSize: 22 * k, fontWeight: 600, color: T.ink}}>{n}</div>
      <div style={{fontFamily: T.font, fontSize: 24 * k, fontWeight: 700, color: warn ? T.warn : T.ink}}>{v}</div>
    </div>
    {r && <div style={{fontFamily: T.font, fontSize: 15 * k, color: T.ink3, marginTop: 4 * k}}>{r}</div>}
  </>
);

// ── Плавающая медицинская "карточка-объект" ──
const Prop: React.FC<{cx: number; cy: number; radius: number; angle: number; delay: number; size: number; children: React.ReactNode}> = ({cx, cy, radius, angle, delay, size, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, mass: 1.3}});
  const orbit = angle + f * 0.0016; // медленная орбита
  const r = radius * interpolate(s, [0, 1], [0.18, 1]);
  const x = cx + Math.cos(orbit) * r * 1.06;
  const y = cy + Math.sin(orbit) * r * 0.82 + Math.sin(f / 40 + angle) * 7;
  const rot = Math.sin(f / 60 + angle) * 3;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: size,
      transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${interpolate(s, [0, 1], [0.6, 1])})`,
      opacity: s,
      filter: 'drop-shadow(0 26px 40px rgba(20,20,30,0.16)) drop-shadow(0 8px 14px rgba(20,20,30,0.10))',
    }}>{children}</div>
  );
};

const CardBox: React.FC<{children: React.ReactNode; dark?: boolean; pad?: number}> = ({children, dark, pad = 18}) => (
  <div style={{background: dark ? '#1C2136' : '#fff', borderRadius: 20, padding: pad, fontFamily: T.font}}>{children}</div>
);

// 1. лаборатоный бланк
const LabProp: React.FC = () => (
  <CardBox>
    <div style={{fontSize: 13, fontWeight: 700, color: T.ink2, letterSpacing: '0.06em', marginBottom: 10}}>АНАЛИЗ КРОВИ</div>
    {[['СОЭ', false], ['Глюкоза', true], ['Ферритин', false]].map(([n, w], i) => (
      <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i ? `1px solid ${T.line}` : 'none'}}>
        <span style={{fontSize: 16, color: T.ink}}>{n as string}</span>
        <span style={{width: 46, height: 8, borderRadius: 4, background: w ? T.warn : '#D9E2E0'}} />
      </div>
    ))}
  </CardBox>
);

// 2. капсула
const PillProp: React.FC = () => (
  <div style={{width: 150, height: 70, borderRadius: 35, overflow: 'hidden', display: 'flex', background: '#fff'}}>
    <div style={{flex: 1, background: T.accent}} />
    <div style={{flex: 1, background: '#F0ECE1'}} />
    <div style={{position: 'absolute', width: 150, height: 70, borderRadius: 35, boxShadow: 'inset 0 0 0 1px rgba(28,33,54,0.06)'}} />
  </div>
);

// 3. рецепт с закорючкой
const RxProp: React.FC = () => (
  <CardBox>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8}}>
      <span style={{fontSize: 26, fontWeight: 700, fontStyle: 'italic', color: T.accent}}>℞</span>
      <div style={{height: 8, width: 90, borderRadius: 4, background: '#E4E9E7'}} />
    </div>
    <div style={{height: 6, width: 130, borderRadius: 3, background: '#EDEAE1', marginBottom: 6}} />
    <div style={{height: 6, width: 100, borderRadius: 3, background: '#EDEAE1', marginBottom: 12}} />
    <svg width="150" height="26" viewBox="0 0 150 26">
      <path d="M2 18 C 14 2, 20 24, 32 14 S 52 2, 64 16 S 86 26, 100 10 S 128 4, 148 16" fill="none" stroke={T.ink} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  </CardBox>
);

// 4. снимок / рентген
const ScanProp: React.FC = () => (
  <CardBox dark>
    <div style={{fontSize: 12, fontWeight: 700, color: '#8B93AE', letterSpacing: '0.08em', marginBottom: 8}}>СНИМОК · ГРУДНАЯ КЛЕТКА</div>
    <svg width="150" height="96" viewBox="0 0 150 96">
      <path d="M75 6 V 90" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
      {[16, 30, 44, 58, 72].map((y) => (
        <path key={y} d={`M75 ${y} C 52 ${y - 6}, 30 ${y + 4}, 14 ${y + 16}`} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      ))}
      {[16, 30, 44, 58, 72].map((y) => (
        <path key={y + 'r'} d={`M75 ${y} C 98 ${y - 6}, 120 ${y + 4}, 136 ${y + 16}`} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  </CardBox>
);

// 5. чип-календарь с напоминаниями
const CalProp: React.FC = () => (
  <CardBox pad={16}>
    <div style={{fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 8}}>Приём лекарства</div>
    {['08:00', '20:00'].map((t) => (
      <div key={t} style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 6}}>
        <span style={{width: 14, height: 14, borderRadius: 4, background: T.accentSoft, border: `2px solid ${T.accent}`}} />
        <span style={{fontSize: 16, color: T.ink2}}>{t}</span>
      </div>
    ))}
  </CardBox>
);

// ── Верхняя подпись ──
const Caption: React.FC<{w: number; top: number; big: number}> = ({w, top, big}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 14, fps, config: {damping: 200, mass: 1.3}});
  const o = Math.min(s, interpolate(f, [300, 330], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{position: 'absolute', top, left: 60, width: w - 120, textAlign: 'center', opacity: o, transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px)`}}>
      {['Всё о вашем здоровье —', 'в одном месте'].map((l, i) => (
        <div key={i} style={{fontFamily: T.font, fontWeight: 700, fontSize: big, lineHeight: 1.16, letterSpacing: '-0.02em', color: T.ink}}>{l}</div>
      ))}
    </div>
  );
};

// ── Финальный лок-ап ──
const End: React.FC<{w: number; h: number}> = ({w, h}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 200}});
  const o = interpolate(f, [0, 16, 90, 110], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sz = Math.min(w, h);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: o}}>
      <div style={{textAlign: 'center', transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`}}>
        <div style={{width: sz * 0.13, height: sz * 0.13, borderRadius: sz * 0.04, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 30px 70px rgba(20,20,30,0.16)'}}>
          <svg viewBox="0 0 64 64" width={sz * 0.08} height={sz * 0.08}><path d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z" fill="#fff" /></svg>
        </div>
        <div style={{fontFamily: T.font, fontSize: sz * 0.075, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em'}}>Me</div>
        <div style={{fontFamily: T.font, fontSize: sz * 0.028, color: T.ink2, marginTop: 14}}>Бесплатно в Telegram · @me_abouthealth_bot</div>
      </div>
    </AbsoluteFill>
  );
};

// ── Сцена (параметризована размером) ──
export const Promo3DScene: React.FC<{width: number; height: number}> = ({width, height}) => {
  const square = Math.abs(width - height) < 200;
  const cx = width / 2;
  const cy = square ? height * 0.54 : height * 0.5;
  const ph = square ? height * 0.6 : height * 0.5;
  const pw = ph * 0.49;
  const radius = square ? Math.min(width, height) * 0.4 : width * 0.44;
  const propSize = square ? 150 : 168;
  const capTop = square ? 46 : 120;
  const capBig = square ? 46 : 58;

  const mainDur = 350;
  const props: {node: React.ReactNode; angle: number; delay: number}[] = [
    {node: <LabProp />, angle: -2.5, delay: 40},
    {node: <PillProp />, angle: -1.15, delay: 52},
    {node: <RxProp />, angle: -0.15, delay: 64},
    {node: <ScanProp />, angle: 1.15, delay: 76},
    {node: <CalProp />, angle: 2.4, delay: 88},
  ];

  return (
    <AbsoluteFill style={{fontFamily: T.font}}>
      <Backdrop w={width} h={height} />
      <Sequence from={0} durationInFrames={mainDur}>
        <SceneFade dur={mainDur}>
          <Phone cx={cx} cy={cy} pw={pw} ph={ph} />
          {props.map((p, i) => (
            <Prop key={i} cx={cx} cy={cy} radius={radius} angle={p.angle} delay={p.delay} size={propSize}>{p.node}</Prop>
          ))}
          <Caption w={width} top={capTop} big={capBig} />
        </SceneFade>
      </Sequence>
      <Sequence from={mainDur} durationInFrames={130}><End w={width} h={height} /></Sequence>
    </AbsoluteFill>
  );
};

const SceneFade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 16, dur - 20, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Promo3D: React.FC = () => <Promo3DScene width={1080} height={1920} />;
export const Promo3DSquare: React.FC = () => <Promo3DScene width={1080} height={1080} />;
