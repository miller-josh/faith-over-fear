// Client-side topic heuristic — used only for the instant "suggested topic" tag
// while typing (past 12 characters). The authoritative topic on save comes from
// the AI suggestion or the server-side fallback (api/_lib/topics.ts).

export const TOPICS = [
  'Work',
  'Health',
  'Provision',
  'Family',
  'The future',
  'Reputation',
  'Everyday',
] as const;

const KEYS: { words: string[]; topic: string }[] = [
  { words: ['fool', 'look', 'fail', 'embarrass', 'shame', 'judge', 'opinion', 'think of me'], topic: 'Reputation' },
  { words: ['money', 'afford', 'pay', 'job', 'contract', 'income', 'bills', 'rent'], topic: 'Provision' },
  { words: ['sick', 'test', 'doctor', 'cancer', 'health', 'pain', 'surgery', 'diagnos'], topic: 'Health' },
  { words: ['kid', 'son', 'daughter', 'child', 'wife', 'husband', 'family', 'mom', 'dad'], topic: 'Family' },
  { words: ['work', 'boss', 'team', 'project', 'launch', 'deadline', 'meeting', 'present'], topic: 'Work' },
  { words: ['fly', 'plane', 'drive', 'alone', 'dark', 'night', 'tomorrow'], topic: 'Everyday' },
];

export function detectTopic(text: string): string {
  const t = (text || '').toLowerCase();
  for (const k of KEYS) if (k.words.some((w) => t.includes(w))) return k.topic;
  return 'The future';
}

// Cycles to the next topic in the list — for the "Change" button on the tag.
export function cycleTopic(current: string | null): string {
  const i = TOPICS.indexOf((current ?? '') as (typeof TOPICS)[number]);
  return TOPICS[(i + 1) % TOPICS.length];
}
