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
  'any-dark':     'Lykon/DreamShaper_v8',
};

async function fetchFromHuggingFace(prompt, model, apiKey) {
  const hfModel = HF_IMAGE_MAP[model] || HF_IMAGE_MAP['flux'];
  const controller = new AbortController();
  // 4s for HF to leave room for fallback
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
      method: 'POST',
      headers: {
        'Authorization':    `Bearer ${apiKey}`,
        'Content-Type':     'application/json',
        'x-wait-for-model': 'true',
        'x-provider':       'together',
      },
      body: JSON.stringify({
        inputs:     prompt,
        parameters: { num_inference_steps: 4, width: 1024, height: 1024 },
      }),
      signal: controller.signal,
    });

    if (res.status === 404) {
      throw new Error(`Model not found (404). Note: FLUX models often require a paid HF plan or terms acceptance at huggingface.co/${hfModel}`);
    }
    if (res.status === 403) {
      throw new Error(`Access Forbidden (403). Please accept the model terms at huggingface.co/${hfModel}`);
    }
    if (res.status === 429) {
      throw new Error('Rate limited by HuggingFace');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.startsWith('image/')) {
      const text = await res.text().catch(() => '');
      throw new Error(`HF Error ${res.status}: ${text.slice(0, 50)}`);
    }

    const buffer = await res.arrayBuffer();
    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromPollinations(prompt, model) {
  // Only try 2 models to save time
  const modelOrder = [model, 'flux'].filter((m, i, a) => a.indexOf(m) === i);

  for (const m of modelOrder) {
    console.log(`[Pol] Attempting: ${m}`);
    const controller = new AbortController();
    // 2.5s per pollination attempt
    const timer = setTimeout(() => controller.abort(), 2500);
    const seed = Math.floor(Math.random() * 999999);
    const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
               + `?width=1024&height=1024&seed=${seed}&model=${m}&nologo=true`;

    try {
      const res = await fetch(url, { signal: controller.signal });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.startsWith('image/')) {
        const buffer = await res.arrayBuffer();
        return { buffer, contentType };
      }
    } catch (e) {
      console.error(`[Pol] ${m} failed: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('All models failed');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const prompt = req.query.prompt || 'a beautiful landscape';
  const model  = req.query.model  || 'flux';
  
  // Detect API Key
  const HF_KEY = process.env.HF_API_KEY || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;

  try {
    let result;
    let provider = 'pollinations';

    if (HF_KEY) {
      try {
        result   = await fetchFromHuggingFace(prompt, model, HF_KEY);
        provider = 'huggingface';
      } catch (e) {
        console.log(`[HF] Failed — falling back to Pollinations`);
        result = await fetchFromPollinations(prompt, model);
      }
    } else {
      result = await fetchFromPollinations(prompt, model);
    }

    res.setHeader('Content-Type',   result.contentType);
    res.setHeader('X-Provider',     provider);
    res.setHeader('Cache-Control',  'no-store');
    res.status(200).send(Buffer.from(result.buffer));
  } catch (e) {
    console.error(`[generate] ${e.message}`);
    res.status(503).json({ error: 'Generation failed. Please try again in a moment.' });
  }
}
