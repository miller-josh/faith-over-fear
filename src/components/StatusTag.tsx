import type { Status } from '../lib/types.ts';

// Status tags: Active → outline · Surrendered → accent · Resolved → neutral.
// Status is additionally carried by these tags (not by color alone), per the
// accessibility note in the handoff.
export function statusClass(status: Status): string {
  if (status === 'Active') return 'tag tag-outline';
  if (status === 'Surrendered') return 'tag tag-accent';
  return 'tag tag-neutral';
}

export default function StatusTag({ status }: { status: Status }) {
  return <span className={statusClass(status)}>{status}</span>;
}
