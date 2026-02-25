
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderItem, ItemType, DrinkSize, AppSettings, OrderSubItem, EmojiCategory } from '../types';
import { Snowflake, Flame, Trash2, Plus, Dices, MoreHorizontal, AlertCircle, ArrowLeft, ChevronDown, ChevronUp, User, MessageCircle, Check, Pencil, Send, Minus, UtensilsCrossed, UserMinus, RefreshCw, CakeSlice, Info, Clock, RotateCcw, Heart, X } from 'lucide-react';
import { EmojiRenderer } from './EmojiRenderer.tsx';

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
  onUpdateCheckedItems?: (name: string, checked: boolean) => void;
}

const CATEGORY_EMOJIS: Record<EmojiCategory, string[]> = {
  ANIMALS: ["🦁", "🐯", "🐨", "🐷", "🐸", "🐵", "🐔", "🐧", "🐧", "🐦", "🐥", "🦉", "🐺", "북극곰", "🐴", "🦄", "🐝"],
  FACES: ["😀", "😍", "😎", "🤔", "😴", "🤩", "🥳", "🥺", "😡", "🤢", "🤡", "👻", "👽", "🤖", "💩", "✨"],
  HANDS: ["👍🏻", "👎🏻", "👊🏻", "✌🏻", "👌🏻", "✋🏻", "👐🏻", "🙌🏻", "👏🏻", "🙏🏻", "🤝🏻", "🤘🏻", "🤙🏻", "👋🏻", "✍🏻", "💪🏻"],
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
  onInputModeChange,
  onUpdateCheckedItems
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
  const [localQuickMemos, setLocalQuickMemos] = useState<string[]>([]);

  useEffect(() => {
    setLocalQuickMemos(appSettings.quickMemos);
  }, [appSettings.quickMemos]);
  
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

  const allMemos = memoChips;

  const quickMenuOptions = useMemo(() => {
    return appSettings.checkedDrinkItems || [];
  }, [appSettings.checkedDrinkItems]);

  const handleAvatarSelect = (emoji: string) => {
    onUpdate(order.id, { avatar: emoji });
    setShowAvatarPicker(false);
  };

  const handleInitialOrderFinalize = (menuName?: string) => {
    const finalName = menuName || '미정';
    if (finalName !== '미정' && finalName !== '안 먹음' && !drinkItems.includes(finalName)) {
      onAddMenuItem(finalName, 'DRINK');
      onUpdateCheckedItems?.(finalName, true);
    }
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
    const text = customMemo.trim();
    
    // 예시 칩에 추가
    if (!localQuickMemos.includes(text)) {
      setLocalQuickMemos(prev => [...prev, text]);
    }

    const si = order.subItems.find(s => s.id === activeMemoSubId);
    if (!si) return;
    let m = si.memo ? si.memo.split(',').map(x => x.trim()).filter(Boolean) : [];
    if (!m.includes(text)) {
      m = [...m, text];
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
    onUpdate(order.id, { subItems: order.subItems.map(s => s.id === subItemId ? { ...s, memo: newMemo } : s) });
  };

  const handleUndoOrder = () => {
    onUpdate(order.id, { subItems: [] });
    setIsMoreExpanded(false);
    setIsDirectInputMode(false);
    setIsMemoDirectInputMode(false);
    setActiveMemoSubId(null);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (expandIntervalRef.current) clearInterval(expandIntervalRef.current);
    setTimeLeft(5.0);
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
    <div className={`relative rounded-[24px] flex flex-col p-2 pb-4 transition-all duration-500 overflow-visible z-10 
      ${highlighted ? 'border-toss-blue ring-4 ring-toss-blueLight animate-highlight-ping z-20 shadow-xl' : 'shadow-toss-card'}
      ${isUndecided ? 'bg-yellow-50 border-2 border-yellow-400' : 
        isNotEating ? 'bg-toss-grey-100 border-2 border-toss-grey-300' :
        isDecided ? 'bg-toss-blueLight border-2 border-toss-blue' :
        'bg-white border-2 border-toss-grey-100'}
    `}>
      {/* 상태 배지: 이모지 선택 중에도 유지 - 제거됨 (이모지 옆으로 이동) */}
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
            <div className="grid grid-cols-4 gap-1.5 flex-1 items-center justify-items-center overflow-y-auto no-scrollbar pt-1 pb-2">
              <button onClick={() => handleAvatarSelect(CATEGORY_EMOJIS[appSettings.randomCategory][Math.floor(Math.random() * 16)])} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 text-toss-blue transition-transform active:scale-90 border border-toss-blue/10"><Dices size={20} /></button>
              {appSettings.defaultEmojis.map(emoji => (
                <button key={emoji} onClick={() => handleAvatarSelect(emoji)} className="w-9 h-9 flex items-center justify-center rounded-xl transition-transform active:scale-90 leading-none">
                  <EmojiRenderer emoji={emoji} size={28} />
                </button>
              ))}
            </div>
            <button onClick={() => onRemove(order.id)} className="w-full h-9 mt-1 rounded-xl text-[10px] font-black text-white bg-toss-grey-400 hover:bg-toss-red transition-all shadow-sm shrink-0">인원 삭제</button>
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
            <div className="w-full flex flex-col items-center relative py-1 shrink-0 overflow-visible">
              {/* 상태 표시: 좌측 상단 내부 아이콘 스타일 */}
              <div className="absolute top-0 left-0 z-[50] pointer-events-none">
                {isUndecided && (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-8 h-8 bg-yellow-400 text-yellow-900 rounded-br-xl rounded-tl-lg shadow-sm border border-yellow-500/20 flex items-center justify-center">
                    <Clock size={18} strokeWidth={3} />
                  </motion.div>
                )}
                {isNotEating && (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-8 h-8 bg-toss-grey-200 text-toss-grey-900 rounded-br-xl rounded-tl-lg shadow-sm border border-toss-grey-300 flex items-center justify-center">
                    <X size={18} strokeWidth={3} />
                  </motion.div>
                )}
                {isDecided && (
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-8 h-8 bg-toss-blue text-white rounded-br-xl rounded-tl-lg shadow-sm border border-toss-blue/20 flex items-center justify-center">
                    <Check size={18} strokeWidth={3} />
                  </motion.div>
                )}
              </div>

              {/* 메모 표시: 우측 상단 내부 정사각형 - 제거됨 (메뉴 하단으로 이동) */}

              <div className="relative inline-block mb-1 z-10 pt-2">
                <button onClick={handleAvatarClick} className="text-5xl active:scale-95 transition-transform drop-shadow-sm select-none animate-float relative z-10">
                  <EmojiRenderer emoji={order.avatar} size={48} />
                  {/* 말풍선 아이콘: 메모가 있을 때 표시 */}
                  {allMemos.length > 0 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-toss-blue/20 z-20"
                    >
                      <MessageCircle size={10} className="text-toss-blue fill-toss-blue/10" />
                    </motion.div>
                  )}
                </button>
                <AnimatePresence>
                  {justCompleted && (
                    <motion.div initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }} animate={{ opacity: 1, scale: 1.1, x: 10, y: -10 }} exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute top-0 right-0 z-20 pointer-events-none">
                      <Heart className="text-toss-red fill-toss-red drop-shadow-sm" size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                      <motion.div key="expanded" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ type: 'spring', damping: 25, stiffness: 180 }} className="flex flex-col gap-0.5 overflow-visible">
                        {drinkItems.filter(i => i !== '미정' && i !== '안 먹음').map((menu, idx) => (
                          <button key={idx} onClick={() => handleInitialOrderFinalize(menu)} className="w-full h-8 bg-white border border-yellow-200 rounded-lg font-black text-[10px] text-yellow-800 shrink-0 shadow-sm text-center active:bg-yellow-50 mb-1">{menu}</button>
                        ))}
                        {isDirectInputMode ? (
                          <div className="relative h-8 w-full animate-in zoom-in-95 duration-200">
                            <input type="text" lang="ko" enterKeyHint="done" placeholder="입력..." className="w-full h-full bg-white border border-toss-blue rounded-lg pl-2 pr-7 text-[10px] font-black text-toss-grey-900 focus:outline-none placeholder:text-toss-grey-300 text-center" value={customMenuName} onChange={(e) => setCustomMenuName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInitialOrderFinalize(customMenuName)} onBlur={() => !customMenuName && setIsDirectInputMode(false)} autoFocus />
                            <button onClick={() => handleInitialOrderFinalize(customMenuName)} className="absolute right-1 top-1/2 -translate-y-1/2 text-toss-blue hover:text-toss-blue/70 transition-colors p-1"><Send size={12} strokeWidth={3} /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setCustomMenuName(""); setIsDirectInputMode(true); }} className="w-full h-8 bg-toss-grey-100 text-toss-grey-700 rounded-lg font-black text-[10px] shrink-0 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-toss-grey-200 shadow-sm mb-1"><Pencil size={10} strokeWidth={3} /> 직접 입력</button>
                            <button onClick={() => onOpenMenuModal(order.id, '미정', null, 'DESSERT')} className="w-full h-8 bg-toss-grey-100 text-toss-grey-700 rounded-lg font-black text-[10px] shrink-0 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-toss-grey-200 shadow-sm mb-1"><UtensilsCrossed size={12} strokeWidth={3} /> 메뉴판 보기</button>
                            <button onClick={() => handleInitialOrderFinalize('안 먹음')} className="w-full h-8 bg-toss-grey-100 text-toss-grey-700 rounded-lg font-black text-[10px] shrink-0 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-toss-grey-200 shadow-sm"><UserMinus size={12} /> 먹지 않겠대요</button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : isNotEating ? (
                <div className="w-full flex flex-col items-center justify-center py-2 animate-in fade-in duration-500 overflow-visible px-2">
                  <p className="text-[12px] font-black text-toss-grey-600 mb-2">먹지 않겠대요</p>
                  <button onClick={handleUndoOrder} className="w-full h-8 bg-toss-grey-100 text-toss-grey-700 rounded-lg font-black text-[10px] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 border border-toss-grey-200"><RotateCcw size={12} strokeWidth={3} /> 되돌리기</button>
                </div>
              ) : (
                <div className="w-full space-y-1.5 overflow-visible px-1">
                  {order.subItems.map((si, idx) => (
                    <div key={si.id} className="flex flex-col gap-1.5 animate-in fade-in duration-300 overflow-visible">
                      {idx > 0 && <div className="w-full h-[1px] bg-toss-grey-100 my-0.5" />}
                      <div className="relative w-full h-7 flex items-center justify-center">
                        <button onClick={() => onOpenMenuModal(order.id, si.itemName, si.id, si.type)} className="w-full h-full bg-toss-grey-100 rounded-lg flex items-center justify-center border border-toss-grey-200 shadow-sm active:scale-95 transition-all px-8">
                          <span className="text-[11px] font-black text-toss-grey-800 truncate text-center w-full">{si.itemName}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setActiveMemoSubId(si.id === activeMemoSubId ? null : si.id); startAutoCloseTimer(); }} className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 active:scale-90 transition-transform ${activeMemoSubId === si.id ? 'text-toss-blue' : 'text-toss-grey-300 hover:text-toss-blue'}`}>
                          <MessageCircle size={10} />
                        </button>
                      </div>

                      {si.itemName !== '미정' && si.itemName !== '안 먹음' && si.type === 'DRINK' && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex gap-1.5 h-7">
                            <button onClick={() => onUpdate(order.id, { subItems: order.subItems.map(s => s.id === si.id ? { ...s, temperature: 'HOT' } : s) })} className={`flex-1 flex items-center justify-center gap-1 rounded-lg transition-all border ${si.temperature === 'HOT' ? 'bg-toss-redLight border-toss-red text-toss-red' : 'bg-white border-toss-grey-100 text-toss-grey-300'}`}><Flame size={10} strokeWidth={3} /><span className="text-[8px] font-black">HOT</span></button>
                            <button onClick={() => onUpdate(order.id, { subItems: order.subItems.map(s => s.id === si.id ? { ...s, temperature: 'ICE' } : s) })} className={`flex-1 flex items-center justify-center gap-1 rounded-lg transition-all border ${si.temperature === 'ICE' ? 'bg-toss-blueLight border-toss-blue text-toss-blue' : 'bg-white border-toss-grey-100 text-toss-grey-300'}`}><Snowflake size={10} strokeWidth={3} /><span className="text-[8px] font-black">ICE</span></button>
                          </div>
                          {appSettings.showDrinkSize && (
                            <div className="flex gap-1.5 h-7">
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

                      {/* 통합 메모 영역: 펼쳐졌을 때는 선택 그리드, 닫혔을 때는 선택된 칩만 표시 */}
                      <div className="w-full overflow-hidden">
                        <motion.div 
                          layout
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="grid grid-cols-2 gap-1.5 w-full"
                        >
                          <AnimatePresence initial={false} mode="popLayout">
                            {(() => {
                              const isExpanded = activeMemoSubId === si.id;
                              const selectedMemos = si.memo ? si.memo.split(',').map(x => x.trim()).filter(Boolean) : [];
                              const visibleMemos = isExpanded ? localQuickMemos : selectedMemos;
                              
                              return visibleMemos.map((memo, idx, arr) => {
                                const isSelected = selectedMemos.includes(memo);
                                const isFullWidth = idx === arr.length - 1 && arr.length % 2 !== 0;
                                
                                return (
                                  <motion.button
                                    layout
                                    key={memo}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ 
                                      opacity: { duration: 0.2 },
                                      layout: { duration: 0.25, ease: "easeInOut" }
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isExpanded) {
                                        let m = [...selectedMemos];
                                        m = isSelected ? m.filter(x => x !== memo) : [...m, memo];
                                        onUpdate(order.id, { subItems: order.subItems.map(s => s.id === si.id ? { ...s, memo: m.join(', ') } : s) });
                                        startAutoCloseTimer();
                                      } else {
                                        handleDeleteChip(si.id, memo);
                                      }
                                    }}
                                    className={`h-7 flex items-center justify-center rounded-lg border font-black shadow-sm active:scale-95 text-[9px] transition-colors ${
                                      isSelected 
                                        ? 'bg-amber-50 border-amber-200 text-amber-900' 
                                        : 'bg-white border-toss-grey-100 text-toss-grey-700'
                                    } ${isFullWidth ? 'col-span-2' : ''}`}
                                  >
                                    {memo}
                                  </motion.button>
                                );
                              });
                            })()}
                          </AnimatePresence>
                        </motion.div>

                        <AnimatePresence>
                          {activeMemoSubId === si.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mt-1.5 space-y-1.5"
                            >
                              {isMemoDirectInputMode ? (
                                <div className="relative h-8 w-full animate-in zoom-in-95 duration-200">
                                  <input type="text" lang="ko" enterKeyHint="done" placeholder="메모 입력..." className="w-full h-full bg-white border border-toss-blue rounded-lg pl-2 pr-7 text-[10px] font-black text-toss-grey-900 focus:outline-none placeholder:text-toss-grey-300 text-center" value={customMemo} onChange={(e) => setCustomMemo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCustomMemo()} onBlur={() => !customMemo && setIsMemoDirectInputMode(false)} autoFocus />
                                  <button onClick={handleAddCustomMemo} className="absolute right-1 top-1/2 -translate-y-1/2 text-toss-blue hover:text-toss-blue/70 transition-colors p-1"><Send size={12} strokeWidth={3} /></button>
                                </div>
                              ) : (
                                <button onClick={() => setIsMemoDirectInputMode(true)} className="w-full h-8 bg-toss-blue text-white rounded-lg font-black text-[10px] shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"><Pencil size={10} strokeWidth={3} /> 직접 입력</button>
                              )}
                              <button onClick={() => { setActiveMemoSubId(null); setIsMemoDirectInputMode(false); }} className="w-full h-8 bg-toss-grey-900 text-white rounded-lg font-black text-[10px] shadow-sm active:scale-95 transition-all flex flex-col items-center justify-center leading-tight relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/10 w-full scale-x-0 origin-left" style={{ transform: `scaleX(${1 - (timeLeft / 5.0)})`, transition: timeLeft === 5.0 ? 'none' : 'transform 0.1s linear' }} />
                                <span className="relative z-10">{timeLeft === 5.0 ? "완료" : `${timeLeft.toFixed(1)}초 후 자동 완료`}</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button onClick={() => onOpenMenuModal(order.id, '미정', null, 'DESSERT')} className="flex-1 h-8 bg-toss-blueLight text-toss-blue rounded-lg font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm border border-toss-blue/10"><Plus size={12} strokeWidth={3} /> 추가</button>
                    <button onClick={handleUndoOrder} className="w-8 h-8 bg-toss-grey-100 text-toss-grey-700 rounded-lg font-black flex items-center justify-center active:scale-95 transition-all shadow-sm border border-toss-grey-200"><RotateCcw size={12} strokeWidth={3} /></button>
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
