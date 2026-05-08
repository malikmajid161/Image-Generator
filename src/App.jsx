import React, { useState, useRef, useEffect } from 'react';
import './index.css';

const PROXY = '/api/generate';

// ── helpers ───────────────────────────────────────────────────────────────────
function buildUrl(prompt, model) {
  return `${PROXY}?prompt=${encodeURIComponent(prompt)}&model=${model}&t=${Date.now()}`;
}

function buildFallback(prompt) {
  return `${PROXY}?prompt=${encodeURIComponent(prompt)}&model=turbo&t=${Date.now()}`;
}

async function enhancePrompt(raw) {
  // Routes through local proxy which uses HuggingFace Mistral server-side
  try {
    const res = await fetch(`/api/enhance?prompt=${encodeURIComponent(raw)}`);
    if (res.ok) {
      const { enhanced } = await res.json();
      if (enhanced && enhanced.length > 10) return enhanced;
    }
  } catch (_) {}
  // Local fallback
  return `${raw}, highly detailed, photorealistic, cinematic lighting, 8k, masterpiece, sharp focus`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const IconWand = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 4-1 1"/><path d="m4 15-1 1"/><path d="m8 8-4 4 10 10 4-4z"/><path d="m12.5 3.5 8 8"/>
  </svg>
);

// ── Media Card ────────────────────────────────────────────────────────────────
function MediaCard({ item }) {
  const [phase, setPhase] = useState('loading'); // loading | ok | error
  const [src,   setSrc]   = useState(item.url);
  const [tries, setTries] = useState(0);

  const retry = () => {
    setPhase('loading');
    setTries(0);
    setSrc(buildUrl(item.prompt, item.model) + '&retry=1');
  };

  const onError = () => {
    if (tries === 0) {
      setSrc(buildFallback(item.prompt));
      setTries(1);
      setPhase('loading');
    } else {
      setPhase('error');
    }
  };

  return (
    <div className="card">
      {/* Square image area — bulletproof padding-bottom:100% trick */}
      <div className="card-img-wrap">
        <div className="card-img-inner">

          {phase === 'loading' && (
            <div className="loader">
              <div className="spinner"/>
              <p className="loader-text">
                {tries > 0 ? 'Switching model…' : 'Generating…'}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="error-box">
              <p>Generation failed</p>
              <span>Model may be busy</span>
              <button className="card-btn" onClick={retry} style={{marginTop:'4px'}}>↺ Retry</button>
            </div>
          )}

          <img
            src={src}
            alt={item.prompt}
            className={`card-img${phase === 'ok' ? ' loaded' : ''}`}
            style={{ display: phase === 'error' ? 'none' : 'block' }}
            onLoad={() => setPhase('ok')}
            onError={onError}
          />
        </div>
      </div>

      <div className="card-footer">
        <p className="card-prompt" title={item.prompt}>{item.prompt}</p>
        <button className="card-btn" onClick={() => window.open(src, '_blank')}>↗ View</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const MODELS = [
  { id: 'flux',         label: 'Flux'     },
  { id: 'flux-realism', label: 'Realism'  },
  { id: 'turbo',        label: 'Turbo'    },
  { id: 'any-dark',     label: 'Artistic' },
];

export default function App() {
  const [cards,      setCards]      = useState([]);
  const [prompt,     setPrompt]     = useState('');
  const [model,      setModel]      = useState('flux');
  const [enhancing,  setEnhancing]  = useState(false);

  const feedRef = useRef(null);
  const taRef   = useRef(null);

  // Scroll to bottom when new card added
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [cards.length]);

  // Auto-height textarea
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  const generate = () => {
    if (!prompt.trim()) return;
    const p = prompt.trim();
    setPrompt('');
    setCards(prev => [...prev, {
      id:     Date.now(),
      prompt: p,
      model,
      url:    buildUrl(p, model),
    }]);
  };

  const enhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    setPrompt(await enhancePrompt(prompt.trim()));
    setEnhancing(false);
  };

  return (
    <div className="studio">

      {/* Header */}
      <header className="header">
        <div className="brand"><IconSparkle/> Fluxion AI</div>
        <span className="header-meta">{cards.length} generations</span>
      </header>

      {/* Feed */}
      <main className="feed" ref={feedRef}>
        {cards.length === 0 && (
          <div className="empty">
            <h1>Start creating</h1>
            <p>Type a prompt below and press Enter</p>
          </div>
        )}
        {cards.map(c => <MediaCard key={c.id} item={c}/>)}
      </main>

      {/* Console */}
      <div className="console-wrap">
        <div className="console">
          <div className="chips">
            {MODELS.map(m => (
              <button
                key={m.id}
                className={`chip${model === m.id ? ' on' : ''}`}
                onClick={() => setModel(m.id)}
              >
                {m.label}
              </button>
            ))}
            <button
              className="chip chip-enhance"
              onClick={enhance}
              disabled={!prompt.trim() || enhancing}
            >
              <IconWand/>&nbsp;{enhancing ? 'Enhancing…' : 'Enhance'}
            </button>
          </div>

          <div className="input-row">
            <textarea
              ref={taRef}
              className="textarea"
              placeholder="Describe your image…"
              value={prompt}
              rows={1}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }
              }}
            />
            <button
              className="send-btn"
              onClick={generate}
              disabled={!prompt.trim()}
            >
              <IconSend/>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
