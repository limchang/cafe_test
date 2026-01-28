
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderGroup, AggregatedOrder, AppSettings, ItemType } from '../types.ts';
import { ChevronUp, ChevronDown, Coffee, Users, LayoutGrid, List, CheckCircle2, Save, UserMinus, Pencil, Check } from 'lucide-react';

interface OrderSummaryProps {
  groups: OrderGroup[];
  onSaveHistory: (summaryText: string, totalCount: number, memo?: string) => void;
  onJumpToOrder: (groupId: string, personId: string) => void;
  onUpdateGroupName?: (groupId: string, newName: string) => void;
  onSetNotEating?: (personIds: string[]) => void;
  appSettings: AppSettings;
  expandState: 'collapsed' | 'expanded' | 'fullscreen';
  onSetExpandState: (state: 'collapsed' | 'expanded' | 'fullscreen') => void;
}

interface GroupedMemoProps {
  memo: string;
  people: { avatar: string; personId: string; groupId: string }[];
  onJump: (groupId: string, personId: string) => void;
}

const GroupedMemo: React.FC<GroupedMemoProps> = ({ memo, people, onJump }) => {
  const uniquePeople = useMemo(() => {
    const seen = new Set();
    return people.filter(p => {
      if (seen.has(p.personId)) return false;
      seen.add(p.personId);
      return true;
    });
  }, [people]);

  return (
    <div className="flex items-center gap-1 bg-white border border-toss-grey-200 px-1.5 py-0.5 rounded-full shadow-toss-sm animate-in zoom-in-95 duration-200">
      <div className="flex -space-x-1.5 overflow-hidden shrink-0">
        {uniquePeople.slice(0, 3).map((p, i) => (
          <button
            key={`${p.personId}-${i}`}
            onClick={(e) => { e.stopPropagation(); onJump(p.groupId, p.personId); }}
            className="relative inline-block h-4 w-4 rounded-full ring-1 ring-white bg-toss-grey-100 text-[8px] flex items-center justify-center shadow-sm hover:z-10 hover:scale-110 transition-all active:scale-95"
          >
            {p.avatar || "👤"}
          </button>
        ))}
      </div>
      <span className="text-[9px] text-toss-grey-800 font-black leading-none max-w-[80px] truncate">{memo}</span>
    </div>
  );
};

type ViewMode = 'all' | 'table';

export const OrderSummary: React.FC<OrderSummaryProps> = ({ 
  groups, onSaveHistory, onJumpToOrder, onUpdateGroupName, onSetNotEating, appSettings, expandState, onSetExpandState 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState("");
  const [isNotEatingCollapsed, setIsNotEatingCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkShadows = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowTopShadow(scrollTop > 5);
      setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  useEffect(() => {
    if (expandState !== 'collapsed') {
      setTimeout(checkShadows, 100);
    }
  }, [expandState, viewMode, groups]);

  // 공용 메뉴를 제외한 실제 '사람' 데이터만 필터링 (😋 이모지 제외)
  const personsWithGroup = useMemo(() => 
    groups.flatMap(g => g.items.filter(p => p.avatar !== '😋').map(p => ({ ...p, groupId: g.id }))), 
    [groups]
  );

  // 참여 인원 수 (공용 메뉴 제외)
  const totalPeople = useMemo(() => personsWithGroup.length, [personsWithGroup]);
  
  // 아직 메뉴를 고르지 않은 인원 (공용 메뉴 제외)
  const undecidedPersons = useMemo(() => 
    personsWithGroup.filter(p => !p.avatar || p.subItems.length === 0 || p.subItems.every(si => si.itemName === '미정'))
  , [personsWithGroup]);

  // 안 먹기로 한 인원 (공용 메뉴 제외)
  const notEatingPersons = useMemo(() => 
    personsWithGroup.filter(p => p.avatar && p.avatar !== '😋' && p.subItems.length === 1 && p.subItems[0].itemName === '안 먹음')
  , [personsWithGroup]);

  const decidedCount = totalPeople - undecidedPersons.length;
  const undecidedCount = undecidedPersons.length;
  const isAllDecided = totalPeople > 0 && undecidedCount === 0;

  const aggregatedOrders = useMemo(() => {
    const map = new Map<string, AggregatedOrder>();
    // 모든 아이템(공용 메뉴 포함)에 대해 합계 계산
    groups.flatMap(g => g.items.map(p => ({ ...p, groupId: g.id }))).forEach(person => {
      person.subItems.forEach(si => {
        if (!si.itemName || si.itemName === '미정' || si.itemName === '안 먹음') return;
        
        const sizeTag = (appSettings.showDrinkSize && si.type === 'DRINK') ? (si.size || 'Tall') : '';
        const key = si.type === 'DRINK' ? `DRINK-${si.temperature}-${sizeTag}-${si.itemName.trim()}` : `DESSERT-${si.itemName.trim()}`;
        const qty = si.quantity || 1;
        const currentMemos = si.memo ? si.memo.split(',').map(m => m.trim()).filter(Boolean) : [];
        
        if (map.has(key)) {
          const item = map.get(key)!;
          item.count += qty;
          currentMemos.forEach(memo => {
            item.individualMemos = [...(item.individualMemos || []), { memo, avatar: person.avatar || '👤', personId: person.id, groupId: person.groupId }];
          });
        } else {
          map.set(key, {
            type: si.type, itemName: si.itemName.trim(), temperature: si.temperature, size: (appSettings.showDrinkSize && si.type === 'DRINK') ? (si.size || 'Tall') : undefined, count: qty,
            individualMemos: currentMemos.map(memo => ({ memo, avatar: person.avatar || '👤', personId: person.id, groupId: person.groupId }))
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'DRINK' ? -1 : 1;
        return a.itemName.localeCompare(b.itemName);
    });
  }, [groups, appSettings.showDrinkSize]);

  const totalItemCount = useMemo(() => aggregatedOrders.reduce((acc, curr) => acc + curr.count, 0), [aggregatedOrders]);

  const getMemoGroups = (memos?: { memo: string; avatar: string; personId: string; groupId: string }[]) => {
    if (!memos) return [];
    const grouped: Record<string, { memo: string; people: any[] }> = {};
    memos.forEach(m => {
      if (!grouped[m.memo]) grouped[m.memo] = { memo: m.memo, people: [] };
      grouped[m.memo].people.push(m);
    });
    return Object.values(grouped);
  };

  const handleStartEditName = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setTempGroupName(currentName);
  };

  const handleSaveName = (groupId: string) => {
    if (onUpdateGroupName && tempGroupName.trim()) {
      onUpdateGroupName(groupId, tempGroupName.trim());
    }
    setEditingGroupId(null);
  };

  const toggleItemExpansion = (key: string) => {
    setCollapsedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const tableSummary = useMemo(() => {
    return groups.map(g => {
        const orderTexts: string[] = [];
        g.items.forEach(p => {
            p.subItems.forEach(si => {
                if (si.itemName === '미정' || si.itemName === '안 먹음') return;
                let t = `${si.itemName}`;
                if (si.type === 'DRINK') t = `[${si.temperature}] ${t}`;
                if (si.quantity && si.quantity > 1) t += ` x${si.quantity}`;
                orderTexts.push(t);
            });
        });
        return orderTexts.length > 0 ? `${g.name}: ${orderTexts.join(', ')}` : null;
    }).filter(Boolean).join('\n');
  }, [groups]);

  const allSummary = useMemo(() => aggregatedOrders.map(o => {
        let t = o.itemName;
        if (o.type === 'DRINK') t = `[${o.temperature}] ${t}`;
        return `${t}: ${o.count}개`;
    }).join('\n'), [aggregatedOrders]);

  if (expandState === 'collapsed') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none">
        <button 
          onClick={() => onSetExpandState('expanded')}
          className="w-full max-w-lg mx-auto bg-white border border-toss-grey-100 rounded-[28px] shadow-toss-elevated p-3.5 flex items-center justify-between pointer-events-auto active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isAllDecided ? 'bg-toss-blue text-white shadow-lg' : 'bg-toss-grey-100 text-toss-grey-400'}`}>
              {isAllDecided ? <CheckCircle2 size={18} strokeWidth={3} /> : <Users size={18} />}
            </div>
            <div className="text-left">
              <p className="text-[13px] font-black text-toss-grey-900 leading-tight">{decidedCount}명 주문 확인</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-black ${undecidedCount > 0 ? 'text-toss-red' : 'text-toss-blue'}`}>
                  {undecidedCount > 0 ? `${undecidedCount}명 미정` : '전원 완료'}
                </span>
                <div className="w-0.5 h-0.5 bg-toss-grey-300 rounded-full" />
                <span className="text-[9px] font-black text-toss-grey-400">총 {totalItemCount}개</span>
              </div>
            </div>
          </div>
          <ChevronUp className="text-toss-grey-300" size={20} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]" onClick={() => onSetExpandState('collapsed')} />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 right-0 bottom-0 z-[160] bg-white shadow-toss-elevated flex flex-col max-w-lg mx-auto rounded-t-[28px] h-[85vh]"
      >
        <div className="flex flex-col shrink-0">
          <button onClick={() => onSetExpandState('collapsed')} className="w-full flex justify-center py-2">
            <div className="w-10 h-1 bg-toss-grey-200 rounded-full" />
          </button>
          <div className="px-4 flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-sm ${isAllDecided ? 'bg-toss-blue text-white' : 'bg-toss-grey-100 text-toss-grey-400'}`}>
                {isAllDecided ? <CheckCircle2 size={20} strokeWidth={3} /> : <Users size={20} />}
              </div>
              <div className="flex flex-col">
                <h2 className="text-[16px] font-black text-toss-grey-900 tracking-tight">{totalPeople}명 주문 확인</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-black text-toss-blue bg-toss-blueLight px-1.5 py-0.5 rounded-md">{decidedCount}명 완료</span>
                  {undecidedCount > 0 && <span className="text-[10px] font-black text-toss-red bg-toss-redLight px-1.5 py-0.5 rounded-md">{undecidedCount}명 미정</span>}
                </div>
              </div>
            </div>
            <button onClick={() => onSetExpandState('collapsed')} className="p-1.5 text-toss-grey-300">
              <ChevronDown size={24} />
            </button>
          </div>

          <div className="px-4 mb-3 space-y-2 shrink-0">
            {undecidedCount > 0 && (
              <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-200 shadow-sm animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-yellow-800">미정 인원 바로가기</span>
                  <button 
                    onClick={() => onSetNotEating?.(undecidedPersons.map(p => p.id))}
                    className="px-2 py-1 bg-white border border-yellow-300 rounded-lg text-[10px] font-black text-yellow-900 shadow-sm flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <UserMinus size={12} /> 모두 안먹음 처리
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {undecidedPersons.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => { onJumpToOrder(p.groupId, p.id); onSetExpandState('collapsed'); }}
                      className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                    >
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg shadow-sm border border-yellow-300/30">{p.avatar || "👤"}</div>
                      <span className="text-[8px] font-black text-yellow-600">이동</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 mb-2 shrink-0">
            <div className="flex p-0.5 bg-toss-grey-100 rounded-[16px]">
              <button onClick={() => setViewMode('all')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[12px] text-[12px] font-black transition-all ${viewMode === 'all' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-grey-400'}`}><LayoutGrid size={14} /> 합계</button>
              <button onClick={() => setViewMode('table')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[12px] text-[12px] font-black transition-all ${viewMode === 'table' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-grey-400'}`}><List size={14} /> 테이블</button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {showTopShadow && <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />}
          <div 
            ref={scrollRef}
            onScroll={checkShadows}
            className="h-full overflow-y-auto custom-scrollbar px-4 space-y-1.5 pb-8 overscroll-contain"
          >
            {viewMode === 'all' ? (
              aggregatedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-toss-grey-300 animate-in fade-in duration-500"><Coffee size={32} className="mb-3 opacity-20" /><p className="text-[13px] font-bold">주문 내역이 없습니다.</p></div>
              ) : (
                aggregatedOrders.map((item, idx) => {
                  const itemKey = `${item.type}-${item.itemName}-${item.temperature || ''}-${item.size || ''}`;
                  const memoGroups = getMemoGroups(item.individualMemos);
                  const isCollapsed = collapsedItems.has(itemKey);
                  const hasMemos = memoGroups.length > 0;
                  return (
                    <div key={idx} className="bg-toss-grey-50 rounded-[20px] border border-toss-grey-100 shadow-sm overflow-hidden transition-all duration-300">
                      <button 
                        onClick={() => hasMemos && toggleItemExpansion(itemKey)}
                        className={`w-full flex items-center justify-between p-3 active:bg-toss-grey-100 transition-colors ${!hasMemos ? 'py-4' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.type === 'DRINK' ? (
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded bg-white border shrink-0 ${item.temperature === 'ICE' ? 'text-toss-blue' : 'text-toss-red'}`}>{item.temperature}</span>
                          ) : (
                            <span className="text-[8px] font-black bg-white border border-amber-200 text-amber-700 px-1 py-0.5 rounded shrink-0">DST</span>
                          )}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[13px] font-black text-toss-grey-900 truncate tracking-tight">{item.itemName}</span>
                            {item.size && <span className="text-[9px] font-bold text-toss-grey-400 uppercase tracking-tighter shrink-0">· {item.size}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {hasMemos && <div className={`text-toss-grey-300 transition-transform ${!isCollapsed ? 'rotate-180' : ''}`}><ChevronDown size={14} /></div>}
                           <span className="text-[16px] font-black text-toss-grey-900 shrink-0 tabular-nums">{item.count}개</span>
                        </div>
                      </button>
                      {hasMemos && !isCollapsed && (
                        <div className="px-3 pb-3 flex flex-wrap gap-1 animate-in slide-in-from-top-1 duration-200">
                          {memoGroups.map((group, gidx) => (
                            <GroupedMemo key={gidx} memo={group.memo} people={group.people} onJump={(gid, pid) => { onJumpToOrder(gid, pid); onSetExpandState('collapsed'); }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              groups.map((group) => {
                // 공용 메뉴를 제외한 실제 사람 수 계산
                const participantsCount = group.items.filter(p => p.avatar !== '😋').length;
                const isEditing = editingGroupId === group.id;

                return (
                  <div key={group.id} className="bg-white rounded-[24px] border border-toss-grey-100 overflow-hidden shadow-sm mb-2">
                    <div className="bg-toss-grey-50 px-4 py-2 flex items-center justify-between border-b border-toss-grey-100">
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input autoFocus type="text" value={tempGroupName} onChange={(e) => setTempGroupName(e.target.value)} className="bg-white border border-toss-blue rounded-lg px-2 py-1 text-[13px] font-black focus:outline-none w-full max-w-[150px]" onKeyDown={(e) => e.key === 'Enter' && handleSaveName(group.id)} />
                          <button onClick={() => handleSaveName(group.id)} className="p-1.5 text-toss-blue bg-white rounded-lg border border-toss-blue/20"><Check size={14} strokeWidth={3} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-black text-toss-grey-800 tracking-tight">{group.name}</span>
                          <button onClick={() => handleStartEditName(group.id, group.name)} className="p-1 text-toss-grey-300 hover:text-toss-blue transition-colors"><Pencil size={12} /></button>
                          <div className="w-1 h-1 bg-toss-grey-200 rounded-full" />
                          <span className="text-[11px] font-bold text-toss-grey-400">{participantsCount}명 참여</span>
                        </div>
                      )}
                      <span className="text-[11px] font-black text-toss-blue bg-toss-blueLight px-2 py-0.5 rounded-full">
                        총 {group.items.reduce((acc, p) => acc + p.subItems.reduce((sAcc, si) => (si.itemName !== '미정' && si.itemName !== '안 먹음' ? sAcc + (si.quantity || 1) : sAcc), 0), 0)}개
                      </span>
                    </div>
                    <div className="divide-y divide-toss-grey-50">
                      {group.items.some(p => p.subItems.some(si => si.itemName !== '미정' && si.itemName !== '' && si.itemName !== '안 먹음')) ? (
                        group.items.filter(p => p.subItems.some(si => si.itemName !== '미정' && si.itemName !== '' && si.itemName !== '안 먹음')).map(person => (
                          <div key={person.id} className="p-3">
                             <div className="flex items-center justify-between">
                                <button onClick={() => { onJumpToOrder(group.id, person.id); onSetExpandState('collapsed'); }} className="flex items-center gap-2 active:scale-95 transition-transform min-w-0 text-left">
                                  <span className="text-lg">{person.avatar || (person.avatar === '😋' ? '😋' : '👤')}</span>
                                  <div className="flex flex-col min-w-0">
                                    {person.subItems.filter(si => si.itemName !== '미정' && si.itemName !== '안 먹음').map(si => (
                                      <div key={si.id} className="flex items-center gap-1.5">
                                        <span className="text-[13px] font-black text-toss-grey-900 truncate tracking-tight">{si.itemName}</span>
                                        {si.type === 'DRINK' && <span className={`text-[9px] font-bold ${si.temperature === 'ICE' ? 'text-toss-blue' : 'text-toss-red'}`}>{si.temperature}</span>}
                                        {si.quantity && si.quantity > 1 && <span className="text-[11px] font-black text-toss-grey-400">x{si.quantity}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </button>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-[11px] text-toss-grey-300 font-bold">주문한 메뉴가 없습니다.</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {showBottomShadow && <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />}
        </div>

        <div className="px-4 py-5 bg-white border-t border-toss-grey-100 shrink-0 space-y-4 shadow-[0_-8px_32px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black text-toss-grey-400 uppercase tracking-[0.2em]">Total Items</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[24px] font-black text-toss-grey-900 tabular-nums">{totalItemCount}</span>
              <span className="text-[13px] font-black text-toss-grey-400 uppercase">개</span>
            </div>
          </div>
          <button 
            onClick={() => onSaveHistory(viewMode === 'all' ? allSummary : tableSummary, totalItemCount)}
            className="w-full h-14 bg-toss-grey-900 text-white rounded-[22px] font-black text-[16px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all hover:bg-black"
          >
            <Save size={20} /> 주문 내역 저장하기
          </button>
        </div>
      </motion.div>
    </>
  );
};
