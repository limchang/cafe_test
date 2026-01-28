
import React, { useState, useEffect } from 'react';
import { X, Smile, Dices } from 'lucide-react';
import { AppSettings, EmojiCategory } from '../types';
import { DEFAULT_EMOJIS } from '../App';

interface EmojiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const EmojiSettingsModal: React.FC<EmojiSettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [editingEmojiIdx, setEditingEmojiIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateEmoji = (idx: number, newEmoji: string) => {
    const updated = [...settings.defaultEmojis];
    const finalEmoji = newEmoji.trim() || DEFAULT_EMOJIS[idx];
    updated[idx] = finalEmoji;
    onUpdateSettings({ ...settings, defaultEmojis: updated });
    setEditingEmojiIdx(null);
  };

  const categories: { key: EmojiCategory; label: string }[] = [
    { key: 'ANIMALS', label: '동물' },
    { key: 'FACES', label: '표정' },
    { key: 'HANDS', label: '손모양' },
    { key: 'NUMBERS', label: '숫자' }
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[32px] w-full max-w-[360px] flex flex-col shadow-toss-elevated animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-black text-toss-grey-900 flex items-center gap-2"><Smile size={20} className="text-toss-blue" /> 이모지 설정</h2>
          <button onClick={onClose} className="p-1.5 text-toss-grey-400 hover:bg-toss-grey-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-5 pt-1 space-y-6">
          <section className="space-y-3">
            <span className="text-[12px] font-black text-toss-grey-400 uppercase tracking-widest">기본 아바타 리스트</span>
            <div className="grid grid-cols-6 gap-2">
              {settings.defaultEmojis.map((emoji, idx) => (
                <div key={idx} className="relative aspect-square">
                  {editingEmojiIdx === idx ? (
                    <input autoFocus className="w-full h-full text-center bg-toss-blueLight border border-toss-blue rounded-xl outline-none text-base" onBlur={e => handleUpdateEmoji(idx, e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateEmoji(idx, (e.target as HTMLInputElement).value)} />
                  ) : (
                    <button onClick={() => setEditingEmojiIdx(idx)} className="w-full h-full flex items-center justify-center bg-toss-grey-50 border border-toss-grey-100 rounded-xl text-lg hover:bg-white hover:border-toss-blue/30 transition-all">{emoji}</button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Dices size={16} className="text-toss-grey-400" />
              <span className="text-[12px] font-black text-toss-grey-400 uppercase tracking-widest">랜덤 아바타 카테고리</span>
            </div>
            <div className="flex p-1 bg-toss-grey-100 rounded-xl">
              {categories.map(cat => (
                <button key={cat.key} onClick={() => onUpdateSettings({ ...settings, randomCategory: cat.key })} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${settings.randomCategory === cat.key ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-grey-400'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 pt-2">
          <button onClick={onClose} className="w-full py-4 bg-toss-grey-900 text-white rounded-2xl font-black text-sm active:scale-[0.98] transition-all">설정 완료</button>
        </div>
      </div>
    </div>
  );
};
