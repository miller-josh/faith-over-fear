import { useNavigate } from 'react-router-dom';
import type { Fear } from '../lib/types.ts';
import { dateParts } from '../lib/format.ts';
import StatusTag from './StatusTag.tsx';

// One row per fear, whole row clickable → detail. 86px date gutter · main column
// (topic + status tags, the fear, the truth preview behind a 2px accent rule) ·
// right column with the verse count and reference list.
export default function FearRow({ fear }: { fear: Fear }) {
  const navigate = useNavigate();
  const { day, month } = dateParts(fear.createdAt);
  const count = fear.verses.length;
  const verseCount = `${count} ${count === 1 ? 'verse' : 'verses'}`;
  const verseList = fear.verses.map((v) => v.reference).join(' · ');

  return (
    <div
      onClick={() => navigate(`/fear/${fear.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/fear/${fear.id}`);
      }}
      style={{
        display: 'flex',
        gap: 'clamp(14px,3vw,32px)',
        flexWrap: 'wrap',
        padding: '20px 0',
        borderBottom: '1px solid var(--color-divider)',
        cursor: 'pointer',
        animation: 'ffIn .25s ease both',
      }}
    >
      <div style={{ width: 86, flex: 'none' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 13, letterSpacing: '.04em' }}>
          {day}
        </div>
        <div className="text-muted" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {month}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="tag tag-neutral">{fear.topic}</span>
          <StatusTag status={fear.status} />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 'clamp(17px,2.2vw,21px)',
            lineHeight: 1.22,
            letterSpacing: '-0.015em',
            marginBottom: 8,
            textWrap: 'pretty',
          }}
        >
          {fear.fear}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 2, alignSelf: 'stretch', flex: 'none', backgroundColor: '#848EF0' }} />
          <p className="text-muted" style={{ margin: 0, fontSize: 14, maxWidth: '62ch', textWrap: 'pretty' }}>
            {fear.truth}
          </p>
        </div>
      </div>
      <div
        style={{
          flex: 'none',
          minWidth: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        <div className="text-muted" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {verseCount}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-accent-700)', lineHeight: 1.5 }}>{verseList}</div>
      </div>
    </div>
  );
}
