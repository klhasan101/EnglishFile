import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { levelCode, levelLabel, topicTheme } = await request.json();

    // Prioritize the server environment variable, fallback to client-supplied key in headers
    const clientApiKey = request.headers.get('x-api-key');
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is missing. Please provide it in settings.' },
        { status: 400 }
      );
    }

    const userPrompt = `Generate a high-quality lesson following the Oxford "English File" (5th Edition) series.
Level: ${levelLabel} (${levelCode})
Unit Topic Theme: ${topicTheme}

Produce a highly complete, detailed and engaging lesson that includes exactly:
1. Lesson title and level designation.
2. Vocabulary: key thematic words with standard phonetics, definition, example sentence, and brief Arabic translations for terms. Additionally, add matching challenge definitions.
3. Grammar: simple concept introduction, rules with visual examples, and a multiple choice quiz of 2 detailed questions.
4. Pronunciation: comparative vowel sounds and list of pronunciation-focused terms.
5. Practical English: colloquial conversations, real-world dialogue transcripts, and key useful idioms.
6. Writing Challenge questions.`;

    const systemPrompt = `You are an expert English Language Teaching (ELT) consultant specializing in Oxford English File. Your output MUST be in strict JSON format mapping perfectly to the given schema, without markdown formatting markers around the JSON. Keep descriptions informative.`;

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            lessonTitle: { type: "STRING" },
            levelCode: { type: "STRING" },
            grammar: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                conceptExplanation: { type: "STRING" },
                rules: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      rule: { type: "STRING" },
                      example: { type: "STRING" }
                    }
                  }
                },
                quickQuiz: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      question: { type: "STRING" },
                      options: { type: "ARRAY", items: { type: "STRING" } },
                      correctIndex: { type: "INTEGER" },
                      explanation: { type: "STRING" }
                    }
                  }
                }
              },
              required: ["title", "conceptExplanation", "rules", "quickQuiz"]
            },
            vocabulary: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                theme: { type: "STRING" },
                words: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      word: { type: "STRING" },
                      phonetics: { type: "STRING" },
                      definition: { type: "STRING" },
                      exampleSentence: { type: "STRING" },
                      arabicTranslation: { type: "STRING" }
                    }
                  }
                },
                matchingChallenge: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      term: { type: "STRING" },
                      definition: { type: "STRING" }
                    }
                  }
                }
              },
              required: ["title", "theme", "words", "matchingChallenge"]
            },
            pronunciation: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                soundsToCompare: { type: "ARRAY", items: { type: "STRING" } },
                wordsWithAudio: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["title", "soundsToCompare", "wordsWithAudio"]
            },
            practicalEnglish: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                scenario: { type: "STRING" },
                dialogue: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      speaker: { type: "STRING" },
                      speech: { type: "STRING" }
                    }
                  }
                },
                expressions: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      expression: { type: "STRING" },
                      use: { type: "STRING" }
                    }
                  }
                }
              },
              required: ["title", "scenario", "dialogue", "expressions"]
            },
            writingChallenge: {
              type: "OBJECT",
              properties: {
                questions: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["questions"]
            }
          },
          required: [
            "lessonTitle",
            "levelCode",
            "grammar",
            "vocabulary",
            "pronunciation",
            "practicalEnglish",
            "writingChallenge"
          ]
        }
      }
    };

    // Call the Gemini API with backoff mechanism
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
      } catch (err) {
        // network or other error
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
        { error: 'No lesson data generated from Gemini API.' },
        { status: 500 }
      );
    }

    const parsedData = JSON.parse(rawText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error generating lesson:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
