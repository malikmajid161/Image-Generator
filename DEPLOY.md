# Fluxion AI — Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier works)
- Your HuggingFace token: `hf_...`

---

## Step 1 — Push to GitHub

```bash
git add .
git commit -m "chore: migrate to Vercel serverless functions"
git push origin main
```

---

## Step 2 — Import into Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Click **Import Git Repository**
3. Select your GitHub repo (`fluxion-ai` or wherever this lives)

---

## Step 3 — Configure Project Settings

In the Vercel import screen:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite *(auto-detected)* |
| **Root Directory** | `./` *(leave as default)* |
| **Build Command** | `vite build` *(auto-detected)* |
| **Output Directory** | `dist` *(auto-detected)* |

---

## Step 4 — Set Environment Variables

In Vercel → **Settings → Environment Variables**, add:

| Name | Value | Environment |
|---|---|---|
| `HF_API_KEY` | `your_hugging_face_token_here` | ✅ Production + Preview + Development |

> ⚠️ **Critical:** Without this, all image generation will silently fall back to Pollinations.

---

## Step 5 — Deploy

Click **Deploy**. First deploy takes ~60 seconds.

---

## Step 6 — Verify Deployment

Once live, test these URLs in your browser:

**Health check (image generation):**
```
https://your-app.vercel.app/api/generate?prompt=a+sunset+over+mountains&model=flux
```
→ Should return an image directly in the browser.

**Enhance endpoint:**
```
https://your-app.vercel.app/api/enhance?prompt=a+dog
```
→ Should return:
```json
{ "enhanced": "a dog, highly detailed, cinematic lighting..." }
```

**SPA routing (direct URL access):**
```
https://your-app.vercel.app/
```
→ Should load the React app.

---

## Step 7 — Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Images always slow / use Pollinations | `HF_API_KEY` not set | Re-check Step 4, redeploy |
| `/api/generate` returns `{ "error": "..." }` | All models failed | Check Vercel Function Logs |
| Blank page on direct URL | SPA routing broken | Verify `vercel.json` is committed |
| 429 Too Many Requests | HF rate limit hit | Wait 60s and retry |
| Function timeout (> 10s) | HF model cold-starting | Upgrade Vercel plan for 60s limit, or the fallback to Pollinations will handle it |

---

## Local Development (with serverless functions)

```bash
# Install Vercel CLI globally (one-time)
npm i -g vercel

# Link project to Vercel (one-time)
vercel link

# Run locally with full API support
vercel dev
```

This runs both Vite and the `/api` serverless functions locally at `http://localhost:3000`.

---

## File Structure After Migration

```
fluxion-ai/
├── api/
│   ├── generate.js     ← Vercel serverless: image generation
│   └── enhance.js      ← Vercel serverless: prompt enhancement
├── src/
│   ├── App.jsx         ← Uses /api/generate and /api/enhance
│   ├── index.css
│   └── main.jsx
├── vercel.json         ← Routing + function config
├── vite.config.js      ← Dev proxy to localhost:3000
├── .env                ← HF_API_KEY (never committed)
└── package.json
```
