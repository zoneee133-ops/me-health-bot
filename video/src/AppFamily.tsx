import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {T} from './theme';

const Frame: React.FC<{children: React.ReactNode; style?: React.CSSProperties; small?: boolean}> = ({
  children,
  style,
  small,
}) => (
  <div
    style={{
      width: small ? 620 : 720,
      background: T.surface,
      borderRadius: 52,
      padding: small ? '44px 38px' : '48px 40px',
      boxShadow: '0 46px 110px rgba(20,20,30,0.16)',
      ...style,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32}}>
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 15,
          background: T.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 64 64" width="28" height="28">
          <path d="M32 14c3 10 8 15 18 18-10 3-15 8-18 18-3-10-8-15-18-18 10-3 15-8 18-18z" fill="#fff" />
        </svg>
      </div>
      <div style={{fontFamily: T.font, fontSize: 26, fontWeight: 600, color: T.ink}}>Me</div>
    </div>
    {children}
  </div>
);

// Сцена: дочь подключает маму, затем — крупный простой экран мамы.
export const AppFamily: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // фаза 1 (0–44): телефон дочери, «Добавить близкого» → подключено
  // фаза 2 (44–90): уезжает влево, въезжает крупный экран мамы
  const handoff = spring({frame: f - 46, fps, durationInFrames: 22, config: {damping: 200}});
  const daughterX = interpolate(handoff, [0, 1], [0, -560]);
  const daughterO = interpolate(handoff, [0, 1], [1, 0]);
  const momX = interpolate(handoff, [0, 1], [640, 0]);
  const momO = interpolate(handoff, [0, 1], [0, 1]);

  const connect = spring({frame: f - 12, fps, config: {damping: 160, mass: 1.2}});
  const rowIn = spring({frame: f - 5, fps, config: {damping: 200}});

  const momEnter = spring({frame: f - 54, fps, config: {damping: 200, mass: 1}});

  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {/* телефон дочери */}
      <div
        style={{
          position: 'absolute',
          transform: `translateX(${daughterX}px)`,
          opacity: daughterO,
        }}
      >
        <Frame>
          <div style={{fontFamily: T.font, fontSize: 30, fontWeight: 600, color: T.ink, marginBottom: 20}}>
            Близкие
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: T.bgDeep,
              borderRadius: 24,
              padding: '26px 28px',
              opacity: rowIn,
              transform: `translateY(${interpolate(rowIn, [0, 1], [24, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: 'linear-gradient(160deg,#7BC96F,#38A0A0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
              }}
            >
              💚
            </div>
            <div style={{flex: 1}}>
              <div style={{fontFamily: T.font, fontSize: 30, fontWeight: 600, color: T.ink}}>Мама</div>
              <div style={{fontFamily: T.font, fontSize: 23, color: T.accent, opacity: connect}}>
                подключена
              </div>
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: T.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: connect,
                transform: `scale(${interpolate(connect, [0, 1], [0.4, 1])})`,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth={3}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div
            style={{
              marginTop: 22,
              textAlign: 'center',
              fontFamily: T.font,
              fontSize: 24,
              color: T.ink3,
            }}
          >
            + Добавить близкого
          </div>
        </Frame>
      </div>

      {/* крупный экран мамы */}
      <div
        style={{
          position: 'absolute',
          transform: `translateX(${momX}px) scale(${interpolate(momEnter, [0, 1], [0.96, 1])})`,
          opacity: momO,
        }}
      >
        <Frame small>
          <div style={{fontFamily: T.font, fontSize: 34, color: T.ink2, marginBottom: 24}}>
            Сегодня
          </div>
          <div
            style={{
              background: T.accentSoft,
              borderRadius: 28,
              padding: '40px 36px',
              marginBottom: 24,
            }}
          >
            <div style={{fontFamily: T.font, fontSize: 46, fontWeight: 700, color: T.ink}}>
              Всё в норме
            </div>
            <div style={{fontFamily: T.font, fontSize: 30, color: T.ink2, marginTop: 10}}>
              последний анализ — 12 сентября
            </div>
          </div>
          <div
            style={{
              background: T.warnSoft,
              borderRadius: 28,
              padding: '36px 36px',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div style={{fontSize: 52}}>💊</div>
            <div>
              <div style={{fontFamily: T.font, fontSize: 40, fontWeight: 700, color: T.ink}}>
                20:00
              </div>
              <div style={{fontFamily: T.font, fontSize: 28, color: T.ink2, marginTop: 6}}>
                Метформин, после еды
              </div>
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
};
