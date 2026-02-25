
export type Temperature = 'ICE' | 'HOT';
export type DrinkSize = 'Tall' | 'Grande' | 'Venti';
export type ItemType = 'DRINK' | 'DESSERT' | 'PENDING';
export type EmojiCategory = 'ANIMALS' | 'FACES' | 'HANDS' | 'NUMBERS';

export interface AppSettings {
  showDrinkSize: boolean;
  quickMemos: string[];
  defaultEmojis: string[];
  randomCategory: EmojiCategory;
  checkedDrinkItems: string[];
}

export interface OrderSubItem {
  id: string;
  type: ItemType;
  itemName: string;
  temperature?: Temperature;
  size?: DrinkSize;
  quantity?: number;
  memo?: string;
}

export interface OrderItem {
  id: string;
  avatar?: string;
  subItems: OrderSubItem[];
  memo?: string;
}

export interface OrderGroup {
  id: string;
  name: string;
  items: OrderItem[];
  isCollapsed?: boolean;
}

export interface AggregatedOrder {
  type: ItemType;
  itemName: string;
  temperature?: Temperature;
  size?: DrinkSize;
  count: number;
  individualMemos?: { 
    memo: string; 
    avatar: string; 
    personId: string; 
    groupId: string 
  }[];
}

export interface OrderHistoryItem {
  id: string;
  timestamp: number;
  groups: OrderGroup[];
  totalCount: number;
  summaryText: string;
  memo?: string;
  title?: string;
}

export interface DrinkSuggestion {
  name: string;
  description: string;
  temperature: Temperature;
}
