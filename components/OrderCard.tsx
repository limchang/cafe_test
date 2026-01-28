
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderItem, ItemType, DrinkSize, AppSettings, OrderSubItem, EmojiCategory } from '../types';
import { Snowflake, Flame, Trash2, Plus, Dices, MoreHorizontal, AlertCircle, ArrowLeft, ChevronDown, ChevronUp, User, MessageCircle, Check, Pencil, Send, Minus, UtensilsCrossed, UserMinus, RefreshCw, CakeSlice, Info, Clock, RotateCcw, Heart } from 'lucide-react';

interface ExtendedSubItem extends OrderSubItem {
  isSynced?: boolean;
}

interface OrderCardProps {
  order: OrderItem;
  drinkItems: string[];
  dessertMenuItems: string[];
  onAddMenuItem: (name: string, type: ItemType) => void;
  onRemoveMenuItem: (name: string, type: ItemType) => void;
  onUpdate: (id: string, updates: Partial<OrderItem>) => void;
  onRemove: (id: string) => void;
  onCopyGroupItemToAll: (orderId: string) => void;
  onDeleteGroupItemFromAll?: (orderId: string) => void;
  highlighted?: boolean;
  onOpenMenuModal: (orderId: string, currentItem: string, subItemId?: string | null, type?: ItemType) => void;
  appSettings: AppSettings & { isSharedSyncActive?: boolean };
  onInputModeChange?: (isActive: boolean) => void;
}

const CATEGORY_EMOJIS: Record<EmojiCategory, string[]> = {
  ANIMALS: ["🦁", "🐯", "🐨", "🐷", "🐸", "🐵", "🐔", "🐧", "🐧", "🐦", "🐥", "🦉", "🐺", "북극곰", "🐴", "🦄", "🐝"],
  FACES: ["😀", "😍", "😎", "🤔", "😴", "🤩", "🥳", "🥺", "😡", "🤢", "🤡", "👻", "👽", "🤖", "💩", "✨"],
  HANDS: ["👍", "👎", "👊", "✌️", "👌", "✋", "👐", "🙌", "👏", "🙏", "🤝", "🤘", "🤙", "👋", "✍️", "💪"],
  NUMBERS: ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "따봉"]
};

export const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  drinkItems,
  onAddMenuItem,
  onUpdate, 
  onRemove,
  onCopyGroupItemToAll,
  onDeleteGroupItemFromAll,
  highlighted,
  onOpenMenuModal,
  appSettings,
  onInputModeChange
}) => {
  const [showAvatarPicker, setShowAvatarPicker] = useState(!order.avatar && order.avatar !== '😋');
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [activeMemoSubId, setActiveMemoSubId] = useState<string | null>(null);
  const [isDirectInputMode, setIsDirectInputMode] = useState(false);
  const [isMemoDirectInputMode, setIsMemoDirectInputMode] = useState(false);
  const [customMemo, setCustomMemo] = useState("");
  const [customMenuName, setCustomMenuName] = useState("");
  const [timeLeft, setTimeLeft] = useState(5.0);
  const [expandTimeLeft, setExpandTimeLeft] = useState(1.5);
  
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expandIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGroupAvatar = order.avatar === '😋';
  const isNotEating = !!order.avatar && !isGroupAvatar && order.subItems.length === 1 && order.subItems[0].itemName === '안 먹음';
  const isUndecided = !!order.avatar && !isGroupAvatar && !isNotEating && (order.subItems.length === 0 || order.subItems.every(si => si.itemName === '미정'));
  const isDecided = !!order.avatar && !isGroupAvatar && !isNotEating && !isUndecided;
  
  const [justCompleted, setJustCompleted] = useState(false);
  const prevIsUndecided = useRef(isUndecided);

  useEffect(() => {
    const isActive = isDirectInputMode || isMemoDirectInputMode;
    onInputModeChange?.(isActive);
  }, [isDirectInputMode, isMemoDirectInputMode]);

  useEffect(() => {
    if (prevIsUndecided.current && !isUndecided && !isNotEating) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 600); 
      return () => clearTimeout(timer);
    }
    prevIsUndecided.current = isUndecided;
  }, [isUndecided, isNotEating]);

  useEffect(() => {
    if (isUndecided && !isMoreExpanded && !showAvatarPicker && !activeMemoSubId) {
      setExpandTimeLeft(1.5);
      expandIntervalRef.current = setInterval(() => {
        setExpandTimeLeft(prev => {
          const next = Math.max(0, prev - 0.1);
          if (next <= 0) {
            setIsMoreExpanded(true);
            if (expandIntervalRef.current) clearInterval(expandIntervalRef.current);
          }
          return next;
        });
      }, 100);
    } else {
      if (expandIntervalRef.current) clearInterval(expandIntervalRef.current);
    }
    return () => {
      if (expandIntervalRef.current) clearInterval(expandIntervalRef.current);
    };
  }, [isUndecided, isMoreExpanded, showAvatarPicker, activeMemoSubId]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (expandIntervalRef.current) clearInterval(expandIntervalRef.current);
    };
  }, []);

  const memoChips = useMemo(() => {
    const chips: { text: string; subItemId: string }[] = [];
    order.subItems.forEach(si => {
      if (si.memo) {
        si.memo.split(',').map(m => m.trim()).filter(Boolean).forEach(text => {
          chips.push({ text, subItemId: si.id });
        });
      }
    });
    return chips;
  }, [order.subItems]);

  const leftMemos = memoChips.filter((_, i) => i % 2 === 0);
  const rightMemos = memoChips.filter((_, i) => i % 2 !== 0);

  const quickMenuOptions = useMemo(() => {
    return drinkItems.filter(i => i !== '미정' && i !== '안 먹음').slice(0, 3);
  }, [drinkItems]);

  const handleAvatarSelect = (emoji: string) => {
    onUpdate(order.id, { avatar: emoji });
    setShowAvatarPicker(false);
  };

  const handleInitialOrderFinalize = (menuName?: string) => {
    const finalName = menuName || '미정';
    if (finalName !== '미정' && finalName !== '안 먹음' && !drinkItems.includes(finalName)) onAddMenuItem(finalName, 'DRINK');
    const isIceDefault = finalName.includes('스무디') || finalName.includes('아이스');
    onUpdate(order.id, { 
      subItems: [{ 
        id: uuidv4(), 
        type: 'DRINK', 
        itemName: finalName, 
        temperature: isIceDefault ? 'ICE' : 'HOT', 
        size: 'Tall',
        quantity: 1
      }] 
    });
    setIsMoreExpanded(false);
    setIsDirectInputMode(false);
    setCustomMenuName("");
  };

  const startAutoCloseTimer = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (isMemoDirectInputMode) return;
    setTimeLeft(5.0);
    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 0.1));
    }, 100);
    autoCloseTimerRef.current = setTimeout(() => setActiveMemoSubId(null), 5000);
  };

  const handleAddCustomMemo = () => {
    if (!customMemo.trim() || !activeMemoSubId) return;
    const si = order.subItems.find(s => s.id === activeMemoSubId);
    if (!si) return;
    let m = si.memo ? si.memo.split(',').map(x => x.trim()).filter(Boolean) : [];
    if (!m.includes(customMemo.trim())) {
      m = [...m, customMemo.trim()];
      onUpdate(order.id, { subItems: order.subItems.map(s => s.id === activeMemoSubId ? { ...s, memo: m.join(', ') } : s) });
    }
    setCustomMemo("");
    setIsMemoDirectInputMode(false);
    startAutoCloseTimer();
  };

  const handleDeleteChip = (subItemId: string, text: string) => {
    const si = order.subItems.find(s => s.id === subItemId);
    if (!si || !si.memo) return;
    const newMemo = si.memo.split(',').map(m => m.trim()).filter(m => m !== text).join(', ');
    onUpdate(order.id, { subItems: order.subItems.map(s => s.id === activeMemoSubId ? { ...s, memo: newMemo } : s) });
  };

  const handleResetCard = () => {
    onUpdate(order.id, { avatar: '', subItems: [] });
    setShowAvatarPicker(true);
    setIsMoreExpanded(false);
    setIsDirectInputMode(false);
    setIsMemoDirectInputMode(false);
    setActiveMemoSubId(null);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (expandIntervalRef.current) clearInterval(expandIntervalRef.current);
    setTimeLeft(5.0);
  };

  const handleAvatarClick = () => {
    if (activeMemoSubId) return;
    if (isUndecided || isNotEating) handleResetCard();
    else setShowAvatarPicker(true);
  };

  // 공용 메뉴 카드는 기존 로직 유지 (항상 흰색 배경)
  if (isGroupAvatar) {
    const isSynced = appSettings.isSharedSyncActive;
    return (
      <div className={`relative rounded-[24px] shadow-toss-card border-2 h-full flex flex-col p-4 transition-all duration-300 bg-white overflow-visible ${highlighted ? 'border-toss-blue ring-4 ring-toss-blueLight animate-highlight-ping z-20 shadow-xl' : 'border-toss-grey-100'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-toss-blueLight flex items-center justify-center"><UtensilsCrossed size={14} className="text-toss-blue" /></div>
              <h3 className="text-[12px] font-black text-toss-grey-900 tracking-tight">함께 먹는 메뉴</h3>
            </div>
            <button onClick={() => onCopyGroupItemToAll(order.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black transition-all ${isSynced ? 'bg-toss-blue text-white shadow-lg shadow-toss-blue/20 ring-2 ring-toss-blue/10 animate-pulse' : 'bg-toss-grey-100 text-toss-grey-400 border border-toss-grey-200'}`}>
              <RefreshCw size={10} strokeWidth={3} className={isSynced ? 'animate-spin-slow' : ''} />
              {isSynced ? '동기화 중' : '동기화 시작'}
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar mb-4 min-h-[50px]">
            {order.subItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-toss-grey-100 rounded-2xl bg-toss-grey-50/50 p-6 text-center">
                <span className="text-[12px] font-black text-toss-grey-800 mb-2">함께 나눌 메뉴가 아직 없어요</span>
              </div>
            ) : (
              (order.subItems as ExtendedSubItem[]).map(si => (
                <div key={si.id} className="flex flex-col rounded-xl border-2 bg-white overflow-hidden shadow-sm transition-colors border-toss-grey-100">
                  <div className="relative h-8 w-full flex items-center justify-center border-b-2 px-1 bg-toss-grey-50/50 border-toss-grey-50">
                    <button onClick={() => onOpenMenuModal(order.id, si.itemName, si.id, si.type)} className="flex-1 px-4 text-[12px] font-black truncate text-center text-toss-grey-800">{si.itemName}</button>
                  </div>
                  <div className="h-9 flex items-center justify-between px-4 bg-white">
                    <button onClick={() => onUpdate(order.id, { subItems: order.subItems.map(item => item.id === si.id ? { ...item, quantity: Math.max(1, (item.quantity || 1) - 1) } : item) })} className="p-1.5 rounded-lg bg-toss-grey-100 text-toss-grey-600 active:scale-90"><Minus size={14} strokeWidth={3} /></button>
                    <span className="text-[13px] font-black text-toss-grey-900">{si.quantity || 1}개</span>
                    <button onClick={() => onUpdate(order.id, { subItems: order.subItems.map(item => item.id === si.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item) })} className="p-1.5 rounded-lg bg-toss-blueLight text-toss-blue active:scale-90"><Plus size={14} strokeWidth={3} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto shrink-0">
            <button onClick={() => onOpenMenuModal(order.id, '미정', null, 'DESSERT')} className="h-10 bg-toss-blue text-white rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-lg shadow-toss-blue/10"><Plus size={14} strokeWidth={3} /><span className="text-[11px] font-black uppercase tracking-tight">메뉴 추가</span></button>
            <button onClick={() => onUpdate(order.id, { subItems: [] })} className="h-10 bg-toss-grey-100 text-toss-grey-600 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-toss-grey-200"><Trash2 size={14} /><span className="text-[11px] font-black uppercase tracking-tight">비우기</span></button>
          </div>
        </div>
      </div>
    );
  }

  // 개인 주문 카드: 통합 컨테이너 사용
  return (
    <div className={`relative rounded-[20px] h-full flex flex-col p-1.5 transition-all duration-500 overflow-visible z-10 
      ${highlighted ? 'border-toss-blue ring-4 ring-toss-blueLight animate-highlight-ping z-20 shadow-xl' : 'shadow-toss-card'}
      ${isUndecided ? 'bg-yellow-50 border-2 border-yellow-400' : 
        isNotEating ? 'bg-toss-grey-100 border-2 border-toss-grey-300' :
        isDecided ? 'bg-toss-blueLight border-2 border-toss-blue' :
        'bg-white border-2 border-toss-grey-100'}
    `}>
      {/* 상태 배지: 이모지 선택 중에도 유지 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none">
        {isUndecided && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[7px] font-black shadow-md border border-yellow-500/20 whitespace-nowrap uppercase flex items-center justify-center">주문 전</motion.div>
        )}
        {isNotEating && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-toss-grey-400 text-white px-2.5 py-0.5 rounded-full text-[8px] font-black shadow-md border border-toss-grey-500/20 whitespace-nowrap uppercase flex items-center justify-center">먹지 않겠대요</motion.div>
        )}
        {isDecided && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-toss-blue text-white px-2 py-0.5 rounded-full text-[7px] font-black shadow-md border border-toss-blue/20 whitespace-nowrap uppercase flex items-center justify-center">주문 완료</motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAvatarPicker ? (
          /* 이모지 선택 화면 */
          <motion.div 
            key="avatar-picker"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col"
          >
            <div className="grid grid-cols-4 gap-1 flex-1 items-center justify-items-center overflow-y-auto no-scrollbar pt-1">
              <button onClick={() => handleAvatarSelect(CATEGORY_EMOJIS[appSettings.randomCategory][Math.floor(Math.random() * 16)])} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/50 text-toss-blue transition-transform active:scale-90 border border-toss-blue/10"><Dices size={24} /></button>
              {appSettings.defaultEmojis.map(emoji => (
                <button key={emoji} onClick={() => handleAvatarSelect(emoji)} className="w-11 h-11 flex items-center justify-center rounded-xl text-2xl bg-white border border-toss-grey-100 shadow-sm transition-transform active:scale-90 hover:border-toss-blue/30">{emoji}</button>
              ))}
            </div>
            <button onClick={() => onRemove(order.id)} className="w-full h-8 mt-1.5 rounded-xl text-[10px] font-black text-white bg-toss-grey-400 hover:bg-toss-red transition-all shadow-sm">인원 삭제</button>
          </motion.div>
        ) : (
          /* 주문 상세 화면 */
          <motion.div 
            key="order-detail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-start h-full relative overflow-visible"
          >
            <div className="w-full flex flex-col items-center relative py-2 shrink-0 overflow-visible">
              <div className="relative inline-block mb-1 z-10">
                <button onClick={handleAvatarClick} className="text-5xl active:scale-95 transition-transform drop-shadow-sm select-none animate-float relative z-10">{order.avatar}</button>
                <AnimatePresence>
                  {justCompleted && (
                    <motion.div initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }} animate={{ opacity: 1, scale: 1.1, x: 10, y: -10 }} exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute top-0 right-0 z-20 pointer-events-none">
                      <Heart className="text-toss-red fill-toss-red drop-shadow-sm" size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {(!isUndecided && !isNotEating) && (
                  <>
                    <div className="absolute left-1 top-4 flex flex-col items-end gap-0.5 z-[20]">
                      {leftMemos.map((m, idx) => (
                        <motion.div key={`left-${idx}`} initial={{ opacity: 0, x: 5, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={(e) => { e.stopPropagation(); handleDeleteChip(m.subItemId, m.text); }} className="bg-white border border-toss-blue text-toss-blue px-1 py-0.5 rounded shadow-toss-sm relative max-w-[40px] cursor-pointer active:scale-95 transition-all">
                          <p className="text-[6px] font-black leading-tight whitespace-nowrap truncate">{m.text}</p>
                        </motion.div>
                      ))}
                    </div>
                    <div className="absolute right-1 top-4 flex flex-col items-start gap-0.5 z-[20]">
                      {rightMemos.map((m, idx) => (
                        <motion.div key={`right-${idx}`} initial={{ opacity: 0, x: -5, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={(e) => { e.stopPropagation(); handleDeleteChip(m.subItemId, m.text); }} className="bg-white border border-toss-blue text-toss-blue px-1 py-0.5 rounded shadow-toss-sm relative max-w-[40px] cursor-pointer active:scale-95 transition-all">
                          <p className="text-[6px] font-black leading-tight whitespace-nowrap truncate">{m.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full mt-1 flex-1 flex flex-col justify-start overflow-visible">
              {isUndecided ? (
                <motion.div layout transition={{ type: 'spring', damping: 25, stiffness: 180 }} className="w-full space-y-0.5 animate-in slide-in-from-bottom-2 pb-1 overflow-visible px-1">
                  <AnimatePresence mode="wait">
                    {!isMoreExpanded ? (
                      <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-0.5">
                        <div className="flex flex-col gap-0.5">
                          {quickMenuOptions.map((menu, idx) => (
                            <button key={idx} onClick={() => handleInitialOrderFinalize(menu)} className="w-full h-7 bg-white border border-yellow-200 rounded-md font-black text-[10px] text-yellow-800 truncate px-1 shadow-sm text-center active:bg-yellow-100">{menu}</button>
                          ))}
                        </div>
                        <button onClick={() => setIsMoreExpanded(true)} className="w-full h-7 bg-yellow-200 text-yellow-900 rounded-md flex flex-col items-center justify-center font-black text-[9px] shadow-sm mt-0.5 active:scale-[0.98] leading-tight relative overflow-hidden transition-all duration-300">
                          <div className="absolute inset-0 bg-white/20 w-full scale-x-0 origin-left" style={{ transform: `scaleX(${1 - (expandTimeLeft / 1.5)})`, transition: 'transform 0.1s linear' }} />
                          <span className="relative z-10 flex items-center gap-0.5">더보기 <ChevronDown size={10} /></span>
                          <span className="relative z-10 text-[7px] opacity-70 font-bold">{expandTimeLeft.toFixed(1)}초 후 자동 확장</span>
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="expanded" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ type: 'spring', damping: 25, stiffness: 180 }} className="flex flex-col gap-0.5 overflow-hidden">
                        {drinkItems.filter(i => i !== '미정' && i !== '안 먹음').map((menu, idx) => (
                          <button key={idx} onClick={() => handleInitialOrderFinalize(menu)} className="w-full h-7 bg-white border border-yellow-200 rounded-md font-black text-[9px] text-yellow-800 shrink-0 shadow-sm text-center active:bg-yellow-50">{menu}</button>
                        ))}
                        {isDirectInputMode ? (
                          <div className="relative h-7 w-full animate-in zoom-in-95 duration-200">
                            <input type="text" lang="ko" enterKeyHint="done" placeholder="입력..." className="w-full h-full bg-white border border-toss-blue rounded-md pl-2 pr-7 text-[9px] font-black text-toss-grey-900 focus:outline-none placeholder:text-toss-grey-300 text-center" value={customMenuName} onChange={(e) => setCustomMenuName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInitialOrderFinalize(customMenuName)} onBlur={() => !customMenuName && setIsDirectInputMode(false)} autoFocus />
                            <button onClick={() => handleInitialOrderFinalize(customMenuName)} className="absolute right-1 top-1/2 -translate-y-1/2 text-toss-blue hover:text-toss-blue/70 transition-colors p-1"><Send size={10} strokeWidth={3} /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => onOpenMenuModal(order.id, '미정', null, 'DESSERT')} className="w-full h-7 bg-amber-500 text-white rounded-md font-black text-[9px] shrink-0 flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-sm mb-0.5"><CakeSlice size={10} strokeWidth={3} /> 디저트 보기</button>
                            <button onClick={() => { setCustomMenuName(""); setIsDirectInputMode(true); }} className="w-full h-7 bg-toss-blue text-white rounded-md font-black text-[9px] shrink-0 flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-sm mb-0.5"><Pencil size={8} strokeWidth={3} /> 직접 입력</button>
                            <button onClick={() => handleInitialOrderFinalize('안 먹음')} className="w-full h-7 bg-toss-grey-200 text-toss-grey-600 rounded-md font-black text-[9px] shrink-0 flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-sm"><UserMinus size={10} /> 먹지 않겠대요</button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : isNotEating ? (
                <div className="w-full flex flex-col items-center justify-center py-2 animate-in fade-in duration-500 overflow-visible px-2">
                  <p className="text-[12px] font-black text-toss-grey-600 mb-2">먹지 않겠대요</p>
                  <button onClick={handleResetCard} className="w-full h-8 bg-toss-grey-200 text-toss-grey-800 rounded-md font-black text-[10px] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1 border border-toss-grey-300"><RotateCcw size={12} strokeWidth={3} /> 되돌리기</button>
                </div>
              ) : activeMemoSubId ? (
                <div className="w-full space-y-1 animate-in slide-in-from-right-4 overflow-visible px-1">
                  <div className="grid grid-cols-2 gap-0.5 max-h-[80px] overflow-y-auto no-scrollbar">
                    {appSettings.quickMemos.map((memo) => {
                      const isSelected = order.subItems.find(si => si.id === activeMemoSubId)?.memo?.includes(memo);
                      return (
                        <button key={memo} onClick={() => {
                          const si = order.subItems.find(s => s.id === activeMemoSubId);
                          if (!si) return;
                          let m = si.memo ? si.memo.split(',').map(x => x.trim()).filter(Boolean) : [];
                          m = isSelected ? m.filter(x => x !== memo) : [...m, memo];
                          onUpdate(order.id, { subItems: order.subItems.map(s => s.id === activeMemoSubId ? { ...s, memo: m.join(', ') } : s) });
                          startAutoCloseTimer();
                        }} className={`h-7 rounded-md font-black text-[8px] border transition-all ${isSelected ? 'bg-toss-blue border-toss-blue text-white' : 'bg-white border-toss-grey-100 text-toss-grey-700'}`}>{memo}</button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {isMemoDirectInputMode ? (
                      <div className="relative h-7 w-full animate-in zoom-in-95 duration-200">
                        <input type="text" lang="ko" enterKeyHint="done" placeholder="메모 입력..." className="w-full h-full bg-white border border-toss-blue rounded-md pl-2 pr-7 text-[9px] font-black text-toss-grey-900 focus:outline-none placeholder:text-toss-grey-300 text-center" value={customMemo} onChange={(e) => setCustomMemo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCustomMemo()} onBlur={() => !customMemo && setIsDirectInputMode(false)} autoFocus />
                        <button onClick={handleAddCustomMemo} className="absolute right-1 top-1/2 -translate-y-1/2 text-toss-blue hover:text-toss-blue/70 transition-colors p-1"><Send size={10} strokeWidth={3} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setIsMemoDirectInputMode(true)} className="w-full h-7 bg-toss-blue text-white rounded-md font-black text-[9px] shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"><Pencil size={8} strokeWidth={3} /> 직접 입력</button>
                    )}
                    <button onClick={() => { setActiveMemoSubId(null); setIsMemoDirectInputMode(false); }} className="w-full h-7 bg-toss-grey-900 text-white rounded-md font-black text-[10px] shadow-sm active:scale-95 transition-all flex flex-col items-center justify-center leading-tight relative overflow-hidden group">
                       <div className="absolute inset-0 bg-white/10 w-full scale-x-0 origin-left" style={{ transform: `scaleX(${1 - (timeLeft / 5.0)})`, transition: timeLeft === 5.0 ? 'none' : 'transform 0.1s linear' }} />
                       <span className="relative z-10">{timeLeft === 5.0 ? "완료" : `${timeLeft.toFixed(1)}초 후 자동 완료`}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-1 overflow-visible px-1">
                  {order.subItems.map(si => (
                    <div key={si.id} className="flex flex-col gap-1 animate-in fade-in duration-300 overflow-visible">
                      <div className="relative w-full h-7">
                        <button onClick={() => onOpenMenuModal(order.id, si.itemName, si.id, si.type)} className="w-full h-full bg-toss-grey-100 rounded-lg flex items-center justify-center border border-toss-grey-200 shadow-sm active:scale-95 transition-all px-6"><span className="text-[11px] font-black text-toss-grey-800 truncate text-center">{si.itemName}</span></button>
                        <button onClick={(e) => { e.stopPropagation(); setActiveMemoSubId(si.id); startAutoCloseTimer(); }} className="absolute right-1 top-1/2 -translate-y-1/2 text-toss-grey-300 hover:text-toss-blue p-1 active:scale-90 transition-transform"><MessageCircle size={10} /></button>
                      </div>
                      {si.itemName !== '미정' && si.itemName !== '안 먹음' && si.type === 'DRINK' && (
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1 h-7">
                            <button onClick={() => onUpdate(order.id, { subItems: order.subItems.map(s => s.id === si.id ? { ...s, temperature: 'HOT' } : s) })} className={`flex-1 flex items-center justify-center gap-1 rounded-lg transition-all border ${si.temperature === 'HOT' ? 'bg-toss-redLight border-toss-red text-toss-red' : 'bg-white border-toss-grey-100 text-toss-grey-300'}`}><Flame size={10} strokeWidth={3} /><span className="text-[8px] font-black">HOT</span></button>
                            <button onClick={() => onUpdate(order.id, { subItems: order.subItems.map(s => s.id === si.id ? { ...s, temperature: 'ICE' } : s) })} className={`flex-1 flex items-center justify-center gap-1 rounded-lg transition-all border ${si.temperature === 'ICE' ? 'bg-toss-blueLight border-toss-blue text-toss-blue' : 'bg-white border-toss-grey-100 text-toss-grey-300'}`}><Snowflake size={10} strokeWidth={3} /><span className="text-[8px] font-black">ICE</span></button>
                          </div>
                          {appSettings.showDrinkSize && (
                            <div className="flex gap-1 h-7">
                              {(['Tall', 'Grande', 'Venti'] as DrinkSize[]).map((sz) => {
                                const isSizeSelected = (si.size || 'Tall') === sz;
                                return (
                                  <button 
                                    key={sz} 
                                    onClick={() => onUpdate(order.id, { subItems: order.subItems.map(s => s.id === si.id ? { ...s, size: sz } : s) })} 
                                    className={`flex-1 flex items-center justify-center rounded-lg border transition-all text-[8px] font-black ${isSizeSelected ? 'bg-toss-blue border-toss-blue text-white shadow-sm' : 'bg-white border-toss-grey-100 text-toss-grey-400'}`}
                                  >
                                    {sz.charAt(0)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <button onClick={() => onOpenMenuModal(order.id, '미정', null, 'DESSERT')} className="h-8 bg-toss-blueLight text-toss-blue rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm border border-toss-blue/5"><Plus size={12} strokeWidth={3} /> 주문 추가</button>
                    <button onClick={handleResetCard} className="h-8 bg-toss-grey-200 text-toss-grey-800 rounded-xl font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm border border-toss-grey-300"><RotateCcw size={12} strokeWidth={3} /> 되돌리기</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
