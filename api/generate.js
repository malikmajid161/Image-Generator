/**
 * Vercel Serverless Function — /api/generate
 *
 * Query params:  prompt (string), model (string)
 * Returns:       image/jpeg binary  +  X-Provider header
 *
 * Strategy: HF first (9 s timeout) → Pollinations fallback on any failure.
 * Returns binary so the browser <img src="/api/generate?..."> works as-is.
 */

const HF_IMAGE_MAP = {
  'flux':         'black-forest-labs/FLUX.1-schnell',
  'flux-realism': 'black-forest-labs/FLUX.1-dev',
  'turbo':        'stabilityai/sdxl-turbo',
  'any-dark':     'stablediffusionapi/realistic-vision-v6.0-b1-inpaint',
};

// ── HuggingFace ──────────────────────────────────────────────────────────────
async function fetchFromHuggingFace(prompt, model) {
  const hfModel = HF_IMAGE_MAP[model] || HF_IMAGE_MAP['flux'];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
      method: 'POST',
      headers: {
        'Authorization':    `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type':     'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({
        inputs:     prompt,
        parameters: { num_inference_steps: 4, width: 1024, height: 1024 },
      }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      const e = new Error('Rate limited by HuggingFace');
      e.status = 429;
      throw e;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.startsWith('image/')) {
      throw new Error(`HF ${res.status} — ${contentType}`);
    }

    const buffer = await res.arrayBuffer();
    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

// ── Pollinations fallback ────────────────────────────────────────────────────
async function fetchFromPollinations(prompt, model) {
  const modelOrder = [model, 'turbo', 'flux'].filter((m, i, a) => a.indexOf(m) === i);

  for (const m of modelOrder) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const seed = Math.floor(Math.random() * 999999);
    const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
               + `?width=1024&height=1024&seed=${seed}&model=${m}&nologo=true`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept':     'image/jpeg,image/*',
        },
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.startsWith('image/')) {
        const buffer = await res.arrayBuffer();
        return { buffer, contentType };
      }
      console.log(`[Pol] model=${m} returned ${res.status}, trying next…`);
    } catch (e) {
      if (e.name !== 'AbortError') console.error(`[Pol] ${m}: ${e.message}`);
      else console.log(`[Pol] ${m} timed out, trying next…`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('All models failed');
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const prompt = req.query.prompt || 'a beautiful landscape';
  const model  = req.query.model  || 'flux';

  try {
    let result;
    let provider = 'pollinations';

    if (process.env.HF_API_KEY) {
      try {
        result   = await fetchFromHuggingFace(prompt, model);
        provider = 'huggingface';
      } catch (e) {
        // HF failed or timed out (including 429) → immediately fall back
        console.log(`[HF] ${e.message} (Status: ${e.status}) — falling back to Pollinations`);
        result = await fetchFromPollinations(prompt, model);
      }
    } else {
      result = await fetchFromPollinations(prompt, model);
    }

    res.setHeader('Content-Type',   result.contentType);
    res.setHeader('X-Provider',     provider);
    res.setHeader('Cache-Control',  'no-store');
    res.status(200).end(Buffer.from(result.buffer));
  } catch (e) {
    console.error(`[generate] ${e.message}`);
    res.status(503).json({ error: e.message });
  }
}
