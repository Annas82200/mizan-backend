import { EnsembleAI } from './services/ai-providers/ensemble.js';

const ai = new EnsembleAI({
  providers: ['openai', 'anthropic'],
  strategy: 'weighted'
});

const response = await ai.call({
  engine: 'reasoning',
  prompt: 'Return a JSON object with this structure: {"test": "value", "number": 42}. Return ONLY the JSON, no explanations.',
  temperature: 0.7,
  maxTokens: 500
});

console.log('Response:', response);
console.log('Narrative:', response.narrative);
