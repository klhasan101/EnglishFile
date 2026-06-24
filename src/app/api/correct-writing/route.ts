import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { questions, answers, levelCode, levelLabel } = await request.json();

    const clientApiKey = request.headers.get('x-api-key');
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

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

    const modelName = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let response;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) break;
      } catch {
        // network error, retry
      }
      retries--;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'Network error';
      return NextResponse.json(
        { error: `Gemini API returned error: ${response?.status || 'Unknown'}. Details: ${errorText}` },
        { status: response?.status || 500 }
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
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
