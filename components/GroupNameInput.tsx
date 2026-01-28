
import React, { useState, useRef, useEffect } from 'react';
import { PencilLine, ChevronDown, CornerDownLeft } from 'lucide-react';

interface GroupNameInputProps {
  value: string;
  onNameChange: (value: string) => void;
}

export const GroupNameInput: React.FC<GroupNameInputProps> = ({ 
  value, 
  onNameChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tablePresets = ["1번 테이블", "2번 테이블", "3번 테이블", "4번 테이블"];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetSelect = (preset: string) => {
    onNameChange(preset);
    setIsCustomMode(false);
    setIsOpen(false);
  };

  const handleCustomInputClick = () => {
    onNameChange("");
    setIsCustomMode(true);
    setIsOpen(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleComplete = () => {
    if (!value.trim()) {
      onNameChange("새 테이블");
    }
    setIsCustomMode(false);
  };

  return (
    <div className="relative inline-flex items-center min-w-0" ref={containerRef}>
      {!isCustomMode ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all border shrink-0 ${
            isOpen 
            ? 'bg-toss-blue border-toss-blue text-white shadow-md' 
            : 'bg-transparent border-transparent text-toss-grey-900 hover:bg-toss-grey-100'
          }`}
        >
          <span className="font-bold text-sm sm:text-base truncate max-w-[120px]">
            {value || "테이블 선택"}
          </span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isOpen ? 'text-white' : 'text-toss-grey-400'}`} />
        </button>
      ) : (
        <div className="relative flex items-center min-w-[140px] animate-in slide-in-from-left-2 duration-200">
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="done"
            maxLength={10}
            value={value}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleComplete();
            }}
            placeholder="이름 입력"
            className="w-full pl-3 pr-10 py-1.5 bg-toss-blueLight border border-toss-blue/30 rounded-xl text-sm font-bold text-toss-blue focus:outline-none focus:ring-2 focus:ring-toss-blue/20"
          />
          <button 
            onClick={handleComplete}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-toss-blue hover:scale-110 transition-transform p-1"
            title="완료 (Enter)"
          >
            <CornerDownLeft size={16} strokeWidth={3} />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-12 left-0 z-50 bg-white border border-toss-grey-100 rounded-[20px] shadow-toss p-2 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
          <button
            onClick={handleCustomInputClick}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-toss-grey-100 text-toss-grey-500 hover:bg-toss-blueLight hover:text-toss-blue transition-all border border-transparent"
            title="직접 입력"
          >
            <PencilLine size={16} />
          </button>
          <div className="w-px h-5 bg-toss-grey-100 mx-0.5" />
          {tablePresets.map((preset) => {
            const num = preset.replace("번 테이블", "");
            return (
              <button
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all border ${
                  value === preset 
                  ? 'bg-toss-blue border-toss-blue text-white' 
                  : 'bg-toss-grey-50 border-toss-grey-100 text-toss-grey-500 hover:border-toss-blue/30 hover:bg-white hover:text-toss-blue'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
