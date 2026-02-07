/**
 * Schema service for introspecting NocoDB table structures.
 * 
 * Provides methods for discovering table schemas, including columns,
 * primary keys, and relations.
 * 
 * @module services/schema-service
 */

import type { NocoClient, Table, Column } from '@nocodb/sdk';
import { MetaService } from './meta-service.js';

export interface TableSchema {
  id: string;
  title: string;
  table_name: string;
  primaryKey?: string;
  displayValue?: string;
  columns: ColumnSchema[];
}

export interface ColumnSchema {
  id: string;
  title: string;
  column_name: string;
  uidt: string;
  primaryKey: boolean;
  required: boolean;
  unique: boolean;
  relation?: {
    type: string;
    targetTableId: string;
  };
}

export class SchemaService {
  private metaService: MetaService;

  constructor(client: NocoClient) {
    this.metaService = new MetaService(client);
  }

  /**
   * Introspects a table to discover its full schema.
   * 
   * @param tableId - Table ID or alias
   * @returns Comprehensive table schema
   */
  async introspectTable(tableId: string): Promise<TableSchema> {
    const table = await this.metaService.getTable(tableId);
    
    return {
      id: table.id!,
      title: table.title!,
      table_name: table.table_name!,
      primaryKey: table.columns?.find(c => c.pk)?.column_name,
      displayValue: table.columns?.find(c => c.pv)?.column_name,
      columns: (table.columns || []).map(col => ({
        id: col.id!,
        title: col.title!,
        column_name: col.column_name!,
        uidt: col.uidt!,
        primaryKey: !!col.pk,
        required: !!col.rqd,
        unique: !!col.unique,
        relation: col.colOptions?.fk_related_model_id ? {
          type: col.uidt!,
          targetTableId: col.colOptions.fk_related_model_id
        } : undefined
      }))
    };
  }
}
