// Topic taxonomy and keyword→topic matching, shared by the AI endpoint (as a
// fallback when the model doesn't return a topic) and the create/update routes.
// Mirrors the client-side heuristic in src/lib/topics.ts so an offline "suggested
// topic" tag and the server-side topic agree.

export const TOPICS = [
  'Work',
  'Health',
  'Provision',
  'Family',
  'The future',
  'Reputation',
  'Everyday',
] as const;

export type Topic = (typeof TOPICS)[number] | string;

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
