import React from 'react';
import { Sparkles, History, User } from 'lucide-react';

const Header = () => {
  return (
    <nav className="top-nav">
      <div className="brand-text">
        <Sparkles size={22} style={{ marginRight: '8px', color: '#000' }} />
        Fluxion Studio
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="icon-btn" title="History">
          <History size={18} />
        </button>
        <button className="icon-btn" title="Account">
          <User size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Header;
