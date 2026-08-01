import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFears } from '../hooks/useFears.ts';
import type { Fear } from '../lib/types.ts';
import { todayLabel } from '../lib/format.ts';
import FearRow from '../components/FearRow.tsx';
import TopicCloud from '../components/TopicCloud.tsx';

const STATUS_FILTERS = ['All', 'Active', 'Surrendered', 'Resolved'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// A small headless segmented control built on buttons (aria-pressed drives the
// styling in index.css).
function Seg<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="seg" role="group" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className="seg-opt"
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: fears = [], isLoading, isError, error } = useFears();
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const status = (STATUS_FILTERS as readonly string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as StatusFilter)
    : 'All';
  const topic = params.get('topic');
  const view = params.get('view') === 'cloud' ? 'cloud' : 'list';

  // Immutably update one search param, dropping empties so URLs stay clean.
  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(params);
    if (val === null || val === '' || val === 'All' || val === 'list') next.delete(key);
    else next.set(key, val);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: Fear[] = fears;
    if (status !== 'All') list = list.filter((f) => f.status === status);
    if (topic) list = list.filter((f) => f.topic === topic);
    if (q) {
      list = list.filter((f) =>
        (
          f.fear +
          ' ' +
          f.truth +
          ' ' +
          f.topic +
          ' ' +
          f.verses.map((v) => v.reference).join(' ') +
          ' ' +
          f.verses.map((v) => v.text ?? '').join(' ')
        )
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [fears, query, status, topic]);

  const total = fears.length;
  const activeN = fears.filter((f) => f.status === 'Active').length;
  const noneAtAll = total === 0;
  const countLine = noneAtAll
    ? 'Nothing logged yet.'
    : `${total} entries · ${activeN} still active · ${total - activeN} answered`;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 8 }}>
            {todayLabel()}
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px,4.4vw,42px)' }}>Your journal</h1>
          <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
            {countLine}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new')} style={{ minHeight: 40 }}>
          ＋ New entry
        </button>
      </div>

      <hr className="hr" style={{ margin: '0 0 16px' }} />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          className="input"
          value={query}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Search fears, truths, verses…"
          style={{ flex: 1, minWidth: 220, maxWidth: 380, minHeight: 38 }}
        />
        <Seg
          name="Status filter"
          options={STATUS_FILTERS}
          value={status}
          onChange={(v) => setParam('status', v)}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Seg
            name="View"
            options={['List', 'Topics'] as const}
            value={view === 'cloud' ? 'Topics' : 'List'}
            onChange={(v) => setParam('view', v === 'Topics' ? 'cloud' : 'list')}
          />
        </div>
      </div>

      {topic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span className="tag tag-accent">{topic}</span>
          <button className="btn btn-ghost" onClick={() => setParam('topic', null)} style={{ fontSize: 12 }}>
            Clear topic filter ✕
          </button>
        </div>
      )}

      {view === 'cloud' && !noneAtAll && (
        <TopicCloud
          fears={fears}
          selected={topic}
          onPick={(t) => setParam('topic', topic === t ? null : t)}
        />
      )}

      {isLoading && (
        <p className="text-muted" style={{ padding: '20px 0' }}>
          Loading your journal…
        </p>
      )}
      {isError && (
        <p style={{ padding: '20px 0', color: 'var(--color-accent-700)' }}>
          {(error as Error)?.message ?? 'Could not load your journal.'}
        </p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div>
          {rows.map((f) => (
            <FearRow key={f.id} fear={f} />
          ))}
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState noneAtAll={noneAtAll} onWriteFirst={() => navigate('/new')} />
      )}
    </div>
  );
}

function EmptyState({ noneAtAll, onWriteFirst }: { noneAtAll: boolean; onWriteFirst: () => void }) {
  return (
    <div style={{ border: '2px dashed var(--color-divider)', padding: 'clamp(32px,6vw,72px)', textAlign: 'left', marginTop: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 10 }}>
        {noneAtAll ? 'Start here' : 'Nothing matches'}
      </div>
      <h3 style={{ margin: '0 0 10px', maxWidth: '20ch' }}>
        {noneAtAll ? 'No fears written down yet' : 'No entries match that'}
      </h3>
      <p className="text-muted" style={{ fontSize: 14, maxWidth: '52ch' }}>
        {noneAtAll
          ? "Write the thing you're actually afraid of, in the words you'd use out loud. Then answer it with what's true."
          : 'Try a different search, status, or clear the topic filter.'}
      </p>
      {noneAtAll && (
        <button className="btn btn-primary" onClick={onWriteFirst} style={{ minHeight: 40, marginTop: 8 }}>
          Write the first one
        </button>
      )}
    </div>
  );
}
