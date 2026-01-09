import { NextResponse } from 'next/server';
import { generateCareerRoadmap } from '@/lib/roadmapService';
import { validateNarrative } from '@/lib/validation';

/**
 * POST /api/forge
 * 
 * Accepts a narrative paragraph and generates a structured career roadmap
 * using Google Gemini API.
 * 
 * Request body:
 * {
 *   "narrative": "user's career narrative text"
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "title": string,
 *     "summary": string,
 *     "phases": [...],
 *     "milestones": [...],
 *     "skills": [...]
 *   },
 *   "error": string | null
 * }
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { narrative } = body;

    // Validate input
    const validation = validateNarrative(narrative);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Generate career roadmap using Gemini API
    const roadmap = await generateCareerRoadmap(narrative);

    return NextResponse.json(
      {
        success: true,
        data: roadmap,
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[/api/forge] Error:', error.message);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
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
