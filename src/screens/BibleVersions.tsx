import { useNavigate } from 'react-router-dom';
import { useBibles } from '../hooks/useFears.ts';
import { TRANSLATIONS } from '../lib/translations.ts';

// The env var a version's id belongs in, if it's one the app offers.
const envVarFor = (abbreviation: string): string | null => {
  const id = abbreviation.trim().toLowerCase();
  const match = TRANSLATIONS.find((t) => t.id === id || t.short.toLowerCase() === id);
  if (!match || match.id === 'kjv') return null; // KJV is free, no id needed
  return `API_BIBLE_ID_${match.id.toUpperCase()}`;
};

export default function BibleVersions() {
  const navigate = useNavigate();
  const { data: bibles = [], isLoading, isError, error } = useBibles();

  return (
    <div style={{ maxWidth: 860 }}>
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/')}
        style={{ marginBottom: 20, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}
      >
        ← Journal
      </button>
      <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(26px,4vw,38px)' }}>Bible versions</h1>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 20, maxWidth: '64ch' }}>
        These are the versions your API.Bible key can see. Copy a version’s <strong>Bible ID</strong> into the
        matching environment variable on the server (for the app’s versions the variable is shown in the last
        column), then redeploy. Your key stays on the server — it’s never sent to the browser.
      </p>
      <hr className="hr" style={{ margin: '0 0 24px' }} />

      {isLoading && <p className="text-muted">Loading your versions…</p>}

      {isError && (
        <div style={{ border: '1px solid var(--color-accent-300)', padding: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-accent-700)' }}>
            {(error as Error)?.message ?? 'Could not load Bible versions.'}
          </p>
          <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
            Set <code>API_BIBLE_KEY</code> on the server and redeploy, then reload this page.
          </p>
        </div>
      )}

      {!isLoading && !isError && bibles.length === 0 && (
        <p className="text-muted">Your key returned no versions.</p>
      )}

      {!isLoading && !isError && bibles.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-divider)' }}>
                <th style={{ padding: '8px 12px 8px 0' }}>Abbr.</th>
                <th style={{ padding: '8px 12px' }}>Name</th>
                <th style={{ padding: '8px 12px' }}>Language</th>
                <th style={{ padding: '8px 12px' }}>Bible ID</th>
                <th style={{ padding: '8px 0 8px 12px' }}>Set as</th>
              </tr>
            </thead>
            <tbody>
              {bibles.map((b) => {
                const envVar = envVarFor(b.abbreviation);
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                    <td style={{ padding: '8px 12px 8px 0', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {b.abbreviation}
                    </td>
                    <td style={{ padding: '8px 12px' }}>{b.name}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }} className="text-muted">
                      {b.language}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <code style={{ userSelect: 'all', fontSize: 12, wordBreak: 'break-all' }}>{b.id}</code>
                    </td>
                    <td style={{ padding: '8px 0 8px 12px', whiteSpace: 'nowrap' }}>
                      {envVar ? (
                        <code style={{ fontSize: 11, color: 'var(--color-accent-700)' }}>{envVar}</code>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 11 }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
