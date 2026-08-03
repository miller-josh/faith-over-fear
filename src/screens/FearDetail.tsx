import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeleteFear, useFear, useUpdateFear } from '../hooks/useFears.ts';
import type { Status } from '../lib/types.ts';
import { dateParts } from '../lib/format.ts';
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
              return (
                <div key={v.reference} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                  <button
                    onClick={() => setOpen((s) => ({ ...s, [v.reference]: !s[v.reference] }))}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      background: 'none',
                      border: 0,
                      padding: '14px 0',
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
                      {v.text ?? 'Verse text will load shortly.'}
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
