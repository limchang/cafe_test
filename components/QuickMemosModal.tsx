
import React, { useState, useEffect } from 'react';
import { X, Plus, StickyNote, Trash2 } from 'lucide-react';
import { AppSettings } from '../types';

interface QuickMemosModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const QuickMemosModal: React.FC<QuickMemosModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [newMemo, setNewMemo] = useState("");

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddMemo = () => {
    const val = newMemo.trim();
    if (!val || settings.quickMemos.includes(val)) { setNewMemo(""); return; }
    onUpdateSettings({ ...settings, quickMemos: [...settings.quickMemos, val] });
    setNewMemo("");
  };

  const removeMemo = (memo: string) => {
    onUpdateSettings({ ...settings, quickMemos: settings.quickMemos.filter(m => m !== memo) });
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[32px] w-full max-w-[360px] flex flex-col shadow-toss-elevated animate-in zoom-in-95 duration-300 overflow-hidden max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <h2 className="text-lg font-black text-toss-grey-900 flex items-center gap-2"><StickyNote size={20} className="text-toss-blue" /> 요청사항 관리</h2>
          <button onClick={onClose} className="p-1.5 text-toss-grey-400 hover:bg-toss-grey-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-5 pt-1 space-y-4 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex gap-2 shrink-0">
            <input 
              autoFocus
              type="text" 
              lang="ko"
              enterKeyHint="done"
              placeholder="예: 시럽 빼기, 덜 뜨겁게" 
              className="flex-1 bg-toss-grey-50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all" 
              value={newMemo} 
              onChange={e => setNewMemo(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAddMemo()} 
            />
            <button onClick={handleAddMemo} className="w-12 h-12 bg-toss-blue text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-toss-blue/20"><Plus size={20} strokeWidth={3} /></button>
          </div>

          <div className="space-y-2">
            <span className="text-[12px] font-black text-toss-grey-400 uppercase tracking-widest px-1">등록된 요청사항 ({settings.quickMemos.length})</span>
            <div className="flex flex-col gap-1.5">
              {settings.quickMemos.map(memo => (
                <div key={memo} className="flex items-center justify-between bg-toss-grey-50 p-3.5 rounded-2xl border border-toss-grey-100 group">
                  <span className="text-[13px] font-bold text-toss-grey-800">{memo}</span>
                  <button onClick={() => removeMemo(memo)} className="p-1 text-toss-grey-300 hover:text-toss-red transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {settings.quickMemos.length === 0 && (
                <div className="text-center py-10 text-toss-grey-400 text-sm font-medium">자주 사용하는 요청사항을<br/>등록해보세요.</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 pt-2 shrink-0 border-t border-toss-grey-50">
          <button onClick={onClose} className="w-full py-4 bg-toss-grey-900 text-white rounded-2xl font-black text-sm active:scale-[0.98] transition-all">설정 완료</button>
        </div>
      </div>
    </div>
  );
};
