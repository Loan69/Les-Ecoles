export interface Option {
    id: number;
    category: string;
    label_category?: string;
    value: string;
    label: string;
    is_active?: boolean;
    admin_only?: boolean;
    created_at?: string;
    parent_value?: string | null;
    created_by?: string;
}