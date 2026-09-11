import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from '../theme';
import {ReelBg, Caption, Scene, MePhone, ExplainCard, EndCard, Sparkle} from './shared';

// Реел C — «Покажи маме». Эмоциональный, медленный.
// Тёмная тема Telegram (iOS Night) → экран «Me» → снова чат → финал.

const TG = {
  bg: '#0E1621',
  inc: '#182533',
  out: '#2B5278',
  head: '#17212B',
  text: '#E7EEF5',
  sub: '#7A8894',
};

const Bubble: React.FC<{
  side: 'in' | 'out';
  delay: number;
  children: React.ReactNode;
  time: string;
}> = ({side, delay, children, time}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 180, mass: 0.9}});
  const out = side === 'out';
  return (
    <div
      style={{
        alignSelf: out ? 'flex-end' : 'flex-start',
        maxWidth: 640,
        background: out ? TG.out : TG.inc,
        color: TG.text,
        borderRadius: 22,
        borderBottomRightRadius: out ? 6 : 22,
        borderBottomLeftRadius: out ? 22 : 6,
        padding: '20px 24px 14px',
        margin: '10px 0',
        fontFamily: T.font,
        fontSize: 32,
        lineHeight: 1.4,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px) scale(${interpolate(
          s,
          [0, 1],
          [0.92, 1],
        )})`,
        transformOrigin: out ? 'bottom right' : 'bottom left',
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
      }}
    >
      {children}
      <div style={{fontSize: 20, color: out ? '#A9C6E0' : TG.sub, textAlign: 'right', marginTop: 8}}>
        {time}
      </div>
    </div>
  );
};

const FormThumb: React.FC = () => (
  <div
    style={{
      width: 380,
      height: 300,
      background: '#F3EEE0',
      borderRadius: 12,
      padding: 26,
      marginBottom: 6,
    }}
  >
    <div style={{height: 12, width: '55%', background: '#9A8F76', borderRadius: 4}} />
    <div style={{height: 8, width: '38%', background: '#C4BAA1', borderRadius: 4, marginTop: 12}} />
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{display: 'flex', gap: 12, marginTop: 22, alignItems: 'center'}}>
        <div style={{height: 9, flex: 1, background: '#C9BFA6', borderRadius: 4}} />
        <div
          style={{
            height: 14,
            width: 64,
            background: i === 2 ? T.bad : '#B4A98D',
            borderRadius: 4,
          }}
        />
      </div>
    ))}
  </div>
);

const TgChat: React.FC<{children: React.ReactNode; typing?: boolean}> = ({children, typing}) => (
  <AbsoluteFill style={{background: TG.bg}}>
    {/* статус-бар */}
    <div
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 44px',
        color: TG.text,
        fontFamily: T.font,
        fontSize: 28,
        fontWeight: 600,
      }}
    >
      <div>9:41</div>
      <div style={{fontSize: 22}}>5G ▪ ▪ ▪ ▮</div>
    </div>
    {/* шапка чата */}
    <div
      style={{
        background: TG.head,
        height: 118,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '0 34px',
      }}
    >
      <div style={{color: '#5AA9E6', fontSize: 44, fontWeight: 300}}>‹</div>
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          background: 'linear-gradient(160deg,#E8A87C,#C56B8A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 34,
        }}
      >
        🌷
      </div>
      <div>
        <div style={{color: TG.text, fontFamily: T.font, fontSize: 32, fontWeight: 600}}>Мама</div>
        <div style={{color: TG.sub, fontFamily: T.font, fontSize: 22, marginTop: 4}}>
          {typing ? 'печатает…' : 'была в сети недавно'}
        </div>
      </div>
    </div>
    {/* лента */}
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: 220,
        bottom: 220,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
    {/* поле ввода */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 132,
        background: TG.head,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '0 40px',
      }}
    >
      <div style={{color: TG.sub, fontSize: 40}}>📎</div>
      <div
        style={{
          flex: 1,
          height: 66,
          borderRadius: 33,
          background: '#242F3D',
          display: 'flex',
          alignItems: 'center',
          padding: '0 26px',
          color: TG.sub,
          fontFamily: T.font,
          fontSize: 27,
        }}
      >
        Сообщение
      </div>
      <div style={{color: TG.sub, fontSize: 40}}>🎤</div>
    </div>
  </AbsoluteFill>
);

export const ReelShowMom: React.FC = () => (
  <AbsoluteFill style={{fontFamily: T.font}}>
    <ReelBg />

    <Sequence from={0} durationInFrames={182}>
      <Scene from={0} dur={182}>
        <TgChat typing>
          <Bubble side="in" delay={16} time="10:24">
            <FormThumb />
          </Bubble>
          <Bubble side="in" delay={64} time="10:24">
            доча, тут всё нормально? 🙏
          </Bubble>
        </TgChat>
        <Caption
          lines={['Мама прислала', 'бланк анализов']}
          from={0}
          dur={88}
          align="top"
          scrim={false}
          dark
        />
        <Caption
          lines={['«Доча, тут всё', 'нормально?»']}
          from={96}
          dur={80}
          align="top"
          scrim={false}
          dark
        />
      </Scene>
    </Sequence>

    <Sequence from={182} durationInFrames={208}>
      <Scene from={0} dur={208}>
        <MePhone delay={4}>
          <ExplainCard
            delay={16}
            name="Глюкоза"
            val="6,2 ммоль/л"
            ref="норма натощак 3,9–5,9"
            chip="Это ещё не диабет"
            body={
              <>
                Небольшое превышение чаще всего значит, что кровь сдавали{' '}
                <b style={{background: T.accentSoft, padding: '1px 8px', borderRadius: 6}}>
                  не натощак
                </b>{' '}
                или был стресс.
              </>
            }
            note="Пересдать строго натощак. Показать терапевту — при повторном высоком значении."
          />
        </MePhone>
        <Caption lines={['Пересылаешь в «Me» —', 'и читаешь спокойно']} from={16} dur={170} />
      </Scene>
    </Sequence>

    <Sequence from={390} durationInFrames={205}>
      <Scene from={0} dur={205}>
        <TgChat>
          <Bubble side="out" delay={10} time="10:31">
            мам, всё ок. сахар чуть выше нормы — скорее всего потому что не натощак сдавала.
            пересдай утром на голодный желудок, я запишу тебя к терапевту 💚
          </Bubble>
          <Bubble side="in" delay={64} time="10:33">
            спасибо родная 🙏
          </Bubble>
        </TgChat>
      </Scene>
    </Sequence>

    <Sequence from={595} durationInFrames={90}>
      <EndCard from={0} dur={90} tagline={['Родители не гуглят.', 'Они звонят тебе']} />
    </Sequence>
  </AbsoluteFill>
);
