import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({
    apiVersion: 'v1beta'
  })],
  // Use a model optimized for fast, multi-turn chat
  model: 'googleai/gemini-2.0-flash', 
});
