type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// OpenAI-compatible
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Gemini (Google Generative AI)
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  '';
const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  process.env.NEXT_PUBLIC_GEMINI_MODEL ||
  'gemini-1.5-flash';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

export async function generateSummary(messages: ChatMessage[], maxTokens: number = 220): Promise<string | null> {
  // Prefer Gemini if configured, else OpenAI-compatible, else null
  if (GEMINI_API_KEY) {
    try {
      const system = messages.find(m => m.role === 'system')?.content?.trim();
      const conversationalMessages = messages.filter(m => m.role !== 'system' && m.content.trim().length > 0);

      const contents = conversationalMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      if (contents.length === 0 && system) {
        contents.push({ role: 'user', parts: [{ text: system }] });
      }

      const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents,
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Gemini error:', res.status, text);
        return null;
      }
      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return (text || '').trim() || null;
    } catch (e) {
      console.error('Failed to call Gemini', e);
      return null;
    }
  }

  if (OPENAI_API_KEY) {
    try {
      const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('OpenAI error:', res.status, text);
        return null;
      }
      const data = await res.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      return (content || '').trim() || null;
    } catch (e) {
      console.error('Failed to call OpenAI', e);
      return null;
    }
  }

  return null;
}

export function buildMessages(system: string, user: string): ChatMessage[] {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}


