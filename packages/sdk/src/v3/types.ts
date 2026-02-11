export type ViewTypeV3 = 'grid' | 'gallery' | 'kanban' | 'calendar' | 'form';

export interface ViewV3 {
    id: string;
    title: string;
    type: ViewTypeV3;
    table_id: string;
    order?: number;
    lock_type?: 'collaborative' | 'personal' | 'locked';
    options?: Record<string, any>;
}

export interface CalendarViewOptions {
    date_ranges?: {
        fk_column_id: string;
        color?: string;
    }[];
    row_coloring?: {
        fk_column_id: string;
        color?: string;
    };
}

export interface WorkspaceV3 {
    id: string;
    title: string;
    org_id?: string;
}

export interface BaseV3 {
    id: string;
    title: string;
    workspace_id: string;
    meta?: any;
}
