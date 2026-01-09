import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini Service
 * 
 * Responsibilities:
 * - Initialize Gemini using API key from environment variables
 * - Expose a function that takes a prompt string
 * - Call Gemini model (gemini-2.5-flash)
 * - Return raw text response
 */

let genAI = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Calls Gemini API with a prompt and returns raw text response
 * 
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} Raw text response from Gemini
 */
export async function callGemini(prompt) {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return responseText;
  } catch (error) {
    console.error('[Gemini Service] API error:', error);
    throw new Error(`Gemini API call failed: ${error.message}`);
  }
}
