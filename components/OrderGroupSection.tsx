
import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderGroup, OrderItem, ItemType, AppSettings } from '../types.ts';
import { OrderCard } from './OrderCard.tsx';

interface OrderGroupSectionProps {
  group: OrderGroup;
  drinkMenuItems: string[];
  dessertMenuItems: string[];
  highlightedItemId: string | null;
  updateOrder: (id: string, updates: Partial<OrderItem>) => void;
  removeOrder: (id: string) => void;
  addOrderItem: (id: string) => void;
  addSharedMenuItem: (id: string) => void;
  onAddMenuItem: (name: string, type: ItemType) => void;
  onRemoveMenuItem: (name: string, type: ItemType) => void;
  onOpenMenuModal: (orderId: string, currentItem: string, subItemId?: string | null, type?: ItemType) => void;
  onCopyGroupItemToAll: (orderId: string) => void;
  onDeleteGroupItemFromAll: (orderId: string) => void;
  appSettings: AppSettings & { isSharedSyncActive?: boolean };
  onRemoveGroup: () => void;
  onInputModeChange?: (isActive: boolean) => void;
  onUpdateCheckedItems?: (name: string, checked: boolean) => void;
}

export const OrderGroupSection: React.FC<OrderGroupSectionProps> = ({
  group,
  drinkMenuItems,
  dessertMenuItems,
  highlightedItemId,
  updateOrder,
  removeOrder,
  addOrderItem,
  addSharedMenuItem,
  onAddMenuItem,
  onRemoveMenuItem,
  onOpenMenuModal,
  onCopyGroupItemToAll,
  onDeleteGroupItemFromAll,
  appSettings,
  onInputModeChange,
  onUpdateCheckedItems
}) => {
  const individualItems = useMemo(() => group.items.filter(item => item.avatar !== '😋'), [group.items]);
  const sharedItem = useMemo(() => group.items.find(item => item.avatar === '😋'), [group.items]);
  const isOdd = individualItems.length % 2 !== 0;

  return (
    <section className="relative bg-white rounded-[24px] border p-2 flex flex-col gap-2 z-0 border-toss-grey-100 shadow-toss-card overflow-visible">
      <div className="flex flex-col gap-2 overflow-visible">
        <div className="grid gap-2 grid-cols-2 items-stretch justify-items-stretch relative overflow-visible">
          <AnimatePresence mode="popLayout">
            {individualItems.map((order) => (
              <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative min-h-[110px] overflow-visible">
                <OrderCard 
                  order={order} 
                  drinkItems={drinkMenuItems} 
                  dessertMenuItems={dessertMenuItems} 
                  onAddMenuItem={onAddMenuItem} 
                  onRemoveMenuItem={onRemoveMenuItem} 
                  onUpdate={updateOrder} 
                  onRemove={removeOrder} 
                  highlighted={order.id === highlightedItemId} 
                  onOpenMenuModal={onOpenMenuModal} 
                  onCopyGroupItemToAll={onCopyGroupItemToAll}
                  onDeleteGroupItemFromAll={onDeleteGroupItemFromAll}
                  appSettings={appSettings}
                  onInputModeChange={onInputModeChange}
                  onUpdateCheckedItems={onUpdateCheckedItems}
                />
              </motion.div>
            ))}
            {isOdd && (
              <motion.button layout onClick={() => addOrderItem(group.id)} className="border-2 border-dashed border-toss-grey-200 bg-toss-grey-50 text-toss-grey-400 rounded-[20px] flex flex-col items-center justify-center gap-0.5 h-full min-h-[110px] hover:bg-toss-grey-100 hover:border-toss-blue/30 active:scale-95 transition-all">
                <Plus size={16} strokeWidth={3} /><span className="text-[10px] font-black uppercase">추가</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {!isOdd && (
          <button onClick={() => addOrderItem(group.id)} className="w-full h-10 border-2 border-dashed border-toss-grey-200 bg-toss-grey-50 text-toss-grey-400 rounded-[14px] flex items-center justify-center gap-1 hover:bg-toss-grey-100 active:scale-[0.98] transition-all shrink-0">
            <Plus size={14} strokeWidth={3} /><span className="text-[11px] font-black uppercase tracking-tighter">추가</span>
          </button>
        )}

        <div className="pt-2 border-t-2 border-dashed border-toss-grey-100 overflow-visible">
          <div className="flex flex-col gap-1.5 overflow-visible">
            {sharedItem ? (
              <OrderCard 
                order={sharedItem} 
                drinkItems={drinkMenuItems} 
                dessertMenuItems={dessertMenuItems} 
                onAddMenuItem={onAddMenuItem} 
                onRemoveMenuItem={onRemoveMenuItem} 
                onUpdate={updateOrder} 
                onRemove={removeOrder} 
                highlighted={sharedItem.id === highlightedItemId} 
                onOpenMenuModal={onOpenMenuModal} 
                onCopyGroupItemToAll={onCopyGroupItemToAll}
                onDeleteGroupItemFromAll={onDeleteGroupItemFromAll}
                appSettings={appSettings}
                onInputModeChange={onInputModeChange}
                onUpdateCheckedItems={onUpdateCheckedItems}
              />
            ) : (
              <button onClick={() => addSharedMenuItem(group.id)} className="w-full h-10 border-2 border-dashed border-toss-grey-200 bg-toss-grey-50 text-toss-grey-400 rounded-[14px] flex items-center justify-center gap-1 hover:bg-toss-grey-100 active:scale-95 transition-all">
                <Plus size={14} strokeWidth={3} /><span className="text-[11px] font-black uppercase">공용 메뉴 추가</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
