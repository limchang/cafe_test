import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OrderCard } from './OrderCard';
import { OrderItem, ItemType, AppSettings } from '../types';

interface SortableOrderCardProps {
  order: OrderItem;
  drinkItems: string[];
  dessertMenuItems: string[];
  onAddMenuItem: (name: string, type: ItemType) => void;
  onRemoveMenuItem: (name: string, type: ItemType) => void;
  onUpdate: (id: string, updates: Partial<OrderItem>) => void;
  onRemove: (id: string) => void;
  onOpenMenuModal: (orderId: string, currentItem: string, subItemId?: string | null, type?: ItemType) => void;
  appSettings: AppSettings;
  popularDrink: string | null;
  highlighted?: boolean;
}

export const SortableOrderCard: React.FC<SortableOrderCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="h-full" 
      {...attributes} 
      {...listeners}
    >
      <OrderCard
        {...props}
      />
    </div>
  );
};