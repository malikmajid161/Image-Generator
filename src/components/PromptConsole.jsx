import React from 'react';
import { Send, Wand2, Zap, Palette, Camera } from 'lucide-react';

const PromptConsole = ({ 
  prompt, 
  setPrompt, 
  onGenerate, 
  isGenerating, 
  model, 
  setModel, 
  onEnhance 
}) => {
  const models = [
    { id: 'flux', label: 'Pro', icon: <Zap size={14} /> },
    { id: 'flux-realism', label: 'Realism', icon: <Camera size={14} /> },
    { id: 'flux-anime', label: 'Art', icon: <Palette size={14} /> },
  ];

  return (
    <div className="interaction-area">
      <div className="prompt-card">
        <div className="tool-bar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {models.map(m => (
              <button 
                key={m.id} 
                className={`tool-chip ${model === m.id ? 'active' : ''}`}
                onClick={() => setModel(m.id)}
              >
                {m.icon}
                <span style={{ marginLeft: '6px' }}>{m.label}</span>
              </button>
            ))}
          </div>
          
          <button 
            className="tool-chip" 
            onClick={onEnhance}
            disabled={!prompt.trim() || isGenerating}
            title="Enhance with AI"
          >
            <Wand2 size={14} style={{ color: '#8b5cf6' }} />
            <span style={{ marginLeft: '6px', color: '#8b5cf6' }}>Magic Prompt</span>
          </button>
        </div>
        
        <div className="input-row">
          <textarea 
            className="prompt-field"
            placeholder="Describe anything... (e.g. 'A cat riding a bicycle in space')"
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onGenerate();
              }
            }}
          />
          <button 
            className="submit-btn" 
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptConsole;
