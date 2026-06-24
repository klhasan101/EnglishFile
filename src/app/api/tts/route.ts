import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sentence, accent } = await request.json();

    const clientApiKey = request.headers.get('x-api-key');
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is missing. Please provide it in settings.' },
        { status: 400 }
      );
    }

    const voiceName = "Kore"; // Prebuilt voice used in original app
    
    // Choose prompt based on UK / US accent setting
    const accentInstruction = accent === 'US' 
      ? `Read with perfectly clear General American accent: "${sentence}"`
      : `Read with perfectly clear British RP accent: "${sentence}"`;

    const payload = {
      contents: [{
        parts: [{ text: accentInstruction }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    };

    const modelName = "gemini-2.5-flash-preview-tts";
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
        { error: `Gemini TTS API returned error: ${response?.status || 'Unknown'}. Details: ${errorText}` },
        { status: response?.status || 500 }
      );
    }

    const data = await response.json();
    const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!base64Audio) {
      return NextResponse.json(
        { error: 'No audio data generated from Gemini TTS API.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ base64Audio, mimeType });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
