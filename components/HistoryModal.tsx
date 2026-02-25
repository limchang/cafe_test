
import React, { useState, useEffect } from 'react';
import { OrderHistoryItem } from '../types';
import { X, Trash2, RotateCcw, Calendar, Coffee, AlertCircle, ChevronDown, ChevronUp, StickyNote, PenLine, Plus, Users } from 'lucide-react';
import { EmojiRenderer } from './EmojiRenderer.tsx';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: OrderHistoryItem[];
  onLoad: (item: OrderHistoryItem) => void;
  onLoadPeopleOnly?: (item: OrderHistoryItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OrderHistoryItem>) => void;
}

const HistoryItem: React.FC<{
  item: OrderHistoryItem;
  onLoad: (item: OrderHistoryItem) => void;
  onLoadPeopleOnly?: (item: OrderHistoryItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OrderHistoryItem>) => void;
  onClose: () => void;
}> = ({ item, onLoad, onLoadPeopleOnly, onDelete, onUpdate, onClose }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingType, setLoadingType] = useState<'all' | 'people' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [isDeletingMemo, setIsDeletingMemo] = useState(false);
  const [memoText, setMemoText] = useState(item.memo || "");

  useEffect(() => {
    setMemoText(item.memo || "");
  }, [item.memo]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSaveMemo = () => {
    onUpdate(item.id, { memo: memoText });
    setIsEditingMemo(false);
  };

  return (
    <div className="bg-white border border-toss-grey-200 rounded-2xl p-4 hover:border-toss-blue/50 transition-colors shadow-toss-sm relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[11px] font-bold text-toss-blue bg-toss-blueLight px-2.5 py-1 rounded-full">{formatDate(item.timestamp)}</span>
          <h3 className="font-bold text-toss-grey-800 mt-2 text-xl tracking-tight">{item.title || `총 ${item.totalCount}개 메뉴`}</h3>
          {item.title && <p className="text-xs text-toss-grey-400 mt-1 font-medium">총 {item.totalCount}개 메뉴</p>}
        </div>
        {isDeleting ? (
            <div className="flex items-center gap-1 bg-toss-redLight p-1 rounded-lg animate-in fade-in slide-in-from-right-2 duration-200">
                <button onClick={() => setIsDeleting(false)} className="p-1 text-toss-grey-600 hover:text-toss-grey-900"><X size={16} /></button>
                <button onClick={() => onDelete(item.id)} className="px-2 py-0.5 bg-toss-red text-white text-xs font-bold rounded">삭제</button>
            </div>
        ) : (<button onClick={() => setIsDeleting(true)} className="text-toss-grey-300 hover:text-toss-red p-1.5 rounded-lg transition-colors"><Trash2 size={18} /></button>)}
      </div>
      {isEditingMemo ? (
        <div className="mb-4 animate-in fade-in duration-200">
          <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-toss-grey-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" rows={2} placeholder="주문 메모를 입력하세요..." autoFocus />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setIsEditingMemo(false); setMemoText(item.memo || ""); }} className="px-4 py-2 text-xs font-bold text-toss-grey-500 hover:bg-toss-grey-100 rounded-lg">취소</button>
            <button onClick={handleSaveMemo} className="px-4 py-2 text-xs font-bold text-white bg-toss-blue hover:bg-toss-blue/90 rounded-lg">저장</button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
           {item.memo ? (
              <div onClick={() => !isDeletingMemo && setIsEditingMemo(true)} className="p-3.5 bg-yellow-50/70 rounded-xl border border-yellow-100/50 flex items-center gap-3 text-sm text-yellow-800 cursor-pointer hover:border-yellow-200 transition-all relative group">
                  <StickyNote size={16} className="shrink-0 text-yellow-600" />
                  <p className="font-bold flex-1 truncate">{item.memo}</p>
                  <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {isDeletingMemo ? (
                        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 animate-in fade-in duration-200 absolute right-2 top-1/2 -translate-y-1/2 shadow-sm border border-yellow-200">
                            <button onClick={() => setIsDeletingMemo(false)} className="p-1 hover:bg-yellow-100 rounded text-yellow-700"><X size={14} /></button>
                            <button onClick={() => { onUpdate(item.id, { memo: undefined }); setIsDeletingMemo(false); }} className="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold">삭제</button>
                        </div>
                    ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setIsDeletingMemo(true)} className="p-1.5 text-yellow-600 hover:text-red-500 hover:bg-yellow-100 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            <button onClick={() => setIsEditingMemo(true)} className="p-1.5 text-yellow-600 hover:text-toss-blue hover:bg-yellow-100 rounded-lg transition-colors"><PenLine size={14} /></button>
                        </div>
                    )}
                  </div>
              </div>
           ) : (<button onClick={() => setIsEditingMemo(true)} className="flex items-center gap-1.5 text-xs font-bold text-toss-grey-400 hover:text-toss-blue transition-colors px-1 bg-toss-grey-50 py-2 rounded-lg w-full justify-center border border-dashed border-toss-grey-200"><Plus size={14} /> 메모 추가하기</button>)}
        </div>
      )}
      <div className="bg-toss-grey-50 rounded-xl overflow-hidden border border-toss-grey-100">
          {!isExpanded ? (<p className="text-sm text-toss-grey-600 line-clamp-2 p-4 whitespace-pre-line leading-relaxed">{item.summaryText}</p>) : (
              <div className="p-4 space-y-4 animate-in fade-in duration-200">
                 {(item.groups || []).map((group) => (
                    <div key={group.id} className="border-b border-toss-grey-200 last:border-0 pb-3 last:pb-0">
                        <div className="font-bold text-toss-grey-900 text-[13px] mb-2 px-1 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-toss-blue"></div>{group.name || "테이블 이름 없음"}</div>
                        <div className="space-y-1">
                            {(group.items || []).map((order) => (
                                <React.Fragment key={order.id}>
                                  {(order.subItems || []).map((subItem) => (
                                    <div key={subItem.id} className="flex justify-between items-center text-[13px] px-2 py-1.5 hover:bg-white rounded-lg transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                            <EmojiRenderer emoji={order.avatar || "-"} size={16} />
                                          </div>
                                          <span className="text-toss-grey-800 font-bold truncate">{subItem.itemName}</span>
                                        </div>
                                        <span className={`shrink-0 font-bold ${subItem.type === 'DRINK' ? (subItem.temperature === 'ICE' ? 'text-toss-blue' : 'text-toss-red') : 'text-amber-600'}`}>
                                          {subItem.type === 'DRINK' ? (subItem.temperature || 'ICE') : `${subItem.quantity || 1}개`}
                                        </span>
                                    </div>
                                  ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                 ))}
              </div>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-toss-grey-400 hover:bg-toss-grey-100 hover:text-toss-grey-600 transition-all border-t border-toss-grey-100">{isExpanded ? (<>접기 <ChevronUp size={14} /></>) : (<>상세 내역 보기 <ChevronDown size={14} /></>)}</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {loadingType ? (
            <button onClick={() => { if(loadingType === 'all') onLoad(item); else onLoadPeopleOnly?.(item); onClose(); }} className="col-span-2 flex items-center justify-center gap-2 py-4 bg-toss-red text-white rounded-2xl hover:bg-toss-red/90 transition-all text-sm font-black shadow-lg shadow-toss-red/20 animate-in zoom-in-95 duration-200"><AlertCircle size={18} />현재 내역이 교체됩니다. 확인!</button>
        ) : (
            <>
              <button onClick={() => { setLoadingType('all'); setTimeout(() => setLoadingType(null), 3000); }} className="flex flex-col items-center justify-center gap-1 py-3.5 bg-toss-grey-900 text-white rounded-2xl hover:bg-black transition-all text-[12px] font-black shadow-toss-sm"><RotateCcw size={16} />전체 불러오기</button>
              <button onClick={() => { setLoadingType('people'); setTimeout(() => setLoadingType(null), 3000); }} className="flex flex-col items-center justify-center gap-1 py-3.5 bg-toss-blue text-white rounded-2xl hover:bg-toss-blue/90 transition-all text-[12px] font-black shadow-toss-sm shadow-toss-blue/10"><Users size={16} />인원만 불러오기</button>
            </>
        )}
      </div>
    </div>
  );
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history = [], onLoad, onLoadPeopleOnly, onDelete, onUpdate }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-toss-grey-100">
          <h2 className="text-2xl font-bold text-toss-grey-900 flex items-center gap-3"><div className="p-2 bg-toss-blueLight rounded-xl"><Calendar size={24} className="text-toss-blue" /></div>주문 히스토리</h2>
          <button onClick={onClose} className="p-2 text-toss-grey-400 hover:text-toss-grey-600 hover:bg-toss-grey-100 rounded-full transition-colors"><X size={28} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {!Array.isArray(history) || history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-toss-grey-400 gap-4"><div className="w-20 h-20 bg-toss-grey-50 rounded-full flex items-center justify-center text-toss-grey-200"><Coffee size={40} /></div><p className="font-bold">저장된 주문 내역이 없습니다.</p></div>
          ) : (history.map((item) => (<HistoryItem key={item.id} item={item} onLoad={onLoad} onLoadPeopleOnly={onLoadPeopleOnly} onDelete={onDelete} onUpdate={onUpdate} onClose={onClose} />)))}
        </div>
      </div>
    </div>
  );
};
