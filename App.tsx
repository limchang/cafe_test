
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Menu, X, StickyNote, Smile, UtensilsCrossed, Pencil, Trash2, ChevronRight, Check, History, Bell, RefreshCw, LayoutGrid, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { OrderItem, OrderGroup, ItemType, AppSettings, OrderSubItem, OrderHistoryItem } from './types.ts';
import { OrderSummary } from './components/OrderSummary.tsx';
import { OrderGroupSection } from './components/OrderGroupSection.tsx';
import { MenuSelectionModal } from './components/MenuSelectionModal.tsx';
import { EmojiSettingsModal } from './components/EmojiSettingsModal.tsx';
import { QuickMemosModal } from './components/QuickMemosModal.tsx';
import { MenuManagementModal } from './components/MenuManagementModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';

const SETTINGS_STORAGE_KEY = 'cafesync_settings_v1';
const HISTORY_STORAGE_KEY = 'cafesync_history_v1';
export const DEFAULT_EMOJIS = ["👨", "👩", "👶", "🧓", "👵", "👦", "👧", "🐶", "😺", "🐯", "🐷"];

const createEmptyOrder = (): OrderItem => ({
  id: uuidv4(),
  avatar: '',
  subItems: [],
  memo: ''
});

function App() {
  const [drinkMenuItems, setDrinkMenuItems] = useState<string[]>(["미정", "아메리카노", "카페라떼", "카라멜마끼아또", "복숭아 아이스티"]);
  const [dessertMenuItems, setDessertMenuItems] = useState<string[]>(["케이크", "스콘", "크로와상", "마카롱"]);
  const [groups, setGroups] = useState<OrderGroup[]>([]);
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isSharedSyncActive, setIsSharedSyncActive] = useState(false);
  
  const [lastGroupsSnapshot, setLastGroupsSnapshot] = useState<OrderGroup[] | null>(null);
  const [undoToast, setUndoToast] = useState<{ message: string; id: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; id: string } | null>(null);
  
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [manageStep, setManageStep] = useState<'menu' | 'rename' | 'delete'>('menu');
  const [tempName, setTempName] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [activeInputCount, setActiveInputCount] = useState(0);
  const isAnyInputActive = activeInputCount > 0;

  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    showDrinkSize: false,
    quickMemos: ["샷추가", "덜쓰게", "물 따로", "얼음물"],
    defaultEmojis: [...DEFAULT_EMOJIS],
    randomCategory: 'ANIMALS'
  });
  
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<'collapsed' | 'expanded' | 'fullscreen'>('collapsed');
  const [isEmojiModalOpen, setIsEmojiModalOpen] = useState(false);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [isMenuMgmtModalOpen, setIsMenuMgmtModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const isInternalScrolling = useRef(false);

  const showToast = (message: string) => {
    const id = uuidv4();
    setToast({ message, id });
    setTimeout(() => {
      setToast(prev => prev?.id === id ? null : prev);
    }, 3000); 
  };

  const showUndoToast = (message: string) => {
    const id = uuidv4();
    setUndoToast({ message, id });
    setTimeout(() => {
      setUndoToast(prev => prev?.id === id ? null : prev);
    }, 3000); 
  };

  const [menuModalState, setMenuModalState] = useState<{
    isOpen: boolean;
    orderId: string | null;
    subItemId: string | null;
    initialSelections: OrderSubItem[];
    selectedItem: string;
    initialType?: ItemType;
  }>({
    isOpen: false,
    orderId: null,
    subItemId: null,
    initialSelections: [],
    selectedItem: '',
    initialType: 'DRINK'
  });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isInternalScrolling.current) return;
      const centerX = container.scrollLeft + container.clientWidth / 2;
      let closestId = null;
      let minDistance = Infinity;

      groups.forEach(group => {
        const el = document.getElementById(`group-${group.id}`);
        if (el) {
          const elCenterX = el.offsetLeft + el.clientWidth / 2;
          const distance = Math.abs(centerX - elCenterX);
          if (distance < minDistance) {
            minDistance = distance;
            closestId = group.id;
          }
        }
      });
      if (closestId && closestId !== activeGroupId) setActiveGroupId(closestId);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [groups, activeGroupId]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setAppSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error(e); }
      }
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
      }
      addGroup();
    }
  }, []);

  useEffect(() => {
    if (!isInitialMount.current) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  };

  const addGroup = () => {
    const newGroupId = uuidv4();
    const tableNums = groups.map(g => parseInt(g.name?.match(/\d+/)?.[0] || "0")).filter(n => n > 0);
    const nextNum = tableNums.length > 0 ? Math.max(...tableNums) + 1 : 1;
    
    let initialSharedSubItems: OrderSubItem[] = [];
    if (isSharedSyncActive && groups.length > 0) {
      const firstShared = groups[0].items.find(i => i.avatar === '😋');
      if (firstShared) initialSharedSubItems = JSON.parse(JSON.stringify(firstShared.subItems));
    }

    const initialItems = [
      ...Array.from({ length: 4 }, createEmptyOrder), 
      { id: uuidv4(), avatar: '😋', subItems: initialSharedSubItems }
    ];

    setGroups(prev => [...prev, { id: newGroupId, name: `${nextNum}번 테이블`, items: initialItems }]);
    setTimeout(() => {
      setActiveGroupId(newGroupId);
      scrollToTable(newGroupId);
    }, 100);
  };

  const handleResetAllTables = () => {
    if (!window.confirm("현재 작업 중인 모든 테이블과 주문 정보가 삭제됩니다.\n정말 초기화할까요?")) return;
    setIsMainMenuOpen(false);
    setGroups([]);
    setActiveGroupId(null);
    setIsSharedSyncActive(false);
    showToast("모든 테이블이 초기화되었습니다.");
    addGroup(); 
  };

  const removeGroup = (id: string) => {
    setLastGroupsSnapshot([...groups]);
    const nextGroups = groups.filter(g => g.id !== id);
    if (nextGroups.length === 0) {
      setGroups([]);
      setActiveGroupId(null);
    } else if (activeGroupId === id) {
      const nextActive = nextGroups[0];
      if (nextActive) {
        setActiveGroupId(nextActive.id);
        setTimeout(() => scrollToTable(nextActive.id), 50);
      }
    }
    setGroups(nextGroups);
    closeManageSheet();
    showUndoToast("테이블이 삭제되었습니다.");
  };

  const updateGroupName = (groupId: string, newName: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const renameGroup = () => {
    if (!managingGroupId) return;
    const finalName = tempName.trim() || groups.find(g => g.id === managingGroupId)?.name || "새 테이블";
    setLastGroupsSnapshot([...groups]);
    updateGroupName(managingGroupId, finalName);
    closeManageSheet();
    showUndoToast("테이블 이름이 변경되었습니다.");
  };

  const handleUndoAction = () => {
    if (lastGroupsSnapshot) {
      setGroups(lastGroupsSnapshot);
      setLastGroupsSnapshot(null);
      setUndoToast(null);
      showToast("이전 상태로 복구되었습니다.");
    }
  };

  const closeManageSheet = () => {
    setManagingGroupId(null);
    setManageStep('menu');
    setTempName("");
  };

  const openManageSheet = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setTempName("");
      setManagingGroupId(groupId);
      setManageStep('menu');
    }
  };

  const scrollToTable = (groupId: string) => {
    const element = document.getElementById(`group-${groupId}`);
    const container = scrollContainerRef.current;
    if (element && container) {
      isInternalScrolling.current = true;
      const offsetLeft = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);
      container.scrollTo({ left: offsetLeft, behavior: 'smooth' });
      setTimeout(() => { isInternalScrolling.current = false; }, 500);
    }
  };

  const handleSaveOrder = (summaryText: string, totalCount: number, memo?: string) => {
    const tableFirstChars = groups
      .filter(g => g.items.some(p => p.subItems.length > 0))
      .map(g => g.name.trim().match(/\d+/)?.[0] || g.name.trim().charAt(0))
      .filter(Boolean);
    
    const generatedTitle = tableFirstChars.length > 0 
      ? tableFirstChars.join(', ') + "번 테이블"
      : "새 주문";

    const newHistoryItem: OrderHistoryItem = {
      id: uuidv4(),
      timestamp: Date.now(),
      groups: JSON.parse(JSON.stringify(groups)),
      totalCount: totalCount,
      summaryText: summaryText,
      memo: memo,
      title: generatedTitle
    };
    setHistory(prev => [newHistoryItem, ...prev]);
    setSummaryState('collapsed');
    showToast('주문 내역이 저장되었습니다.');
  };

  const handleCopySharedMenuToAll = (orderId: string) => {
    if (isSharedSyncActive) {
      setIsSharedSyncActive(false);
      showToast('공용 메뉴 동기화가 해제되었습니다.');
      return;
    }
    const sourceGroup = groups.find(g => g.items.some(i => i.id === orderId));
    if (!sourceGroup) return;
    const sourceItem = sourceGroup.items.find(i => i.id === orderId);
    if (!sourceItem) return;
    const syncedSubItems = sourceItem.subItems.map(si => ({ ...si, isSynced: true }));
    setGroups(prev => prev.map(g => {
      if (g.id === sourceGroup.id) {
        return {
          ...g,
          items: g.items.map(i => i.id === orderId ? { ...i, subItems: syncedSubItems } : i)
        };
      }
      return {
        ...g,
        items: g.items.map(i => {
          if (i.avatar === '😋') {
            const currentSubItems = [...i.subItems] as (OrderSubItem & { isSynced?: boolean })[];
            syncedSubItems.forEach(sourceSub => {
              const existingIdx = currentSubItems.findIndex(si => si.itemName === sourceSub.itemName);
              if (existingIdx > -1) {
                currentSubItems[existingIdx] = { ...currentSubItems[existingIdx], quantity: sourceSub.quantity, isSynced: true };
              } else {
                currentSubItems.push(JSON.parse(JSON.stringify({ ...sourceSub, isSynced: true })));
              }
            });
            return { ...i, subItems: currentSubItems };
          }
          return i;
        })
      };
    }));
    setIsSharedSyncActive(true);
    showToast('동기화 활성: 원본 메뉴가 모든 테이블에 추가되었습니다.');
  };

  const updateOrder = (id: string, updates: Partial<OrderItem>) => {
    setGroups(prev => {
      const targetItem = prev.flatMap(g => g.items).find(i => i.id === id);
      const isShared = targetItem?.avatar === '😋';
      if (isSharedSyncActive && isShared && updates.subItems) {
        const oldSubItems = (targetItem?.subItems || []) as (OrderSubItem & { isSynced?: boolean })[];
        const newSubItems = updates.subItems as (OrderSubItem & { isSynced?: boolean })[];
        if (newSubItems.length === 0) {
          return prev.map(g => ({
            ...g,
            items: g.items.map(item => {
              if (item.avatar === '😋') {
                if (item.id === id) return { ...item, subItems: [] };
                return { ...item, subItems: item.subItems.filter(si => !(si as any).isSynced) };
              }
              return item;
            })
          }));
        }
        return prev.map(g => ({
          ...g,
          items: g.items.map(item => {
            if (item.avatar === '😋') {
              if (item.id === id) return { ...item, ...updates };
              let mirroredSubItems = [...item.subItems] as (OrderSubItem & { isSynced?: boolean })[];
              mirroredSubItems = mirroredSubItems.map(si => {
                const matchInNew = newSubItems.find(n => n.itemName === si.itemName);
                if (matchInNew) return { ...si, quantity: matchInNew.quantity, isSynced: true };
                const existsInOld = oldSubItems.find(o => o.itemName === si.itemName);
                if (existsInOld && existsInOld.isSynced && !matchInNew) return null; 
                return si;
              }).filter(Boolean) as any[];
              newSubItems.forEach(n => {
                const existsInMirror = mirroredSubItems.some(si => si.itemName === n.itemName);
                if (!existsInMirror) mirroredSubItems.push(JSON.parse(JSON.stringify({ ...n, isSynced: true })));
              });
              return { ...item, subItems: mirroredSubItems };
            }
            return item;
          })
        }));
      }
      return prev.map(g => ({
        ...g,
        items: g.items.map(item => item.id === id ? { ...item, ...updates } : item)
      }));
    });
  };

  const handleSetNotEating = (personIds: string[]) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.map(p => {
        if (!personIds.includes(p.id)) return p;
        return {
          ...p,
          subItems: [{
            id: uuidv4(),
            itemName: '안 먹음',
            type: 'DRINK',
            temperature: 'HOT',
            size: 'Tall',
            quantity: 1
          }]
        };
      })
    })));
    showToast('모두 먹지 않겠대요 처리되었습니다.');
  };

  const handleLoadPeopleOnly = (item: OrderHistoryItem) => {
    const cleanedGroups = item.groups.map(g => ({
      ...g,
      items: g.items.map(p => ({
        ...p,
        subItems: [],
        memo: ""
      }))
    }));
    setGroups(cleanedGroups);
    setActiveGroupId(cleanedGroups[0]?.id || null);
    showToast('인원 정보만 불러왔습니다.');
  };

  const currentManagingGroup = useMemo(() => 
    groups.find(g => g.id === managingGroupId), 
    [groups, managingGroupId]
  );

  const addMenuItemToState = (name: string, type: ItemType) => {
    if (type === 'DRINK') setDrinkMenuItems(prev => [...new Set([...prev, name])]);
    else if (type === 'DESSERT') setDessertMenuItems(prev => [...new Set([...prev, name])]);
  };

  const handleInputModeChange = (isActive: boolean) => {
    setActiveInputCount(prev => Math.max(0, isActive ? prev + 1 : prev - 1));
  };

  return (
    <div className="min-h-screen pb-24 bg-toss-bg text-toss-grey-900 flex flex-col relative overflow-x-hidden">
      <header className="bg-white/95 backdrop-blur-xl sticky top-0 z-[100] border-b border-toss-grey-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[18px] font-black text-toss-grey-900 tracking-tighter select-none">카페싱크</h1>
            <p className="text-[10px] font-bold text-toss-blue -mt-1 opacity-80">단체 주문 도우미</p>
          </div>
          <div className="relative">
            <button onClick={() => setIsMainMenuOpen(!isMainMenuOpen)} className={`p-1.5 rounded-xl transition-all ${isMainMenuOpen ? 'bg-toss-blue text-white shadow-lg' : 'bg-toss-grey-100 text-toss-grey-600'}`}>
              {isMainMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <AnimatePresence>
              {isMainMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-10 w-64 bg-white rounded-3xl shadow-toss-elevated border border-toss-grey-100 p-2 z-[51]">
                  <div className="p-1.5 border-b border-toss-grey-50"><span className="text-[9px] font-black text-toss-grey-400 uppercase tracking-widest px-1">주문 관리</span></div>
                  <button onClick={() => { setIsHistoryModalOpen(true); setIsMainMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-bold text-toss-grey-700 hover:bg-toss-grey-50 rounded-2xl"><History size={14} /> 저장된 주문 내역</button>
                  <button onClick={() => { setIsMenuMgmtModalOpen(true); setIsMainMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-bold text-toss-grey-700 hover:bg-toss-grey-50 rounded-2xl"><UtensilsCrossed size={14} /> 메뉴판 관리</button>
                  <div className="p-1.5 border-t border-b border-toss-grey-50 mt-1"><span className="text-[9px] font-black text-toss-grey-400 uppercase tracking-widest px-1">기능 설정</span></div>
                  <button onClick={() => { setIsEmojiModalOpen(true); setIsMainMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-bold text-toss-grey-700 hover:bg-toss-grey-50 rounded-2xl"><Smile size={14} /> 이모지 설정</button>
                  <button onClick={() => { setIsMemoModalOpen(true); setIsMainMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-bold text-toss-grey-700 hover:bg-toss-grey-50 rounded-2xl"><StickyNote size={14} /> 요청사항 관리</button>
                  <div className="p-1.5 border-t border-b border-toss-grey-50 mt-1"><span className="text-[9px] font-black text-toss-grey-400 uppercase tracking-widest px-1">시스템</span></div>
                  <div className="p-1 space-y-1">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-[12px] font-bold text-toss-grey-700">사이즈 옵션</span>
                      <button 
                        onClick={() => handleUpdateSettings({...appSettings, showDrinkSize: !appSettings.showDrinkSize})} 
                        className={`w-9 h-5 rounded-full transition-all relative ${appSettings.showDrinkSize ? 'bg-toss-blue' : 'bg-toss-grey-300'}`}
                      >
                        <div className={`absolute top-0.5 left-[3.5px] w-4 h-4 bg-white rounded-full transition-all duration-200 transform ${appSettings.showDrinkSize ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 p-1.5 border-t border-toss-grey-50">
                    <button onClick={handleResetAllTables} className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-black text-toss-red hover:bg-toss-redLight rounded-2xl transition-all shadow-sm active:scale-95"><RefreshCw size={14} strokeWidth={3} /> 초기화</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 py-2">
        {groups.length > 0 ? (
          <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 no-scrollbar px-4 scroll-smooth">
            {groups.map((group) => (
              <div key={group.id} id={`group-${group.id}`} className="snap-center shrink-0 w-[calc(100vw-32px)] sm:w-[340px]">
                <OrderGroupSection 
                  group={group} drinkMenuItems={drinkMenuItems} dessertMenuItems={dessertMenuItems} highlightedItemId={highlightedItemId} 
                  updateOrder={updateOrder} 
                  removeOrder={(id) => setGroups(prev => prev.map(g => ({ ...g, items: g.items.filter(item => item.id !== id) })))} 
                  addOrderItem={(gid) => setGroups(prev => prev.map(g => g.id === gid ? { ...g, items: [...g.items, createEmptyOrder()] } : g))}
                  addSharedMenuItem={(gid) => {
                    let initialSharedSubItems: OrderSubItem[] = [];
                    if (isSharedSyncActive && groups.length > 0) {
                      const firstShared = groups[0].items.find(i => i.avatar === '😋');
                      if (firstShared) initialSharedSubItems = JSON.parse(JSON.stringify(firstShared.subItems));
                    }
                    setGroups(prev => prev.map(g => g.id === gid ? { ...g, items: [...g.items, { id: uuidv4(), avatar: '😋', subItems: initialSharedSubItems }] } : g))
                  }}
                  onAddMenuItem={addMenuItemToState}
                  onRemoveMenuItem={() => {}} onOpenMenuModal={(oid, ci, sid, it) => setMenuModalState({ isOpen: true, orderId: oid, subItemId: sid || null, initialSelections: groups.flatMap(g => g.items).find(i => i.id === oid)?.subItems || [], selectedItem: ci, initialType: it })} 
                  onCopyGroupItemToAll={handleCopySharedMenuToAll} 
                  onDeleteGroupItemFromAll={() => {}} 
                  appSettings={{...appSettings, isSharedSyncActive}} 
                  onRemoveGroup={() => openManageSheet(group.id)}
                  onInputModeChange={handleInputModeChange}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-toss-card mb-6 border border-toss-grey-100"><LayoutGrid size={40} className="text-toss-grey-200" /></div>
            <h2 className="text-xl font-black text-toss-grey-800 mb-2">등록된 테이블이 없습니다</h2>
            <p className="text-sm font-bold text-toss-grey-400 text-center mb-8">하단의 버튼을 눌러 테이블을 추가해보세요.<br/>주문을 시작할 수 있습니다.</p>
            <button onClick={addGroup} className="px-8 py-4 bg-toss-blue text-white rounded-[24px] font-black text-[15px] shadow-lg shadow-toss-blue/20 active:scale-95 transition-all flex items-center gap-2"><Plus size={20} strokeWidth={3} /> 테이블 추가하기</button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {!isAnyInputActive && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-28 left-0 right-0 z-[40] flex justify-center px-4 pointer-events-none"
          >
            <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[28px] p-1.5 shadow-toss-elevated pointer-events-auto w-fit max-w-[calc(100vw-32px)] ring-1 ring-black/5 flex flex-col items-center transition-all duration-300">
              <div className="flex items-center justify-center gap-3 px-3 py-1 overflow-x-auto no-scrollbar max-w-full">
                {groups.map(group => {
                  const isActive = activeGroupId === group.id;
                  const firstChar = group.name.trim().charAt(0) || '?';
                  const hasUndecided = group.items.some(p => p.avatar && p.avatar !== '😋' && (p.subItems.length === 0 || p.subItems.every(si => si.itemName === '미정')));
                  return (
                    <div key={group.id} className="relative shrink-0 py-1">
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (activeGroupId === group.id) openManageSheet(group.id);
                          else { setActiveGroupId(group.id); scrollToTable(group.id); }
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[14px] transition-all relative ${isActive ? 'bg-toss-blue text-white shadow-md scale-110 z-10' : 'bg-toss-grey-100 text-toss-grey-400'}`}
                      >
                        {firstChar}
                        {hasUndecided && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 border-2 border-white rounded-full shadow-sm animate-pulse"></div>}
                      </motion.button>
                    </div>
                  );
                })}
                <div className="shrink-0 py-1">
                  <button onClick={addGroup} className="h-9 px-4 bg-toss-blueLight text-toss-blue rounded-full font-black text-[12px] active:scale-95 transition-all shadow-sm border border-toss-blue/10 whitespace-nowrap">테이블 추가</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {managingGroupId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeManageSheet} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} 
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-toss-elevated z-[2001] px-6 pt-1 pb-6 flex flex-col items-center max-w-lg mx-auto overflow-hidden"
            >
              <div className="w-8 h-1 bg-toss-grey-200 rounded-full my-2.5 shrink-0" />
              <AnimatePresence mode="wait">
                {manageStep === 'menu' && (
                  <motion.div key="menu" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                    <div className="w-full text-center mb-5"><h3 className="text-[16px] font-black text-toss-grey-900">{currentManagingGroup?.name} 관리</h3><p className="text-[12px] font-bold text-toss-grey-400">테이블 정보를 수정하거나 삭제합니다.</p></div>
                    <div className="w-full space-y-2">
                      <button onClick={() => setManageStep('rename')} className="w-full bg-toss-grey-100 p-3.5 rounded-[16px] flex items-center justify-between active:scale-[0.97] transition-all">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-toss-grey-600 shadow-sm"><Pencil size={16} /></div><span className="font-black text-toss-grey-800 text-[14px]">이름 변경하기</span></div><ChevronRight size={16} className="text-toss-grey-300" />
                      </button>
                      <button onClick={() => setManageStep('delete')} className="w-full bg-toss-redLight p-3.5 rounded-[16px] flex items-center justify-between active:scale-[0.97] transition-all">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-toss-red shadow-sm"><Trash2 size={16} /></div><span className="font-black text-toss-red text-[14px]">테이블 삭제하기</span></div><ChevronRight size={16} className="text-toss-red/30" />
                      </button>
                    </div>
                    <button onClick={closeManageSheet} className="w-full mt-4 py-2 rounded-2xl font-black text-toss-grey-400 hover:text-toss-grey-600 transition-all text-center text-[12px]">취소</button>
                  </motion.div>
                )}
                {manageStep === 'rename' && (
                  <motion.div key="rename" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                    <div className="w-full text-center mb-5"><h3 className="text-[16px] font-black text-toss-grey-900">이름 변경</h3><p className="text-[12px] font-bold text-toss-grey-400">새로운 이름을 입력해주세요.</p></div>
                    <div className="space-y-4">
                      <div className="relative">
                        <input ref={renameInputRef} autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder={currentManagingGroup?.name} onKeyDown={(e) => e.key === 'Enter' && renameGroup()} className="w-full bg-toss-grey-100 rounded-xl px-4 py-3 text-[14px] font-black text-toss-grey-900 focus:outline-none focus:ring-2 focus:ring-toss-blue transition-all border-none placeholder:opacity-40" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setManageStep('menu')} className="flex-1 py-3 rounded-xl font-black text-toss-grey-50 bg-toss-grey-100 active:scale-95 transition-all text-[13px]">뒤로</button>
                        <button onClick={renameGroup} className="flex-[2] py-3 rounded-xl font-black text-white bg-toss-blue active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-[13px]"><Check size={16} strokeWidth={3} /> 저장</button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {manageStep === 'delete' && (
                  <motion.div key="delete" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                    <div className="w-full text-center mb-5"><h3 className="text-[16px] font-black text-toss-red">정말 삭제할까요?</h3></div>
                    <div className="space-y-2">
                      <button onClick={() => removeGroup(currentManagingGroup!.id)} className="w-full py-3.5 bg-toss-red text-white rounded-[16px] font-black text-[14px] active:scale-95 transition-all shadow-lg">네, 삭제하겠습니다</button>
                      <button onClick={() => setManageStep('menu')} className="w-full py-3.5 bg-toss-grey-100 text-toss-grey-50 rounded-[16px] font-black text-[13px] active:scale-95 transition-all">취소</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isAnyInputActive && (
          <OrderSummary 
            groups={groups} onSaveHistory={handleSaveOrder} 
            onJumpToOrder={(gid, pid) => { 
              scrollToTable(gid); 
              setHighlightedItemId(pid); 
              setSummaryState('collapsed'); 
              setTimeout(() => setHighlightedItemId(null), 2000); 
            }} 
            onUpdateGroupName={updateGroupName}
            onSetNotEating={handleSetNotEating}
            appSettings={appSettings} expandState={summaryState} onSetExpandState={setSummaryState} 
          />
        )}
      </AnimatePresence>
      <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={history} onLoad={(item) => { setGroups(item.groups); setActiveGroupId(item.groups[0]?.id); }} onLoadPeopleOnly={handleLoadPeopleOnly} onDelete={(id) => setHistory(prev => prev.filter(h => h.id !== id))} onUpdate={(id, updates) => setHistory(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))} />
      <MenuManagementModal isOpen={isMenuMgmtModalOpen} onClose={() => setIsMenuMgmtModalOpen(false)} drinkItems={drinkMenuItems} dessertItems={dessertMenuItems} onAdd={addMenuItemToState} onRemove={() => {}} onUpdateMenuList={(l, t) => t === 'DRINK' ? setDrinkMenuItems(l) : setDessertMenuItems(l)} />
      <EmojiSettingsModal isOpen={isEmojiModalOpen} onClose={() => setIsEmojiModalOpen(false)} settings={appSettings} onUpdateSettings={handleUpdateSettings} />
      <QuickMemosModal isOpen={isMemoModalOpen} onClose={() => setIsMemoModalOpen(false)} settings={appSettings} onUpdateSettings={handleUpdateSettings} />
      <MenuSelectionModal 
        isOpen={menuModalState.isOpen} onClose={() => setMenuModalState(prev => ({ ...prev, isOpen: false }))} title="메뉴 선택" drinkItems={drinkMenuItems} dessertItems={dessertMenuItems} initialSelections={menuModalState.initialSelections} selectedItem={menuModalState.selectedItem} initialType={menuModalState.initialType} onAdd={addMenuItemToState} 
        onSelect={(s) => { 
          const { orderId, subItemId } = menuModalState;
          if(!orderId) return;
          const person = groups.flatMap(g => g.items).find(i => i.id === orderId);
          const isSharedMenu = person?.avatar === '😋';
          if (isSharedSyncActive && isSharedMenu) {
            const newItem = s[0];
            setGroups(prev => prev.map(g => ({
              ...g,
              items: g.items.map(p => {
                if (p.avatar === '😋') {
                  const existingIdx = p.subItems.findIndex(si => si.id === subItemId);
                  if (existingIdx > -1) {
                    return { ...p, subItems: p.subItems.map((si, idx) => idx === existingIdx ? { ...si, itemName: newItem.itemName, type: newItem.type, size: newItem.size || si.size || 'Tall', isSynced: true } : si) };
                  } else {
                    return { ...p, subItems: [...p.subItems, { id: uuidv4(), itemName: newItem.itemName, type: newItem.type, temperature: 'HOT', size: newItem.size || 'Tall', quantity: 1, isSynced: true }] };
                  }
                }
                return p;
              })
            })));
          } else {
            setGroups(prev => prev.map(g => ({ ...g, items: g.items.map(p => {
              if(p.id !== orderId) return p;
              if (subItemId) return { ...p, subItems: p.subItems.map(si => si.id === subItemId ? { ...si, itemName: s[0].itemName, type: s[0].type, size: s[0].size || si.size || 'Tall' } : si) };
              const newItems: OrderSubItem[] = s.map(sel => {
                const isIceDefault = sel.itemName.includes('스무디') || sel.itemName.includes('아이스');
                return { id: uuidv4(), itemName: sel.itemName, type: sel.type, temperature: isIceDefault ? 'ICE' : 'HOT', size: sel.size || 'Tall', quantity: 1 };
              });
              return { ...p, subItems: [...p.subItems, ...newItems] };
            }) })));
          }
          setMenuModalState(prev => ({ ...prev, isOpen: false }));
        }} 
        onDeleteSelection={() => {
          const { orderId, subItemId } = menuModalState;
          if(!orderId || !subItemId) return;
          const person = groups.flatMap(g => g.items).find(i => i.id === orderId);
          const isSharedMenu = person?.avatar === '😋';
          const subItem = person?.subItems.find(si => si.id === subItemId);
          if (isSharedSyncActive && isSharedMenu && subItem) {
            setGroups(prev => prev.map(g => ({
              ...g,
              items: g.items.map(p => {
                if (p.avatar === '😋') return { ...p, subItems: p.subItems.filter(si => si.itemName !== subItem.itemName) };
                return p;
              })
            })));
          } else {
            setGroups(prev => prev.map(g => ({ ...g, items: g.items.map(p => {
              if(p.id !== orderId) return p;
              return { ...p, subItems: p.subItems.filter(si => si.id !== subItemId) };
            }) })));
          }
          setMenuModalState(prev => ({ ...prev, isOpen: false }));
        }}
        onRemove={() => {}} appSettings={appSettings} 
      />
      
      <AnimatePresence>
        {undoToast && (
          <motion.button 
            initial={{ y: 50, x: "-50%", opacity: 0 }} 
            animate={{ y: 0, x: "-50%", opacity: 1 }} 
            exit={{ y: 20, x: "-50%", opacity: 0 }} 
            onClick={handleUndoAction}
            className="fixed bottom-48 left-1/2 -translate-x-1/2 z-[10000] bg-toss-grey-900 text-white px-5 py-2.5 rounded-full shadow-toss-elevated flex items-center justify-center gap-2 text-[13px] font-black active:scale-95 border border-white/10"
          >
            <RotateCcw size={14} strokeWidth={3} /> 되돌리기
          </motion.button>
        )}
        
        {toast && !undoToast && (
          <motion.div 
            initial={{ y: 50, x: "-50%", opacity: 0 }} 
            animate={{ y: 0, x: "-50%", opacity: 1 }} 
            exit={{ y: 20, x: "-50%", opacity: 0 }} 
            className="fixed bottom-48 left-1/2 -translate-x-1/2 z-[10000] bg-toss-grey-900 text-white px-6 py-3.5 rounded-[24px] shadow-toss-elevated flex items-center gap-3 min-w-[220px]"
          >
            <div className="w-8 h-8 rounded-full bg-toss-blue flex items-center justify-center shrink-0"><Bell size={16} fill="white" /></div>
            <span className="text-[13px] font-bold tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default App;
