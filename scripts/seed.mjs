// Seeds ~15 entries across 7 topics for one user, so the Topics cloud has a
// believable distribution in dev. Requires the schema to already exist.
//
// Usage: DATABASE_URL=... SEED_USER_ID=<clerk user id> node scripts/seed.mjs
//
// Find your Clerk user id in the Clerk dashboard (Users), or log
// `useAuth().userId` in the app while signed in.
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
const userId = process.env.SEED_USER_ID;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!userId) {
  console.error('SEED_USER_ID is not set (your Clerk user id, e.g. user_2ab...).');
  process.exit(1);
}

const sql = neon(url);

const SEED = [
  { fear: "I'm afraid I will look like a fool if we fail.", topic: 'Reputation', status: 'Active', truth: "My name isn't on the line the way I think it is. I was not given a spirit of fear, and a failed launch doesn't get to tell me who I am.", refs: ['Psalm 34:5', '2 Timothy 1:7', 'Galatians 1:10'], daysAgo: 4 },
  { fear: "I'm afraid the results will come back with bad news.", topic: 'Health', status: 'Surrendered', truth: "I don't have to carry Thursday today. Whatever the result is, He is already there and already holding me.", refs: ['Isaiah 41:10', 'Psalm 56:3', 'Lamentations 3:22-23'], daysAgo: 11 },
  { fear: "I'm afraid the money runs out before the next contract lands.", topic: 'Provision', status: 'Active', truth: "I've never once been dropped. Seeking Him first has never left me short — I'm going to work hard and stop rehearsing the worst case.", refs: ['Matthew 6:33', 'Philippians 4:19'], daysAgo: 18 },
  { fear: "I'm afraid my kids will walk away from what we've taught them.", topic: 'Family', status: 'Active', truth: 'They are His before they are mine. My job is to be faithful in front of them, not to control the outcome.', refs: ['Isaiah 54:13', 'Proverbs 22:6', '1 Peter 5:7'], daysAgo: 32 },
  { fear: "I'm afraid of the flight to Denver next week.", topic: 'Everyday', status: 'Resolved', truth: "I've made this exact flight nine times. Peace is something I'm given, not something I have to manufacture at 30,000 feet.", refs: ['Psalm 23:4', 'John 14:27'], daysAgo: 50 },
  { fear: "I'm afraid they'll finally see I don't know what I'm doing.", topic: 'Reputation', status: 'Active', truth: "Everyone is figuring it out. Being found out as human is not a catastrophe — and I don't answer to the room.", refs: ['Galatians 1:10', 'Psalm 34:5'], daysAgo: 8 },
  { fear: "I'm afraid I'll say the wrong thing in the review and it'll follow me.", topic: 'Work', status: 'Active', truth: "One sentence doesn't define a career. I can prepare, speak plainly, and let it go.", refs: ['Joshua 1:9', 'Proverbs 3:5-6'], daysAgo: 13 },
  { fear: "I'm afraid nobody will hire me again if this project sinks.", topic: 'Reputation', status: 'Surrendered', truth: "My provision has never depended on one client's opinion of me.", refs: ['Philippians 4:19', 'Romans 8:31'], daysAgo: 24 },
  { fear: "I'm afraid of the pain coming back before the surgery date.", topic: 'Health', status: 'Active', truth: "I get today's grace today. I don't have to pre-suffer next month.", refs: ['Lamentations 3:22-23', 'Matthew 11:28'], daysAgo: 30 },
  { fear: "I'm afraid I'll never be able to afford a house here.", topic: 'Provision', status: 'Active', truth: "A roof is not the measure of whether I'm cared for. I've been fed every single day so far.", refs: ['Matthew 6:33', 'Hebrews 13:5'], daysAgo: 36 },
  { fear: "I'm afraid of what the next ten years look like if nothing changes.", topic: 'The future', status: 'Active', truth: "I'm not asked to see ten years. I'm asked to be faithful with this week.", refs: ['Proverbs 3:5-6', 'Psalm 121:2'], daysAgo: 42 },
  { fear: "I'm afraid my dad's health will turn while I'm across the country.", topic: 'Family', status: 'Active', truth: "Distance doesn't put him outside God's reach. I can call him tonight instead of rehearsing the worst.", refs: ['Psalm 121:2', '1 Peter 5:7'], daysAgo: 47 },
  { fear: "I'm afraid the tiredness means something is actually wrong.", topic: 'Health', status: 'Resolved', truth: 'The bloodwork came back clean. I was carrying a diagnosis I never had.', refs: ['Psalm 56:3', 'Isaiah 41:10'], daysAgo: 58 },
  { fear: "I'm afraid I'm choosing wrong and I'll waste years finding out.", topic: 'The future', status: 'Surrendered', truth: "There's no decision so bad it puts me out of reach. He redirects people who are moving.", refs: ['Proverbs 3:5-6', 'Isaiah 41:10'], daysAgo: 65 },
  { fear: "I'm afraid the team will lose respect for me if I ask for help.", topic: 'Work', status: 'Resolved', truth: 'I asked. They helped. The thing I feared cost me nothing and the silence was costing me everything.', refs: ['Romans 8:31', 'Matthew 11:28'], daysAgo: 74 },
];

await sql`delete from fears where user_id = ${userId}`;

for (const s of SEED) {
  const created = new Date();
  created.setDate(created.getDate() - s.daysAgo);
  const iso = created.toISOString();
  const rows = await sql`
    insert into fears (user_id, fear, truth, topic, status, created_at, updated_at)
    values (${userId}, ${s.fear}, ${s.truth}, ${s.topic}, ${s.status}, ${iso}, ${iso})
    returning id
  `;
  const fearId = rows[0].id;
  await sql`
    insert into fear_verses (fear_id, reference, position)
    select ${fearId}::uuid, r.reference, r.position
    from unnest(${s.refs}::text[]) with ordinality as r(reference, position)
  `;
}

console.log(`Seeded ${SEED.length} entries for ${userId}.`);
