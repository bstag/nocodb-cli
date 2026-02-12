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
