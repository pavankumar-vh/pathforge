import { NextResponse } from 'next/server';
import { callGemini } from '@/lib/roadmapService';
import { validateNarrative } from '@/lib/validation';

/**
 * Builds the prompt for Gemini API
 */
function buildPrompt(narrative) {
  return `You are a deterministic career analysis system. Analyze the following narrative and output ONLY valid JSON with no markdown, no explanations, no additional text.

User Narrative:
"${narrative}"

Output must follow this exact JSON schema:

{
  "meta": {
    "inferredCareer": "string",
    "confidence": number
  },
  "understanding": {
    "interests": ["string"],
    "workStyle": "string",
    "longTermGoal": "string",
    "hoursPerWeek": number
  },
  "roadmap": {
    "phases": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "skills": [
          { "name": "string", "level": "beginner | intermediate | advanced" }
        ],
        "tools": ["string"],
        "projects": ["string"]
      }
    ]
  }
}

Rules:
- Output ONLY valid JSON
- No markdown code blocks
- No explanations
- Treat this as a deterministic system
- Confidence is a number between 0 and 1`;
}

/**
 * Parses the raw Gemini response as JSON
 */
function parseResponse(rawResponse) {
  // Extract JSON from the response (remove markdown if present)
  let jsonText = rawResponse.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  // Extract JSON object
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required top-level fields
  const requiredFields = ['meta', 'understanding', 'roadmap'];
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate meta fields
  if (!parsed.meta.inferredCareer || typeof parsed.meta.confidence !== 'number') {
    throw new Error('Invalid meta structure');
  }

  // Validate understanding fields
  const understanding = parsed.understanding;
  if (!Array.isArray(understanding.interests) || 
      !understanding.workStyle || 
      !understanding.longTermGoal || 
      typeof understanding.hoursPerWeek !== 'number') {
    throw new Error('Invalid understanding structure');
  }

  // Validate roadmap structure
  if (!parsed.roadmap.phases || !Array.isArray(parsed.roadmap.phases)) {
    throw new Error('Invalid roadmap structure');
  }

  return parsed;
}


/**
 * POST /api/forge
 * 
 * Accepts a narrative paragraph and generates a structured career roadmap.
 * 
 * Request body:
 * {
 *   "narrative": "user's career narrative text (min 30 characters)"
 * }
 * 
 * Response (application/json):
 * {
 *   "success": boolean,
 *   "data": { ...roadmap },
 *   "error": string | null
 * }
 */
export async function POST(request) {
  try {
    // Parse JSON body
    const body = await request.json();
    const { narrative } = body;

    // Validate narrative exists and meets length requirement
    const validation = validateNarrative(narrative);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: validation.error,
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call helper function to run Gemini AI
    const prompt = buildPrompt(narrative);
    const rawResponse = await callGemini(prompt);

    // Parse AI response as JSON
    const roadmap = parseResponse(rawResponse);

    // Return parsed JSON response
    return NextResponse.json(
      {
        success: true,
        data: roadmap,
        error: null,
      },
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[/api/forge] Error:', error.message);

    // Handle errors gracefully with proper status codes
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error.message || 'Internal server error',
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST instead.',
    },
    { status: 405 }
  );
}
