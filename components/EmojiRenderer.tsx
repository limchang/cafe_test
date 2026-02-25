
import React from 'react';

interface EmojiRendererProps {
  emoji: string;
  className?: string;
  size?: number | string;
}

export const EmojiRenderer: React.FC<EmojiRendererProps> = ({ emoji, className = "", size }) => {
  const isQuadrant = ["◰", "◱", "◳", "◲"].includes(emoji);

  if (!isQuadrant) {
    return <span className={className}>{emoji}</span>;
  }

  // Custom Seat Icons that blend with the Toss design
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size || '1em', height: size || '1em' }}>
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* The "Table" - a rounded rectangle with slightly thicker lines for a "crafted" feel */}
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2.5" />
        
        {/* The "Seat" - a smaller rounded rectangle in the corner, filled to indicate position */}
        {emoji === "◰" && <rect x="6.5" y="6.5" width="5" height="5" rx="1.2" fill="currentColor" />}
        {emoji === "◱" && <rect x="12.5" y="6.5" width="5" height="5" rx="1.2" fill="currentColor" />}
        {emoji === "◳" && <rect x="6.5" y="12.5" width="5" height="5" rx="1.2" fill="currentColor" />}
        {emoji === "◲" && <rect x="12.5" y="12.5" width="5" height="5" rx="1.2" fill="currentColor" />}
      </svg>
    </div>
  );
};
