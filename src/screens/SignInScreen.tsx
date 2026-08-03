import { SignIn } from '@clerk/clerk-react';
import { clerkAppearance } from '../lib/clerkAppearance.ts';

// Two equal columns; stacks under ~700px. Left: full translucent-accent poster
// with ink copy. Right: Clerk's <SignIn /> styled to the Modernist tokens.
export default function SignInScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <div
        style={{
          padding: 'clamp(32px,6vw,72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 48,
          minHeight: 340,
          background: 'var(--color-accent)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Faith over Fear
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(34px,5.2vw,60px)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            Name the fear.
            <br />
            Answer it with truth.
          </div>
          <div
            style={{ height: 2, background: 'var(--color-text)', margin: '28px 0 20px', maxWidth: 320 }}
          />
          <p style={{ margin: 0, fontSize: 15, maxWidth: '38ch' }}>
            A private log of what you're afraid of, the truth you're choosing instead, and the verses
            you're standing on.
          </p>
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.75,
          }}
        >
          Private by default · Only you
        </div>
      </div>

      <div
        style={{
          padding: 'clamp(32px,6vw,72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <SignIn
          appearance={clerkAppearance}
          routing="virtual"
          signUpUrl="#"
          fallback={<p className="text-muted">Loading sign in…</p>}
        />
        <p className="text-muted" style={{ fontSize: 11, marginTop: 20, maxWidth: 380 }}>
          Secured by Clerk. No one else can read your entries.
        </p>
      </div>
    </div>
  );
}
