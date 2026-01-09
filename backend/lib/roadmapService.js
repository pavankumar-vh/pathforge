import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Lazy-initialized Gemini AI client
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
 * Generates a structured career roadmap from a narrative paragraph
 * using Google Gemini API.
 * 
 * @param {string} narrative - User's career narrative/background
 * @returns {Promise<Object>} Structured career roadmap
 */
export async function generateCareerRoadmap(narrative) {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = buildPrompt(narrative);

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse and validate the JSON response
    const roadmap = parseRoadmapResponse(responseText);
    return roadmap;
  } catch (error) {
    console.error('[roadmapService] Gemini API error:', error);
    throw new Error(`Failed to generate roadmap: ${error.message}`);
  }
}

/**
 * Builds the prompt for the Gemini API
 * 
 * @param {string} narrative - User's career narrative
 * @returns {string} Formatted prompt
 */
function buildPrompt(narrative) {
  return `You are a career counselor and strategic planner. Based on the following narrative about a person's career background and aspirations, create a detailed career roadmap.

User's Narrative:
"${narrative}"

Please analyze this narrative and provide a structured JSON response with the following format (respond ONLY with valid JSON, no additional text):

{
  "title": "A concise title for the career path",
  "summary": "2-3 sentence overview of the recommended career direction",
  "phases": [
    {
      "phase": 1,
      "name": "Phase name",
      "duration": "estimated timeframe",
      "objectives": ["objective 1", "objective 2"],
      "actions": ["action 1", "action 2"]
    }
  ],
  "milestones": [
    {
      "milestone": "Specific achievement",
      "timeline": "when to achieve it",
      "description": "why this matters"
    }
  ],
  "skills": [
    {
      "category": "skill category",
      "skills": ["skill 1", "skill 2"],
      "priority": "high/medium/low"
    }
  ],
  "resources": [
    {
      "type": "certifications/courses/books/communities",
      "recommendations": ["resource 1", "resource 2"]
    }
  ]
}

Ensure the response is valid JSON that can be parsed. Make the roadmap realistic, actionable, and tailored to the narrative provided.`;
}

/**
 * Parses and validates the Gemini API response
 * 
 * @param {string} responseText - Raw response text from Gemini
 * @returns {Object} Parsed and validated roadmap object
 */
function parseRoadmapResponse(responseText) {
  try {
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const roadmap = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const requiredFields = ['title', 'summary', 'phases', 'milestones', 'skills'];
    for (const field of requiredFields) {
      if (!(field in roadmap)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Ensure arrays are properly formatted
    if (!Array.isArray(roadmap.phases)) roadmap.phases = [];
    if (!Array.isArray(roadmap.milestones)) roadmap.milestones = [];
    if (!Array.isArray(roadmap.skills)) roadmap.skills = [];
    if (!Array.isArray(roadmap.resources)) roadmap.resources = [];

    return roadmap;
  } catch (error) {
    console.error('[parseRoadmapResponse] Parsing error:', error);
    throw new Error(`Invalid roadmap response format: ${error.message}`);
  }
}
