import { NextResponse } from 'next/server';
import { callGemini } from '@/lib/roadmapService';
import { validateNarrative } from '@/lib/validation';

/**
 * Builds the prompt for Gemini API
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
 * Parses the raw Gemini response as JSON
 */
function parseResponse(rawResponse) {
  // Extract JSON from the response
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required fields
  const requiredFields = ['title', 'summary', 'phases', 'milestones', 'skills'];
  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Ensure arrays are properly formatted
  if (!Array.isArray(parsed.phases)) parsed.phases = [];
  if (!Array.isArray(parsed.milestones)) parsed.milestones = [];
  if (!Array.isArray(parsed.skills)) parsed.skills = [];
  if (!Array.isArray(parsed.resources)) parsed.resources = [];

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
