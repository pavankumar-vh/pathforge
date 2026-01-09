"use client";

/**
 * Create a minimal React page to test the PathForge backend.
 *
 * Requirements:
 * - Single textarea for narrative input
 * - One submit button
 * - No styling focus
 * - Simple layout
 *
 * This UI is temporary and used only for backend testing.
 */

import { useState } from 'react';

export default function TestPage() {
  /**
   * State requirements:
   * - narrative: string
   *
   * Textarea should update state on change.
   * No validation yet.
   */
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  /**
   * On submit:
   * - Send POST request to /api/forge
   * - Body: { narrative }
   * - Set loading state while waiting
   * - Store response JSON in state
   * - Catch and store errors
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/forge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ narrative }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed');
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * UI states to handle:
   * - Loading: show "Forging path..."
   * - Error: show error message
   * - Success: show raw JSON response
   */
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>PathForge Backend Test</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="narrative">Career Narrative (min 30 chars):</label>
          <br />
          <textarea
            id="narrative"
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={10}
            cols={80}
            placeholder="I am a software engineer with 5 years of experience..."
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Forging path...' : 'Submit'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          <h3>Error:</h3>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {response && (
        <div style={{ marginTop: '20px' }}>
          <h3>Response:</h3>
          {/**
           * Render the backend response as raw JSON using <pre>.
           *
           * Purpose:
           * - Verify backend contract
           * - Debug AI output
           *
           * No formatting or styling needed.
           */}
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
