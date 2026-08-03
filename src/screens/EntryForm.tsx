import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateFear,
  useFear,
  useSuggestVerses,
  useUpdateFear,
} from '../hooks/useFears.ts';
import type { Draft } from '../lib/types.ts';
import { cycleTopic, detectTopic } from '../lib/topics.ts';
import { DEFAULT_TRANSLATION, TRANSLATIONS } from '../lib/translations.ts';

const blankDraft = (): Draft => ({ fear: '', truth: '', topic: null, refs: [] });

export default function EntryForm() {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();

  const existing = useFear(id);
  const create = useCreateFear();
  const update = useUpdateFear();
  const suggest = useSuggestVerses();

  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [manualRef, setManualRef] = useState('');
  const [openSuggestion, setOpenSuggestion] = useState<Record<string, boolean>>({});
  // Verse text we already know (from the loaded entry or from suggestions), so
  // the chosen-verse list and suggestion expanders can show it without a fetch.
  const [verseText, setVerseText] = useState<Record<string, string>>({});

  // Populate the draft once when editing an existing entry.
  useEffect(() => {
    if (editing && existing.data) {
      const f = existing.data;
      setDraft({
        fear: f.fear,
        truth: f.truth,
        topic: f.topic,
        refs: f.verses.map((v) => ({ reference: v.reference, translation: v.translation })),
      });
      setVerseText(
        Object.fromEntries(f.verses.filter((v) => v.text).map((v) => [v.reference, v.text as string])),
      );
    }
  }, [editing, existing.data]);

  const suggestions = suggest.data?.verses ?? [];
  const hasSuggestions = suggestions.length > 0 && !suggest.isPending;

  const setFear = (v: string) =>
    setDraft((d) => ({ ...d, fear: v, topic: v.trim().length > 12 ? detectTopic(v) : null }));

  const hasRef = (refs: Draft['refs'], ref: string) => refs.some((r) => r.reference === ref);
  const addRef = (ref: string, translation = DEFAULT_TRANSLATION) =>
    setDraft((d) =>
      hasRef(d.refs, ref) ? d : { ...d, refs: [...d.refs, { reference: ref, translation }] },
    );
  const removeRef = (ref: string) =>
    setDraft((d) => ({ ...d, refs: d.refs.filter((r) => r.reference !== ref) }));
  const toggleRef = (ref: string) =>
    setDraft((d) =>
      hasRef(d.refs, ref)
        ? { ...d, refs: d.refs.filter((r) => r.reference !== ref) }
        : { ...d, refs: [...d.refs, { reference: ref, translation: DEFAULT_TRANSLATION }] },
    );
  const setRefTranslation = (ref: string, translation: string) =>
    setDraft((d) => ({
      ...d,
      refs: d.refs.map((r) => (r.reference === ref ? { ...r, translation } : r)),
    }));

  const runSuggest = () => {
    if (!draft.fear.trim()) return;
    suggest.mutate(draft.fear, {
      onSuccess: (result) => {
        setVerseText((m) => ({
          ...m,
          ...Object.fromEntries(result.verses.map((v) => [v.reference, v.text])),
        }));
        // Adopt the AI topic if we don't already have a chosen one.
        setDraft((d) => ({ ...d, topic: d.topic ?? result.topic }));
      },
    });
  };

  const addManual = () => {
    const r = manualRef.trim();
    if (!r) return;
    addRef(r);
    setManualRef('');
  };

  const saveDisabled = !draft.fear.trim() || !draft.truth.trim() || create.isPending || update.isPending;
  const saveHint = useMemo(() => {
    if (!draft.fear.trim()) return 'A fear is required.';
    if (!draft.truth.trim()) return "Add the truth you're choosing.";
    return 'Saved privately to your journal.';
  }, [draft.fear, draft.truth]);

  const onSave = () => {
    if (saveDisabled) return;
    const payload = {
      fear: draft.fear.trim(),
      truth: draft.truth.trim(),
      topic: draft.topic ?? undefined,
      refs: draft.refs,
    };
    if (editing && id) {
      update.mutate({ id, ...payload }, { onSuccess: (f) => navigate(`/fear/${f.id}`) });
    } else {
      create.mutate(payload, { onSuccess: (f) => navigate(`/fear/${f.id}`) });
    }
  };

  const suggestLabel = suggest.isPending ? 'Searching…' : suggest.data ? 'Suggest again' : '✦ Suggest verses';

  return (
    <div style={{ maxWidth: 760 }}>
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/')}
        style={{ marginBottom: 20, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}
      >
        ← Journal
      </button>
      <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(28px,4vw,40px)' }}>{editing ? 'Edit entry' : 'New entry'}</h1>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
        Say it plainly. Then answer it.
      </p>
      <hr className="hr" style={{ margin: '0 0 28px' }} />

      {/* 01 — The fear */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
            01 — The fear
          </span>
          <span className="text-muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
            {draft.fear.length ? `${draft.fear.length} characters` : ''}
          </span>
        </div>
        <input
          className="input"
          value={draft.fear}
          onChange={(e) => setFear(e.target.value)}
          placeholder="I'm afraid I will look like a fool if we fail."
          style={{ minHeight: 56, fontSize: 'clamp(16px,2.2vw,20px)', fontFamily: 'var(--font-heading)', fontWeight: 800, letterSpacing: '-0.01em' }}
        />
        {draft.topic && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="text-muted" style={{ fontSize: 12 }}>
              Suggested topic
            </span>
            <span className="tag tag-accent">{draft.topic}</span>
            <button
              className="btn btn-ghost"
              onClick={() => setDraft((d) => ({ ...d, topic: cycleTopic(d.topic) }))}
              style={{ fontSize: 12 }}
            >
              Change
            </button>
          </div>
        )}
      </section>

      {/* 02 — The truth */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 10 }}>
          02 — The truth I'm choosing
        </div>
        <textarea
          className="input"
          value={draft.truth}
          onChange={(e) => setDraft((d) => ({ ...d, truth: e.target.value }))}
          placeholder="Write the truth you're speaking over it — in your own words."
          style={{ minHeight: 130, fontSize: 15, lineHeight: 1.6 }}
        />
      </section>

      {/* 03 — Verses */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
            03 — Verses to stand on
          </span>
          <button
            className="btn btn-secondary"
            onClick={runSuggest}
            disabled={!draft.fear.trim() || suggest.isPending}
            style={{ marginLeft: 'auto' }}
          >
            {suggestLabel}
          </button>
        </div>

        {suggest.isPending && (
          <div style={{ border: '1px solid var(--color-divider)', padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 8, height: 8, background: 'var(--color-accent-solid)', display: 'inline-block', animation: 'ffPulse 1s ease-in-out infinite' }} />
            <span className="text-muted" style={{ fontSize: 13 }}>
              Reading your fear and searching scripture…
            </span>
          </div>
        )}

        {suggest.isError && (
          <p style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>
            {(suggest.error as Error)?.message ?? 'Could not suggest verses.'}
          </p>
        )}

        {hasSuggestions && (
          <div style={{ border: '2px solid var(--color-accent-solid)', padding: 18, marginBottom: 16, animation: 'ffIn .3s ease both' }}>
            <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 4 }}>
              Suggested for this fear
            </div>
            <p className="text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
              Tap a reference to read it. Add the ones that land.
            </p>
            {suggestions.map((s) => {
              const added = draft.refs.some((r) => r.reference === s.reference);
              const isOpen = !!openSuggestion[s.reference];
              return (
                <div key={s.reference} style={{ borderTop: '1px solid var(--color-divider)', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => setOpenSuggestion((m) => ({ ...m, [s.reference]: !m[s.reference] }))}
                      style={{ flex: 1, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}
                    >
                      {s.reference}
                    </button>
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      {s.why}
                    </span>
                    <button className="btn btn-ghost" onClick={() => toggleRef(s.reference)} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {added ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                  {isOpen && (
                    <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, paddingLeft: 14, borderLeft: '2px solid var(--color-accent-300)', maxWidth: '52ch' }}>
                      {s.text || verseText[s.reference] || 'Verse text will load shortly.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ borderTop: '2px solid var(--color-divider)' }}>
          {draft.refs.map((r) => (
            <div key={r.reference} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-divider)', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 15, flex: 'none' }}>{r.reference}</span>
              <span className="text-muted" style={{ fontSize: 13, flex: 1, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {verseText[r.reference] || 'Added manually'}
              </span>
              <select
                className="input"
                value={r.translation}
                onChange={(e) => setRefTranslation(r.reference, e.target.value)}
                aria-label={`Translation for ${r.reference}`}
                style={{ width: 'auto', flex: 'none', minHeight: 30, fontSize: 12, padding: '4px 8px' }}
              >
                {TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.short}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" onClick={() => removeRef(r.reference)} style={{ fontSize: 12 }}>
                Remove
              </button>
            </div>
          ))}
        </div>
        {draft.refs.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13, padding: '14px 0', borderBottom: '1px solid var(--color-divider)', margin: 0 }}>
            No verses yet. Add your own below, or let it suggest some.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <input
            className="input"
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="Add a reference — e.g. Psalm 27:1"
            style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
          />
          <button className="btn btn-secondary" onClick={addManual}>
            Add verse
          </button>
        </div>
      </section>

      <hr className="hr" style={{ margin: '0 0 20px' }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saveDisabled} style={{ minHeight: 42 }}>
          {editing ? 'Save changes' : 'Save entry'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ minHeight: 42 }}>
          Cancel
        </button>
        <span className="text-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
          {saveHint}
        </span>
      </div>
    </div>
  );
}
