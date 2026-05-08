/**
 * Vercel Serverless Function — /api/enhance
 *
 * Query params:  prompt (string)
 * Returns:       JSON { enhanced: "..." }
 *
 * Calls HF Mistral-7B chat completions to rewrite the prompt.
 * Falls back to the original prompt unchanged if HF fails or times out (9 s).
 */

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
    if (!process.env.HF_API_KEY) {
      res.status(200).json({ enhanced: fallback });
      return;
    }

    const enhanced = await enhanceViaHF(prompt);
    res.status(200).json({ enhanced });
  } catch (e) {
    // Timeout or any HF error → return original prompt unchanged
    console.log(`[enhance] ${e.message} — returning original prompt`);
    res.status(200).json({ enhanced: fallback });
  }
}
