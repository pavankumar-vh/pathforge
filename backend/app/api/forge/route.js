import { NextResponse } from 'next/server';
import { generateCareerRoadmap } from '@/lib/roadmapService';
import { validateNarrative } from '@/lib/validation';

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
    const roadmap = await generateCareerRoadmap(narrative);

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
