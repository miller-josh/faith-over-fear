import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeleteFear, useFear, useUpdateFear } from '../hooks/useFears.ts';
import type { Status } from '../lib/types.ts';
import { dateParts } from '../lib/format.ts';
import { TRANSLATIONS, translationLabel } from '../lib/translations.ts';
import StatusTag from '../components/StatusTag.tsx';
import DeleteDialog from '../components/DeleteDialog.tsx';

export default function FearDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: fear, isLoading, isError } = useFear(id);
  const update = useUpdateFear();
  const remove = useDeleteFear();

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  // The verse whose translation is currently being re-fetched, so we can show a
  // loading hint on just that row.
  const [changingRef, setChangingRef] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted">Loading…</p>;
  }
  if (isError || !fear) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginBottom: 20 }}>
          ← Journal
        </button>
        <p className="text-muted">That entry could not be found.</p>
      </div>
    );
  }

  const { full } = dateParts(fear.createdAt);
  const setStatus = (status: Status) => update.mutate({ id: fear.id, status });

  // Explains why a verse row has no text. The detail endpoint always attempts to
  // hydrate before responding, so once we're here with no text it's settled:
  // either the translation has no provider configured on the server (`available`
  // is false), or it does but the passage lookup came back empty.
  const missingTextNote = (translation: string, available: boolean): string => {
    const name = translationLabel(translation);
    return available
      ? `Couldn’t load this passage in ${name}. Check that the reference is right — and if you just added this translation’s API key on the server, redeploy so the new key takes effect.`
      : `The ${name} translation isn’t set up on the server yet — it needs its API key before its text can show. King James is available now.`;
  };

  // Change the translation on one verse. The server replaces the verse list and
  // re-hydrates the passage text in the chosen translation, so we resend the
  // full list with the one verse's translation swapped.
  const changeTranslation = (reference: string, translation: string) => {
    const current = fear.verses.find((v) => v.reference === reference);
    if (!current || current.translation === translation) return;
    setChangingRef(reference);
    setOpen((s) => ({ ...s, [reference]: true }));
    update.mutate(
      {
        id: fear.id,
        refs: fear.verses.map((v) => ({
          reference: v.reference,
          translation: v.reference === reference ? translation : v.translation,
        })),
      },
      { onSettled: () => setChangingRef(null) },
    );
  };

  return (
    <div>
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/')}
        style={{ marginBottom: 20, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}
      >
        ← Journal
      </button>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="tag tag-neutral">{fear.topic}</span>
        <StatusTag status={fear.status} />
        <span className="text-muted" style={{ fontSize: 12 }}>
          Logged {full}
        </span>
      </div>

      <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 10 }}>
        The fear
      </div>
      <h1 style={{ margin: '0 0 28px', fontSize: 'clamp(26px,4vw,40px)', maxWidth: '24ch', textWrap: 'pretty' }}>
        {fear.fear}
      </h1>
      <hr className="hr" style={{ margin: '0 0 28px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 'clamp(24px,4vw,48px)' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 12 }}>
            The truth I'm choosing
          </div>
          <p style={{ fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.55, margin: 0, maxWidth: '46ch', textWrap: 'pretty' }}>
            {fear.truth}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 12 }}>
            Standing on
          </div>
          <div style={{ borderTop: '2px solid var(--color-divider)' }}>
            {fear.verses.length === 0 && (
              <p className="text-muted" style={{ fontSize: 14, padding: '14px 0', margin: 0 }}>
                No verses attached to this one.
              </p>
            )}
            {fear.verses.map((v) => {
              const isOpen = !!open[v.reference];
              const isChanging = changingRef === v.reference;
              return (
                <div key={v.reference} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setOpen((s) => ({ ...s, [v.reference]: !s[v.reference] }))}
                      style={{
                        flex: 1,
                        minWidth: 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        background: 'none',
                        border: 0,
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 800,
                        fontSize: 15,
                        color: 'var(--color-text)',
                      }}
                      aria-expanded={isOpen}
                    >
                      {v.reference}
                      <span style={{ color: 'var(--color-accent-700)', fontSize: 16 }}>{isOpen ? '−' : '+'}</span>
                    </button>
                    {!isChanging && !v.text && (
                      <span
                        title={missingTextNote(v.translation, v.available)}
                        style={{
                          flex: 'none',
                          fontSize: 10,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: 'var(--color-accent-700)',
                          border: '1px solid var(--color-accent-300)',
                          padding: '2px 6px',
                        }}
                      >
                        {v.available ? 'Unavailable' : 'Key needed'}
                      </span>
                    )}
                    <select
                      className="input"
                      value={v.translation}
                      onChange={(e) => changeTranslation(v.reference, e.target.value)}
                      disabled={isChanging}
                      aria-label={`Translation for ${v.reference}`}
                      style={{ width: 'auto', flex: 'none', minHeight: 30, fontSize: 12, padding: '4px 8px' }}
                    >
                      {TRANSLATIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.short}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isOpen && (
                    <p
                      style={{
                        margin: '0 0 16px',
                        fontSize: 14,
                        lineHeight: 1.6,
                        maxWidth: '48ch',
                        paddingLeft: 14,
                        borderLeft: '2px solid var(--color-accent-solid)',
                        textWrap: 'pretty',
                      }}
                    >
                      {isChanging
                        ? 'Loading this translation…'
                        : v.text
                          ? v.text
                          : missingTextNote(v.translation, v.available)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="hr" style={{ margin: '36px 0 20px' }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="text-muted" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', marginRight: 6 }}>
          Move to
        </div>
        <button className="btn btn-secondary" onClick={() => setStatus('Active')}>
          Active
        </button>
        <button className="btn btn-secondary" onClick={() => setStatus('Surrendered')}>
          Surrendered
        </button>
        <button className="btn btn-secondary" onClick={() => setStatus('Resolved')}>
          Resolved
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate(`/fear/${fear.id}/edit`)}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={() => setConfirming(true)}>
            Delete
          </button>
        </div>
      </div>

      {confirming && (
        <DeleteDialog
          fearText={fear.fear}
          busy={remove.isPending}
          onKeep={() => setConfirming(false)}
          onDelete={() =>
            remove.mutate(fear.id, {
              onSuccess: () => navigate('/'),
            })
          }
        />
      )}
    </div>
  );
}
