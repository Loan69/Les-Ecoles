export interface MealOption {
  id: number;
  value: string;
  label: string;
  isSpecial: boolean;
  isLocked?: boolean;
  adminOnly?: boolean;
}

export interface MealSelection {
  selectedId: number;
  selectedValue: string;
  dbRecordId: number | null;
  comment: string;
}
