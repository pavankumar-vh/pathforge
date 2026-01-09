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
    ],
    "resources": {
      "learning": [
        {
          "skill": "string",
          "type": "youtube | documentation | course",
          "title": "string",
          "description": "string"
        }
      ],
      "communities": [
        {
          "name": "string",
          "platform": "discord | reddit | forum",
          "purpose": "string"
        }
      ]
    }
  }
}

Rules:
- Output ONLY valid JSON
- No markdown code blocks
- No explanations
- Treat this as a deterministic system
- Confidence is a number between 0 and 100

/**
 * Career-aware filtering:
 * - Resources must align with inferredCareer
 * - Do not suggest irrelevant tools or skills
 * - Keep roadmap focused, not bloated
 */

/**
 * Improve project suggestions:
 * - Projects should increase in complexity across phases
 * - Projects must align with real-world expectations
 * - Avoid vague project names like "Build an app"
 * - Each project should sound resume-worthy
 */

/**
 * In addition to roadmap phases, also generate learning resources.
 *
 * Resource rules:
 * - Prefer YouTube channels, official docs, and free courses
 * - Resources must map clearly to skills in the roadmap
 * - No links required, only titles and descriptions
 * - Avoid generic or vague resources
 * - Resources should help a beginner start immediately
 * - Resources must be relevant to the inferred career
 * - Avoid paid-only platforms unless unavoidable
 * 
 * Resource quality rules:
 * - No duplicated resources
 * - No overly generic titles
 * - Prefer well-known creators or official documentation
 * - Descriptions should explain WHY the resource matters
 */`;
}

/**
 * Parses the raw Gemini response as JSON
 * 
 * Enforces backend response stability:
 * - Ensures all required top-level keys exist
 * - Adds safe defaults for optional/missing fields
 * - Never returns partial or malformed data to frontend
 */
function parseResponse(rawResponse) {
  // Sanitize AI output
  let jsonText = rawResponse.trim();
  
  // Remove leading/trailing backticks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  
  // Remove any remaining backticks
  jsonText = jsonText.replace(/^`+|`+$/g, '');
  
  // Trim whitespace again after backtick removal
  jsonText = jsonText.trim();
  
  // Ensure pure JSON string - extract JSON object
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

  // Ensure meta structure with safe defaults
  /**
   * Normalize confidence score:
   * - Ensure value is between 0 and 100
   * - Clamp values outside range
   * - Default to 60 if missing
   */
  const meta = {
    inferredCareer: parsed.meta?.inferredCareer || 'Unknown Career Path',
    confidence: typeof parsed.meta?.confidence === 'number' 
      ? Math.max(0, Math.min(100, parsed.meta.confidence)) 
      : 60
  };

  // Ensure understanding structure with safe defaults
  const understanding = {
    interests: Array.isArray(parsed.understanding?.interests) 
      ? parsed.understanding.interests 
      : [],
    workStyle: parsed.understanding?.workStyle || 'Not specified',
    longTermGoal: parsed.understanding?.longTermGoal || 'Career growth and development',
    hoursPerWeek: typeof parsed.understanding?.hoursPerWeek === 'number' 
      ? Math.max(0, parsed.understanding.hoursPerWeek) 
      : 20
  };

  // Ensure roadmap structure with safe defaults
  /**
   * Ensure roadmap phases:
   * - Have unique IDs
   * - Are ordered logically
   * - Use stable ID format (phase-1, phase-2, etc.)
   */
  const phases = Array.isArray(parsed.roadmap?.phases) 
    ? parsed.roadmap.phases.map((phase, index) => ({
        id: `phase-${index + 1}`,
        title: phase.title || `Phase ${index + 1}`,
        description: phase.description || '',
        skills: Array.isArray(phase.skills) 
          ? phase.skills.map(skill => ({
              name: skill.name || 'Unnamed skill',
              level: ['beginner', 'intermediate', 'advanced'].includes(skill.level) 
                ? skill.level 
                : 'beginner'
            }))
          : [],
        tools: Array.isArray(phase.tools) ? phase.tools : [],
        projects: Array.isArray(phase.projects) ? phase.projects : []
      }))
    : [];

  /**
   * Extend the backend response to include learning resources.
   *
   * New field to add:
   * roadmap.resources
   *
   * Structure:
   * {
   *   "resources": {
   *     "learning": [
   *       {
   *         "skill": "string",
   *         "type": "youtube | documentation | course",
   *         "title": "string",
   *         "description": "string"
   *       }
   *     ],
   *     "communities": [
   *       {
   *         "name": "string",
   *         "platform": "discord | reddit | forum",
   *         "purpose": "string"
   *       }
   *     ]
   *   }
   * }
   *
   * Rules:
   * - Resources must be relevant to the inferred career
   * - Avoid paid-only platforms unless unavoidable
   */
  
  /**
   * Ensure each major skill in the roadmap has
   * at least one learning resource mapped to it.
   *
   * If a skill has no resource:
   * - Add a reasonable default resource suggestion
   */
  const resources = {
    learning: Array.isArray(parsed.roadmap?.resources?.learning)
      ? parsed.roadmap.resources.learning.map(resource => ({
          skill: resource.skill || 'General',
          type: ['youtube', 'documentation', 'course'].includes(resource.type)
            ? resource.type
            : 'documentation',
          title: resource.title || 'Learning Resource',
          description: resource.description || 'Resource for skill development'
        }))
      : [],
    communities: Array.isArray(parsed.roadmap?.resources?.communities)
      ? parsed.roadmap.resources.communities.map(community => ({
          name: community.name || 'Community',
          platform: ['discord', 'reddit', 'forum'].includes(community.platform)
            ? community.platform
            : 'forum',
          purpose: community.purpose || 'Community support and networking'
        }))
      : []
  };

  /**
   * Final response must include:
   * - meta
   * - understanding
   * - roadmap.phases
   * - roadmap.resources
   *
   * If resources are missing, backend must fail safely.
   */
  return {
    meta,
    understanding,
    roadmap: {
      phases,
      resources
    }
  };
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
 *   "error": {
 *     "message": "string",
 *     "code": "FORGE_FAILED | INVALID_INPUT | AI_ERROR"
 *   } | null
 * }
 * 
 * Error codes:
 * - INVALID_INPUT: Validation errors (400)
 * - AI_ERROR: Gemini API or parsing failures (500)
 * - FORGE_FAILED: Unexpected errors (500)
 * Frontend will rely on error.code
 * 
 * Error handling:
 * - Invalid input → 400
 * - Gemini failure / invalid JSON → 500
 * - Never expose raw AI output or stack traces
 * 
 * Logging rules:
 * - Log high-level lifecycle events only
 * - Do not log full user narrative
 * - Do not log full AI response
 * - Logs should help debugging, not leak data
 */
export async function POST(request) {
  console.log('[/api/forge] Request received');
  
  try {
    // Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      // Invalid JSON in request body → 400
      console.log('[/api/forge] Invalid JSON in request body');
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'Invalid JSON in request body',
            code: 'INVALID_INPUT'
          }
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { narrative } = body;

    // Validate narrative exists and meets length requirement
    const validation = validateNarrative(narrative);
    if (!validation.valid) {
      // Invalid input → 400
      console.log('[/api/forge] Validation failed:', validation.error);
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: validation.error,
            code: 'INVALID_INPUT'
          }
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call Gemini AI
    let rawResponse;
    try {
      console.log('[/api/forge] Calling Gemini API');
      const prompt = buildPrompt(narrative);
      rawResponse = await callGemini(prompt);
      console.log('[/api/forge] Gemini API call successful');
    } catch (err) {
      // Gemini API failure → 500
      console.error('[/api/forge] Gemini API error:', err.message);
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'AI service temporarily unavailable',
            code: 'AI_ERROR'
          }
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse AI response as JSON
    let roadmap;
    try {
      console.log('[/api/forge] Parsing AI response');
      roadmap = parseResponse(rawResponse);
      console.log('[/api/forge] Response parsed successfully');
    } catch (err) {
      // Invalid JSON from AI → 500
      console.error('[/api/forge] Parse error:', err.message);
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'Failed to process AI response',
            code: 'AI_ERROR'
          }
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return parsed JSON response
    console.log('[/api/forge] Request completed successfully');
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
    // Unexpected error → 500
    console.error('[/api/forge] Unexpected error:', error.message);

    // Never expose stack traces or raw error details
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: 'Internal server error',
          code: 'FORGE_FAILED'
        }
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
