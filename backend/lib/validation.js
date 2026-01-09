/**
 * Validates the narrative input from the client
 * 
 * @param {*} narrative - Input to validate
 * @returns {{valid: boolean, error: string | null}}
 */
export function validateNarrative(narrative) {
  // Check if narrative exists
  if (!narrative) {
    return {
      valid: false,
      error: 'Narrative is required',
    };
  }

  // Check if narrative is a string
  if (typeof narrative !== 'string') {
    return {
      valid: false,
      error: 'Narrative must be a string',
    };
  }

  // Trim and check length
  const trimmed = narrative.trim();
  
  if (trimmed.length < 10) {
    return {
      valid: false,
      error: 'Narrative must be at least 10 characters long',
    };
  }

  if (trimmed.length > 5000) {
    return {
      valid: false,
      error: 'Narrative must not exceed 5000 characters',
    };
  }

  return {
    valid: true,
    error: null,
  };
}
