/**
 * Vercel Serverless Function — /api/enhance
 *
 * Query params:  prompt (string)
 * Returns:       JSON { enhanced: "..." }
 *
 * Calls HF Mistral-7B chat completions to rewrite the prompt.
 * Falls back to the original prompt unchanged if HF fails or times out (9 s).
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function enhanceViaGemini(prompt) {
  if (!GEMINI_KEY) {
    console.error('[Enhance] Missing GEMINI_API_KEY');
    return '';
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a Stable Diffusion prompt engineer. Rewrite the following user prompt into a highly detailed, photorealistic image generation prompt. Add artistic styles, lighting details, and technical specs (8k, masterpiece). Keep the response under 60 words. Response must be ONLY the prompt. Prompt: "${prompt}"`
          }]
        }]
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      console.error('[Enhance] Gemini API Error:', err);
      return '';
    }

    const json = await res.json();
    const result = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log('[Enhance] Gemini Success:', result.substring(0, 50) + '...');
    return result;
  } catch (e) {
    console.error('[Enhance] Gemini Exception:', e.message);
    return '';
  }
}

// ── HuggingFace text enhancement ────────────────────────────────────────────
async function enhanceViaHF(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/Mistral-7B-Instruct-v0.3',
        messages: [
          {
            role:    'system',
            content: 'You are a Stable Diffusion prompt engineer. Rewrite user prompts into highly detailed image generation prompts with style, lighting, camera settings, and quality tags. Reply with ONLY the enhanced prompt in max 60 words — no explanation.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens:  120,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HF ${res.status}`);

    const json     = await res.json();
    const enhanced = json.choices?.[0]?.message?.content?.trim() || '';
    if (!enhanced) throw new Error('Empty response from HF');

    return enhanced;
  } finally {
    clearTimeout(timer);
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const prompt = (req.query.prompt || '').trim();
  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  // Fallback: original prompt + quality tags (used if HF fails or key missing)
  const fallback = `${prompt}, highly detailed, photorealistic, cinematic lighting, 8k, masterpiece, sharp focus`;

  try {
    // 1. Try Gemini first
    let enhanced = await enhanceViaGemini(prompt);
    
    // 2. Fallback to HF if Gemini fails
    if (!enhanced && (process.env.HF_API_KEY || process.env.HF_TOKEN)) {
      enhanced = await enhanceViaHF(prompt);
    }

    res.status(200).json({ enhanced: enhanced || fallback });
  } catch (e) {
    console.log(`[enhance] ${e.message} — returning fallback`);
    res.status(200).json({ enhanced: fallback });
  }
}
