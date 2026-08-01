import { UserButton } from '@clerk/clerk-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userButtonAppearance } from '../lib/clerkAppearance.ts';

// Sticky header: accent square + wordmark left; Journal / New entry links
// (current turns accent) + square avatar right. 2px bottom rule.
export default function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const onDashboard = location.pathname === '/';
  const onNew = location.pathname === '/new';

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-heading)',
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: active ? 'var(--color-accent-700)' : 'var(--color-text)',
    textDecoration: 'none',
  });

  return (
    <header
      className="nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--color-bg)',
        flexWrap: 'wrap',
        gap: 16,
        paddingInline: 'clamp(16px,4vw,40px)',
      }}
    >
      <button
        onClick={() => navigate('/')}
        className="nav-brand"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginRight: 'auto',
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          color: 'var(--color-text)',
        }}
      >
        <span style={{ width: 10, height: 10, display: 'inline-block', backgroundColor: '#848EF0' }} />
        Faith over Fear
      </button>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/" style={linkStyle(onDashboard)}>
          Journal
        </Link>
        <Link to="/new" style={linkStyle(onNew)}>
          New entry
        </Link>
        <UserButton appearance={userButtonAppearance} />
      </nav>
    </header>
  );
}
