import { useMemo } from 'react';
import type { Fear } from '../lib/types.ts';

interface Props {
  fears: Fear[]; // the full set — cloud counts are not filtered by status/search
  selected: string | null;
  onPick: (topic: string) => void;
}

interface CloudItem {
  name: string;
  count: number;
  size: number;
  color: string;
  rule: string;
  meta: string;
  bar: number;
}

// The word cloud. Size encodes how often a topic comes up; color encodes how
// unanswered it is. Order is woven (not sorted) so the biggest word lands
// mid-cloud and it reads as a cloud rather than a ranked chart.
export default function TopicCloud({ fears, selected, onPick }: Props) {
  const { cloud, lead, sub, rowsLabel } = useMemo(() => {
    const stats: Record<string, { n: number; active: number }> = {};
    for (const f of fears) {
      const t = (stats[f.topic] = stats[f.topic] ?? { n: 0, active: 0 });
      t.n++;
      if (f.status === 'Active') t.active++;
    }
    const names = Object.keys(stats);
    const max = Math.max(1, ...names.map((n) => stats[n].n));
    const min = Math.min(...names.map((n) => stats[n].n), max);

    // Alternate big/small so the cloud reads as a cloud, not a sorted chart.
    const byWeight = names.slice().sort((a, b) => stats[b].n - stats[a].n || a.localeCompare(b));
    const woven: string[] = [];
    byWeight.forEach((n, i) => (i % 2 ? woven.push(n) : woven.unshift(n)));

    const items: CloudItem[] = woven.map((name) => {
      const t = stats[name];
      const ratio = max === min ? 1 : (t.n - min) / (max - min);
      const live = t.active / t.n;
      const on = selected === name;
      const dim = selected && !on;
      return {
        name,
        count: t.n,
        size: Math.round(26 + ratio * 46),
        // Unanswered topics carry the accent; worked-through ones recede to ink.
        color: on
          ? 'var(--color-accent)'
          : dim
            ? 'color-mix(in srgb, var(--color-text) 52%, transparent)'
            : live > 0.6
              ? 'var(--color-accent)'
              : live > 0.2
                ? 'color-mix(in srgb, var(--color-text) 85%, transparent)'
                : 'color-mix(in srgb, var(--color-text) 68%, transparent)',
        rule: on ? '2px solid var(--color-accent-solid)' : '2px solid transparent',
        meta: `${t.n} logged · ${t.active} active`,
        bar: Math.round((t.active / t.n) * 100),
      };
    });

    const total = fears.length;
    const legendActive = fears.filter((f) => f.status === 'Active').length;
    const legendTopic = byWeight[0];

    return {
      cloud: items,
      lead: legendTopic ? `“${legendTopic}” is the loudest thing on the list right now.` : '',
      sub: `${legendActive} of ${total} entries are still unanswered. Size shows how often a topic comes up; blue means most of it is still active.`,
      rowsLabel: selected ? selected : 'All entries',
    };
  }, [fears, selected]);

  return (
    <div style={{ marginBottom: 32 }}>
      {/* 1. Cloud panel */}
      <div
        style={{
          border: '2px solid var(--color-text)',
          padding: 'clamp(28px,5vw,64px) clamp(20px,4vw,56px)',
          background: 'var(--color-neutral-100)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 'clamp(10px,2vw,18px) clamp(20px,4vw,44px)',
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          {cloud.map((t) => (
            <button
              key={t.name}
              onClick={() => onPick(t.name)}
              title={t.meta}
              style={{
                background: 'none',
                border: 0,
                borderBottom: t.rule,
                padding: '2px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
                fontSize: t.size,
                color: t.color,
              }}
            >
              {t.name}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400,
                  fontSize: 11,
                  verticalAlign: 'super',
                  marginLeft: 3,
                  opacity: 0.5,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Legend strip */}
      <div
        style={{
          display: 'flex',
          gap: 'clamp(16px,3vw,40px)',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          border: '2px solid var(--color-text)',
          borderTop: 0,
          padding: '18px clamp(20px,4vw,56px)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '-0.015em',
            maxWidth: '34ch',
            textWrap: 'pretty',
          }}
        >
          {lead}
        </p>
        <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5, maxWidth: '46ch', textWrap: 'pretty' }}>
          {sub}
        </p>
      </div>

      {/* 3. Per-topic strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', border: '2px solid var(--color-text)', borderTop: 0 }}>
        {cloud.map((t) => (
          <button
            key={t.name}
            onClick={() => onPick(t.name)}
            style={{
              flex: '1 1 150px',
              textAlign: 'left',
              background: 'none',
              border: 0,
              borderRight: '1px solid var(--color-divider)',
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 13, color: 'var(--color-text)' }}>
              {t.name}
            </span>
            <span style={{ display: 'block', width: '100%', height: 4, background: 'var(--color-neutral-300)' }}>
              <span style={{ display: 'block', height: 4, width: `${t.bar}%`, background: 'var(--color-accent-solid)' }} />
            </span>
            <span className="text-muted" style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {t.meta}
            </span>
          </button>
        ))}
      </div>

      {/* Filter kicker above the rows */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
          {rowsLabel}
        </div>
        <div style={{ flex: 1, height: 2, background: 'var(--color-text)' }} />
      </div>
    </div>
  );
}
