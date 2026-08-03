import Anthropic from '@anthropic-ai/sdk';
import { detectTopic, TOPICS } from './topics.js';
import { hydrateVerses } from './bible.js';

// Server-side AI verse suggestion.
//
// Calls Claude with the fear text and asks — via structured JSON output — for a
// topic plus 4–5 scripture references, each with a one-line reason. The verse
// TEXT is not trusted to the model: we hydrate it from a licensed public-domain
// Bible source (see bible.ts) so translations stay correct and consistent.

export interface SuggestedVerse {
  reference: string;
  text: string;
  why: string;
}

export interface SuggestResult {
  topic: string;
  verses: SuggestedVerse[];
}

const MODEL = process.env.SUGGEST_MODEL || 'claude-opus-5';

const SCHEMA = {
  type: 'object',
  properties: {
    topic: {
      type: 'string',
      description: `The single best-fitting topic for this fear. Prefer one of: ${TOPICS.join(', ')}.`,
    },
    verses: {
      type: 'array',
      description: '4 to 5 Bible verses that speak truth over this fear.',
      items: {
        type: 'object',
        properties: {
          reference: {
            type: 'string',
            description: 'A standard Bible reference, e.g. "Psalm 34:5" or "Isaiah 41:10".',
          },
          why: {
            type: 'string',
            description: 'One short line (max ~12 words) on why this verse answers the fear.',
          },
        },
        required: ['reference', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['topic', 'verses'],
  additionalProperties: false,
} as const;

const SYSTEM = `You are a gentle, biblically-grounded companion inside a private journaling app.
Given a fear someone has written, name the topic it belongs to and suggest 4–5 Bible
verses that speak truth over that specific fear. Choose well-known, widely-translated
passages. Each "why" is one short, warm line. Do not quote the verse text — only the
reference and the reason. Never invent references that do not exist.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set. See .env.example.');
    }
    client = new Anthropic();
  }
  return client;
}

interface ModelVerse {
  reference: string;
  why: string;
}

async function askModel(fear: string): Promise<{ topic: string; verses: ModelVerse[] }> {
  const response = await getClient().messages.create({
    model: MODEL,
    // Room for the structured JSON; on models where thinking is on by default
    // a tighter cap can truncate the output and break JSON.parse below.
    max_tokens: 2048,
    system: SYSTEM,
    // Keep latency low for the loading strip; the task is simple extraction.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SCHEMA },
    },
    messages: [{ role: 'user', content: `The fear:\n\n${fear.trim()}` }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No structured output returned from the model.');
  }
  const parsed = JSON.parse(textBlock.text) as { topic?: string; verses?: ModelVerse[] };
  return {
    topic: parsed.topic?.trim() || detectTopic(fear),
    verses: Array.isArray(parsed.verses) ? parsed.verses.slice(0, 5) : [],
  };
}

export async function suggestVerses(fear: string): Promise<SuggestResult> {
  const { topic, verses } = await askModel(fear);

  const references = verses.map((v) => v.reference);
  const texts = await hydrateVerses(references);

  return {
    topic,
    verses: verses.map((v) => ({
      reference: v.reference,
      why: v.why,
      text: texts[v.reference.trim()] || '',
    })),
  };
}
