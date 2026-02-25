
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Trash2, Plus, Coffee, CakeSlice, HelpCircle, GripVertical, Search, X } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemType, DrinkSize, AppSettings, OrderSubItem } from '../types';

interface SelectionItem {
  itemName: string;
  type: ItemType;
  size?: DrinkSize;
}

interface MenuSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  drinkItems: string[];
  dessertItems: string[];
  checkedDrinkItems: string[];
  initialSelections: OrderSubItem[];
  selectedItem: string;
  initialType?: ItemType;
  onSelect: (selections: SelectionItem[]) => void;
  onAdd: (item: string, type: ItemType) => void;
  onRemove: (item: string, type: ItemType) => void;
  onUpdateChecked: (item: string, checked: boolean) => void;
  onDeleteSelection?: () => void;
  onUpdateMenuList?: (newList: string[], type: ItemType) => void;
  appSettings: AppSettings;
}

const SortableMenuItem: React.FC<{
  id: string;
  item: string;
  activeTab: ItemType;
  appSettings: AppSettings;
  orderedSizes: Set<DrinkSize | undefined>;
  isCurrentlySelected: boolean;
  isChecked?: boolean;
  showCheck?: boolean;
  handleItemClick: (name: string, type: ItemType, size?: DrinkSize) => void;
  onRemove: (item: string, type: ItemType) => void;
  onToggleCheck?: () => void;
}> = ({ id, item, activeTab, appSettings, orderedSizes, isCurrentlySelected, isChecked, showCheck, handleItemClick, onRemove, onToggleCheck }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 1000 : undefined, opacity: isDragging ? 0.6 : 1 };
  const showSize = activeTab === 'DRINK' && appSettings.showDrinkSize;
  
  // 현재 항목이 주문 목록에 있거나, 지금 편집 중인 항목인 경우 강조
  const isHighlighted = isCurrentlySelected || orderedSizes.size > 0;

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1 group select-none ${isDragging ? 'scale-[1.02]' : ''}`}>
      <div {...attributes} {...listeners} className="pl-1 pr-1 py-1.5 cursor-grab text-toss-grey-300 hover:text-toss-blue shrink-0">
        <GripVertical size={12} />
      </div>
      <div className={`flex-1 flex items-center gap-1 rounded-xl border-2 transition-all h-10 min-w-0 ${isHighlighted ? 'bg-toss-blueLight border-toss-blue' : isChecked ? 'bg-toss-blueLight/30 border-toss-blue/30' : 'bg-toss-grey-50 border-transparent shadow-sm'}`}>
        <div className="flex items-center gap-2 pl-2 shrink-0">
          {showCheck && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleCheck?.(); }}
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isChecked ? 'bg-toss-blue text-white' : 'bg-white border border-toss-grey-200 text-transparent'}`}
            >
              <Check size={12} strokeWidth={4} />
            </button>
          )}
        </div>
        <button onClick={() => handleItemClick(item, activeTab, showSize ? 'Tall' : undefined)} className={`flex-1 h-full text-left px-1 flex items-center justify-between min-w-0 font-black ${isHighlighted ? 'text-toss-blue' : isChecked ? 'text-toss-blue' : 'text-toss-grey-800'}`}>
          <span className="truncate text-[12px] tracking-tight">{item}</span>
          {isHighlighted && !showSize && <Check size={12} strokeWidth={4} className="shrink-0 ml-1" />}
        </button>
        {showSize && (
          <div className="flex gap-1 pr-1 shrink-0">
            {(['Tall', 'Grande', 'Venti'] as DrinkSize[]).map((sz) => {
              const isSizeSelected = orderedSizes.has(sz);
              return (
                <button 
                  key={sz} 
                  onClick={(e) => { e.stopPropagation(); handleItemClick(item, activeTab, sz); }} 
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black border transition-all relative ${isSizeSelected ? 'bg-toss-blue border-toss-blue text-white shadow-md' : 'bg-white border-toss-grey-200 text-toss-grey-400 hover:border-toss-blue/30'}`}
                >
                  {sz.charAt(0)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={() => onRemove(item, activeTab)} className="p-1.5 text-toss-grey-200 hover:text-toss-red transition-colors shrink-0"><Trash2 size={14} /></button>
    </div>
  );
};

export const MenuSelectionModal: React.FC<MenuSelectionModalProps> = ({
  isOpen, onClose, title, drinkItems = [], dessertItems = [], checkedDrinkItems = [], initialSelections = [], selectedItem, initialType, onSelect, onAdd, onRemove, onUpdateChecked, onDeleteSelection, onUpdateMenuList, appSettings
}) => {
  const [activeTab, setActiveTab] = useState<ItemType>('DRINK');
  const [searchQuery, setSearchQuery] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialType) setActiveTab(initialType);
      setSearchQuery("");
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen, initialType, selectedItem]);

  const currentRawList = useMemo(() => activeTab === 'DRINK' ? drinkItems.filter(i => i !== '미정') : dessertItems, [activeTab, drinkItems, dessertItems]);
  
  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return currentRawList;
    return currentRawList.filter(item => item.toLowerCase().includes(query));
  }, [currentRawList, searchQuery]);

  const exactMatch = useMemo(() => currentRawList.find(i => i.trim().toLowerCase() === searchQuery.trim().toLowerCase()), [currentRawList, searchQuery]);

  const getItemOrderedSizes = (itemName: string): Set<DrinkSize | undefined> => {
    return new Set(
      initialSelections
        .filter(s => s.itemName === itemName && s.type === activeTab)
        .map(s => s.size)
    );
  };

  const handleItemClick = (name: string, type: ItemType, size?: DrinkSize) => {
    onSelect([{ itemName: name, type, size }]);
    onClose();
  };

  const handleQuickAdd = () => {
    const name = searchQuery.trim();
    if (!name) return;
    onAdd(name, activeTab);
    setSearchQuery("");
    setRegSuccess(true);
    setTimeout(() => setRegSuccess(false), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (filteredList.length === 1) {
        handleItemClick(filteredList[0], activeTab, (activeTab === 'DRINK' && appSettings.showDrinkSize) ? 'Tall' : undefined);
      } else if (!exactMatch && searchQuery.trim()) {
        handleQuickAdd();
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const newList = arrayMove(currentRawList, currentRawList.indexOf(active.id as string), currentRawList.indexOf(over.id as string));
      onUpdateMenuList?.(newList, activeTab);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[4px]" onClick={onClose}>
      <div className="bg-white rounded-[24px] w-full max-w-[320px] max-h-[85vh] flex flex-col shadow-toss-elevated overflow-hidden border border-toss-grey-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        <div className="px-3 pt-3 pb-1.5 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-grey-400" size={14} />
            <input 
              ref={searchInputRef}
              type="text"
              lang="ko"
              enterKeyHint="search"
              placeholder={`${activeTab === 'DRINK' ? '음료' : '디저트'} 검색/추가`}
              className="w-full pl-9 pr-8 py-2.5 bg-toss-grey-100 rounded-xl text-[13px] font-black focus:outline-none focus:ring-2 focus:ring-toss-blue/20 transition-all border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-grey-400 hover:text-toss-grey-600"><X size={14} /></button>
            )}
          </div>

          <div className="flex p-0.5 bg-toss-grey-100 rounded-xl">
            <button onClick={() => setActiveTab('DRINK')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeTab === 'DRINK' ? 'bg-white text-toss-blue shadow-sm' : 'text-toss-grey-400'}`}>
              <Coffee size={14} /><span>음료</span>
            </button>
            <button onClick={() => setActiveTab('DESSERT')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${activeTab === 'DESSERT' ? 'bg-white text-amber-500 shadow-sm' : 'text-toss-grey-400'}`}>
              <CakeSlice size={14} /><span>디저트</span>
            </button>
          </div>
        </div>

        {searchQuery.trim() && !exactMatch && (
          <div className="px-3 pb-1 shrink-0 animate-in slide-in-from-top-1">
            <button onClick={handleQuickAdd} className="w-full py-2.5 bg-toss-blueLight text-toss-blue rounded-xl font-black text-[12px] flex items-center justify-center gap-1.5 border border-toss-blue/10 active:scale-[0.98] transition-transform">
              <Plus size={14} strokeWidth={3} /> '{searchQuery}' 등록만 하기
            </button>
          </div>
        )}
        
        {regSuccess && (
          <div className="px-3 pb-1 shrink-0 animate-in fade-in zoom-in duration-300">
            <div className="w-full py-2 bg-green-50 text-green-600 rounded-lg font-black text-[11px] flex items-center justify-center gap-1.5 border border-green-200">
              <Check size={12} strokeWidth={4} /> 메뉴판에 추가되었습니다
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 pb-2">
          {filteredList.length === 0 && !searchQuery.trim() ? (
            <div className="py-10 text-center text-toss-grey-400 text-[12px] font-black opacity-50">메뉴를 검색해보세요.</div>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center text-toss-grey-400 text-[12px] font-black opacity-50">검색 결과가 없습니다.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredList} strategy={verticalListSortingStrategy}>
                {filteredList.map((item) => (
                  <SortableMenuItem 
                    key={item} id={item} item={item} activeTab={activeTab} appSettings={appSettings}
                    orderedSizes={getItemOrderedSizes(item)}
                    isCurrentlySelected={selectedItem === item}
                    isChecked={activeTab === 'DRINK' && checkedDrinkItems.includes(item)}
                    showCheck={activeTab === 'DRINK'}
                    handleItemClick={handleItemClick} 
                    onRemove={onRemove}
                    onToggleCheck={() => onUpdateChecked(item, !checkedDrinkItems.includes(item))}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="p-3 bg-white border-t border-toss-grey-100 grid grid-cols-2 gap-2.5 shrink-0">
          <button 
            onClick={() => { 
              if (onDeleteSelection) onDeleteSelection();
              else onSelect([{ itemName: '미정', type: 'DRINK' }]);
              onClose(); 
            }} 
            className="h-11 rounded-2xl font-black bg-toss-redLight text-toss-red active:scale-95 transition-all text-[13px] flex items-center justify-center gap-1.5"
          >
            <Trash2 size={16} /> 주문 삭제
          </button>
          <button onClick={onClose} className="h-11 rounded-2xl font-black bg-toss-grey-900 text-white active:scale-95 transition-all text-[13px]">닫기</button>
        </div>
      </div>
    </div>
  );
};
