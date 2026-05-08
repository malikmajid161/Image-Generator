import React from 'react';
import { ImageIcon, Download, Maximize2, Loader2 } from 'lucide-react';

const ImageDisplay = ({ image, isGenerating, onImageLoad, onImageError, onDownload }) => {
  return (
    <div className="viewport">
      <div className="image-canvas">
        {isGenerating && (
          <div className="loading-box">
            <Loader2 className="animate-spin" size={32} />
            <p style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.05em' }}>CONJURING...</p>
          </div>
        )}
        
        {image && (
          <img 
            src={image} 
            className="result-img"
            onLoad={onImageLoad}
            onError={onImageError}
            style={{ opacity: isGenerating ? 0 : 1 }}
            alt="AI Visual"
          />
        )}

        {!image && !isGenerating && (
          <div style={{ color: '#d1d5db', textAlign: 'center' }}>
            <ImageIcon size={64} strokeWidth={1} style={{ marginBottom: '24px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', color: '#9ca3af' }}>What should I create for you?</p>
          </div>
        )}

        {image && !isGenerating && (
          <div className="canvas-actions">
            <button className="icon-btn" onClick={onDownload} title="Download">
              <Download size={18} />
            </button>
            <button className="icon-btn" title="Full View">
              <Maximize2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageDisplay;
