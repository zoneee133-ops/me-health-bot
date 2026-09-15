import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, EndCard, MePhone, Sparkle} from './shared';

// Реел «Переводчик с врачебного» — паника после врача → Me расшифровывает документ
// глитч-морфингом текста → карточка приёма → фича «Родным».

const scrawl = '"Snell Roundhand", "Bradley Hand", "Brush Script MT", cursive';
const GLYPHS = '!<>-_\\/[]{}=+*^?#01';

const pseudoRand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Плавный decode-эффект: символы «дребезжат» случайными глифами, затем фиксируются
// слева-направо в целевой текст.
const ScrambleText: React.FC<{
  text: string;
  from: number;
  dur: number;
  size?: number;
  color?: string;
}> = ({text, from, dur, size = 44, color = T.ink}) => {
  const f = useCurrentFrame();
  const local = Math.max(0, f - from);
  const progress = interpolate(local, [0, dur], [0, 1], {extrapolateRight: 'clamp'});
  const lockedCount = Math.floor(progress * text.length * 1.15);

  return (
    <div style={{fontFamily: T.font, fontWeight: 700, fontSize: size, color, letterSpacing: '-0.01em'}}>
      {text.split('').map((ch, i) => {
        if (ch === ' ') return <span key={i}> </span>;
        const locked = i < lockedCount;
        if (locked) return <span key={i}>{ch}</span>;
        const glyph = GLYPHS[Math.floor(pseudoRand(f * 3 + i * 7) * GLYPHS.length)];
        return (
          <span key={i} style={{opacity: 0.55, color: T.accent}}>
            {glyph}
          </span>
        );
      })}
    </div>
  );
};

const GlitchTitle: React.FC<{lines: string[]}> = ({lines}) => {
  const f = useCurrentFrame();
  const jitter = pseudoRand(Math.floor(f / 2)) * 6 - 3;
  const bandY = 200 + pseudoRand(Math.floor(f / 3)) * 900;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#0A0A0C'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: bandY,
          height: 6,
          background: 'rgba(200,68,58,0.35)',
          transform: `translateX(${jitter * 4}px)`,
        }}
      />
      <div style={{textAlign: 'center', padding: '0 100px', transform: `translateX(${jitter}px)`}}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: T.font,
              fontWeight: 700,
              fontSize: 58,
              lineHeight: 1.3,
              color: '#F2ECE0',
              textShadow: '2px 0 rgba(200,68,58,0.7), -2px 0 rgba(126,154,151,0.5)',
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const PANIC_QUERIES = [
  'тромбоциты повышены это смерть???',
  'острый панкреатит симптомы',
  'дексаметазон для чего',
  'алт повышен что делать срочно',
  'почему врач молчал',
];

const PanicSearch: React.FC = () => {
  const f = useCurrentFrame();
  const idx = Math.floor(f / 18) % PANIC_QUERIES.length;
  const shake = pseudoRand(Math.floor(f / 2)) * 8 - 4;
  const zoom = 1 + (Math.floor(f / 18) % 2) * 0.04;
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 50% 40%, rgba(140,30,25,0.55), #12080A 70%)`,
      }}
    >
      <div
        style={{
          transform: `translateX(${shake}px) scale(${zoom})`,
          background: '#fff',
          borderRadius: 22,
          padding: '26px 34px',
          width: 780,
          boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{fontSize: 22, color: T.ink3, marginBottom: 10}}>Google</div>
        <div style={{fontSize: 34, fontWeight: 600, color: T.ink}}>{PANIC_QUERIES[idx]}</div>
      </div>
    </AbsoluteFill>
  );
};

const SoundCutBreak: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({frame: f, fps: 30, config: {damping: 200, mass: 1.2}});
  const breathe = 1 + Math.sin(f / 10) * 0.012;
  const dots = '.'.repeat(1 + (Math.floor(f / 10) % 3));
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: T.bg}}>
      <div style={{opacity: s, textAlign: 'center', transform: `scale(${breathe})`}}>
        <div
          style={{
            width: 620,
            height: 760,
            background: 'linear-gradient(180deg,#FCFAF3,#F3EEE0)',
            borderRadius: 12,
            margin: '0 auto',
            boxShadow: '0 40px 90px rgba(20,20,30,0.16)',
            padding: '60px 50px',
          }}
        >
          <div style={{fontFamily: scrawl, fontSize: 40, color: T.ink, opacity: 0.7, lineHeight: 1.9}}>
            Rp: Ac. acetylsalicylic 75mg<br />
            1 т. × 1 р/д<br />
            АЛТ 62 Ед/л ↑
          </div>
        </div>
        <div style={{fontSize: 38, fontWeight: 600, color: T.ink, marginTop: 36}}>
          Me сканирует{dots}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const DecodeCard: React.FC<{delay: number; from: string; to: string; toDelay: number}> = ({
  delay,
  from,
  to,
  toDelay,
}) => {
  const f = useCurrentFrame();
  const s = spring({frame: f - delay, fps: 30, config: {damping: 200, mass: 1.3}});
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
        background: T.surface,
        borderRadius: 24,
        padding: '30px 32px',
        marginTop: 22,
        boxShadow: '0 20px 46px rgba(20,20,30,0.10)',
      }}
    >
      <div style={{fontFamily: scrawl, fontSize: 30, color: T.ink3, opacity: 0.8}}>{from}</div>
      <div style={{height: 2, background: T.line, margin: '18px 0'}} />
      <ScrambleText text={to} from={delay + toDelay} dur={60} size={32} />
    </div>
  );
};

const PushNotif: React.FC<{delay: number}> = ({delay}) => {
  const f = useCurrentFrame();
  const s = spring({frame: f - delay, fps: 30, config: {damping: 200, mass: 1.1}});
  const bounce = Math.max(0, f - delay - 20);
  const wobble = Math.sin(bounce / 8) * (bounce > 0 ? 3 : 0);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [-24, 0]) + wobble}px)`,
        background: '#1C2136',
        borderRadius: 20,
        padding: '20px 26px',
        marginTop: 26,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{width: 40, height: 40, borderRadius: 12, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${wobble * 3}deg)`}}>
        <Sparkle size={22} />
      </div>
      <div style={{fontSize: 26, color: '#EAF1F7', fontWeight: 600}}>Время принять таблетку 💊</div>
    </div>
  );
};

const FamilySplit: React.FC = () => {
  const f = useCurrentFrame();
  const s = spring({frame: f, fps: 30, config: {damping: 200, mass: 1.2}});
  const s2 = spring({frame: f - 20, fps: 30, config: {damping: 200, mass: 1.2}});
  const float1 = Math.sin(f / 20) * 8;
  const float2 = Math.sin(f / 20 + 1.2) * 8;
  return (
    <AbsoluteFill style={{flexDirection: 'row'}}>
      <div style={{flex: 1, borderRight: `2px solid ${T.line}`, alignItems: 'center', justifyContent: 'center', display: 'flex'}}>
        <div style={{opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.9, 1])}) translateY(${float1}px)`, textAlign: 'center'}}>
          <div style={{fontSize: 26, color: T.ink2, marginBottom: 14}}>Ты</div>
          <div style={{width: 220, height: 400, background: T.surface, borderRadius: 34, boxShadow: '0 22px 50px rgba(20,20,30,0.12)', padding: 20}}>
            <div style={{fontSize: 20, color: T.ink, fontWeight: 600}}>АЛТ слегка выше нормы</div>
            <div style={{fontSize: 17, color: T.ink3, marginTop: 8}}>Не страшно, отследим</div>
          </div>
        </div>
      </div>
      <div style={{flex: 1, alignItems: 'center', justifyContent: 'center', display: 'flex'}}>
        <div style={{opacity: s2, transform: `scale(${interpolate(s2, [0, 1], [0.9, 1])}) translateY(${float2}px)`, textAlign: 'center'}}>
          <div style={{fontSize: 26, color: T.ink2, marginBottom: 14}}>Мама</div>
          <div style={{width: 220, height: 400, background: T.surface, borderRadius: 34, boxShadow: '0 22px 50px rgba(20,20,30,0.12)', padding: 20}}>
            <div style={{fontSize: 20, color: T.ink, fontWeight: 600}}>Получила то же самое</div>
            <div style={{fontSize: 17, color: T.ink3, marginTop: 8}}>Простыми словами</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ReelGlitchTranslator: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={60}>
      <GlitchTitle lines={['Ты уверен, что понял,', 'что тебе прописал врач?']} />
    </Sequence>

    <Sequence from={60} durationInFrames={180}>
      <Scene from={0} dur={180}>
        <PanicSearch />
        <Caption
          lines={['ГУГЛЯТ ПОСЛЕ ВРАЧА —', '9 ИЗ 10']}
          from={20}
          dur={150}
          align="top"
          scrim={false}
          dark
        />
      </Scene>
    </Sequence>

    <Sequence from={240} durationInFrames={50}>
      <SoundCutBreak />
    </Sequence>

    <Sequence from={290} durationInFrames={240}>
      <MePhone delay={4}>
        <DecodeCard
          delay={6}
          from="Rp: Ac. acetylsalicylic 75mg 1×1"
          to="Раз в день, после еды — разжижает кровь"
          toDelay={10}
        />
        <DecodeCard
          delay={80}
          from="АЛТ 62 Ед/л ↑"
          to="Печень слегка переработала. Обычно не страшно"
          toDelay={10}
        />
        <PushNotif delay={160} />
      </MePhone>
    </Sequence>

    <Sequence from={530} durationInFrames={150}>
      <Scene from={0} dur={150}>
        <FamilySplit />
        <Caption lines={['А теперь отправь это маме']} from={10} dur={120} align="top" />
      </Scene>
    </Sequence>

    <Sequence from={680} durationInFrames={130}>
      <EndCard from={0} dur={130} tagline={['Врачебный —', 'на человеческий']} />
    </Sequence>
  </AbsoluteFill>
);
