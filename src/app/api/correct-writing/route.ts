import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let apiKey: string | null = null;
  try {
    const { questions, answers, levelCode, levelLabel } = await request.json();

    const clientApiKey = request.headers.get('x-api-key');
    apiKey = process.env.GEMINI_API_KEY || clientApiKey;
    const requestedModel = request.headers.get('x-gemini-model') || 'gemini-2.5-flash';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is missing. Please provide it in settings.' },
        { status: 400 }
      );
    }

    // Build the correction prompt
    const qaText = questions.map((q: string, i: number) => {
      return `Question ${i + 1}: ${q}\nStudent Answer: ${answers[i] || '(no answer)'}`;
    }).join('\n\n');

    const userPrompt = `You are an expert English language teacher evaluating student writing.
Level: ${levelLabel} (${levelCode})

The student has answered the following writing questions. Provide detailed, constructive feedback for EACH answer.

${qaText}

For each answer, evaluate:
1. Grammar correctness
2. Vocabulary usage appropriateness for the level
3. Sentence structure and coherence
4. Provide a corrected/improved version if needed
5. Give an overall score out of 10

Be encouraging but honest. Point out specific mistakes and explain why they're wrong.`;

    const systemPrompt = `You are a professional English teacher. Output MUST be valid JSON matching the provided schema. Be detailed in your feedback. Write feedback primarily in Arabic with English examples and corrections.`;

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            overallComment: { type: "STRING" },
            overallScore: { type: "INTEGER" },
            maxScore: { type: "INTEGER" },
            corrections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  questionIndex: { type: "INTEGER" },
                  score: { type: "INTEGER" },
                  grammarFeedback: { type: "STRING" },
                  vocabularyFeedback: { type: "STRING" },
                  correctedVersion: { type: "STRING" },
                  tip: { type: "STRING" }
                }
              }
            }
          },
          required: ["overallComment", "overallScore", "maxScore", "corrections"]
        }
      }
    };

    // Call the Gemini API with a multi-model fallback and backoff mechanism
    const fallbackList = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    const modelsToTry = [requestedModel, ...fallbackList.filter(m => m !== requestedModel)];
    let response: Response | null = null;
    let success = false;
    let lastErrorDetails = 'No request made';
    let lastStatus = 500;

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      let retries = 2; // 2 attempts per model (initial + 1 retry)
      let delay = 1000;

      while (retries > 0) {
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            success = true;
            break;
          } else {
            lastStatus = response.status;
            lastErrorDetails = await response.text();
            
            // If it's a validation error (400) or authorization error (401, 403), retrying won't help.
            if (response.status === 400 || response.status === 401 || response.status === 403) {
              retries = 0; // prevent further retries
              break;
            }
          }
        } catch (err: any) {
          lastStatus = 500;
          lastErrorDetails = err.message || 'Network error';
        }

        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }

      if (success && response && response.ok) {
        break; // break the model loop
      }
    }

    if (!success || !response || !response.ok) {
      return NextResponse.json(
        { error: sanitizeError(`Gemini API returned error: ${lastStatus}. Details: ${lastErrorDetails}`, apiKey) },
        { status: lastStatus }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: 'No correction data generated.' },
        { status: 500 }
      );
    }

    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error correcting writing:', error);
    return NextResponse.json(
      { error: sanitizeError(error.message || 'Internal Server Error', apiKey) },
      { status: 500 }
    );
  }
}

function sanitizeError(msg: string, key?: string | null): string {
  if (!msg) return '';
  let sanitized = msg;
  if (key) {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(escapedKey, 'g'), '***REDACTED***');
  }
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '***REDACTED***');
  return sanitized;
}
