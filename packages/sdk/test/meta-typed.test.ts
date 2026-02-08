import { describe, expect, it, vi, beforeEach } from "vitest";
import { NocoClient, MetaApi } from "../src/index.js";
import type { Base, Table, View, Column, Filter, Sort, ListResponse } from "../src/index.js";

describe("MetaApi - Typed Methods", () => {
  let client: NocoClient;
  let api: MetaApi;

  beforeEach(() => {
    client = new NocoClient({ baseUrl: "http://test" });
    api = new MetaApi(client);
  });

  describe("Base operations return correct types", () => {
    it("listBases returns ListResponse<Base>", async () => {
      const mockResponse: ListResponse<Base> = {
        list: [
          { id: "b1", title: "Base 1" },
          { id: "b2", title: "Base 2" },
        ],
        pageInfo: { totalRows: 2, page: 1, pageSize: 25 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listBases();
      
      expect(result.list).toHaveLength(2);
      expect(result.list[0].id).toBe("b1");
      expect(result.list[0].title).toBe("Base 1");
      expect(result.pageInfo.totalRows).toBe(2);
    });

    it("createBase returns Base", async () => {
      const mockBase: Base = { id: "b1", title: "New Base" };
      vi.spyOn(client, "request").mockResolvedValue(mockBase);

      const result = await api.createBase({ title: "New Base" });
      
      expect(result.id).toBe("b1");
      expect(result.title).toBe("New Base");
    });

    it("getBase returns Base", async () => {
      const mockBase: Base = { id: "b1", title: "Test Base", type: "database" };
      vi.spyOn(client, "request").mockResolvedValue(mockBase);

      const result = await api.getBase("b1");
      
      expect(result.id).toBe("b1");
      expect(result.title).toBe("Test Base");
      expect(result.type).toBe("database");
    });

    it("updateBase returns Base", async () => {
      const mockBase: Base = { id: "b1", title: "Updated Base" };
      vi.spyOn(client, "request").mockResolvedValue(mockBase);

      const result = await api.updateBase("b1", { title: "Updated Base" });
      
      expect(result.id).toBe("b1");
      expect(result.title).toBe("Updated Base");
    });

    it("deleteBase returns void", async () => {
      vi.spyOn(client, "request").mockResolvedValue(undefined);

      const result = await api.deleteBase("b1");
      
      expect(result).toBeUndefined();
    });
  });

  describe("Table operations return correct types", () => {
    it("listTables returns ListResponse<Table>", async () => {
      const mockResponse: ListResponse<Table> = {
        list: [
          { id: "t1", base_id: "b1", title: "Table 1", table_name: "table_1" },
          { id: "t2", base_id: "b1", title: "Table 2", table_name: "table_2" },
        ],
        pageInfo: { totalRows: 2 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listTables("b1");
      
      expect(result.list).toHaveLength(2);
      expect(result.list[0].id).toBe("t1");
      expect(result.list[0].base_id).toBe("b1");
      expect(result.list[0].table_name).toBe("table_1");
    });

    it("createTable returns Table", async () => {
      const mockTable: Table = {
        id: "t1",
        base_id: "b1",
        title: "New Table",
        table_name: "new_table",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockTable);

      const result = await api.createTable("b1", { title: "New Table" });
      
      expect(result.id).toBe("t1");
      expect(result.title).toBe("New Table");
    });

    it("getTable returns Table", async () => {
      const mockTable: Table = {
        id: "t1",
        base_id: "b1",
        title: "Test Table",
        table_name: "test_table",
        enabled: true,
      };
      vi.spyOn(client, "request").mockResolvedValue(mockTable);

      const result = await api.getTable("t1");
      
      expect(result.id).toBe("t1");
      expect(result.enabled).toBe(true);
    });
  });

  describe("View operations return correct types", () => {
    it("listViews returns ListResponse<View>", async () => {
      const mockResponse: ListResponse<View> = {
        list: [
          { id: "v1", title: "Grid View", type: "grid", fk_model_id: "t1" },
          { id: "v2", title: "Form View", type: "form", fk_model_id: "t1" },
        ],
        pageInfo: { totalRows: 2 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listViews("t1");
      
      expect(result.list).toHaveLength(2);
      expect(result.list[0].type).toBe("grid");
      expect(result.list[1].type).toBe("form");
    });

    it("createView returns View", async () => {
      const mockView: View = {
        id: "v1",
        title: "New View",
        type: "gallery",
        fk_model_id: "t1",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockView);

      const result = await api.createView("t1", { title: "New View", type: "gallery" });
      
      expect(result.type).toBe("gallery");
    });
  });

  describe("Column operations return correct types", () => {
    it("listColumns returns ListResponse<Column>", async () => {
      const mockResponse: ListResponse<Column> = {
        list: [
          {
            id: "c1",
            title: "Name",
            column_name: "name",
            uidt: "SingleLineText",
            fk_model_id: "t1",
          },
          {
            id: "c2",
            title: "Age",
            column_name: "age",
            uidt: "Number",
            fk_model_id: "t1",
          },
        ],
        pageInfo: { totalRows: 2 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listColumns("t1");
      
      expect(result.list).toHaveLength(2);
      expect(result.list[0].uidt).toBe("SingleLineText");
      expect(result.list[1].uidt).toBe("Number");
    });

    it("createColumn returns Column", async () => {
      const mockColumn: Column = {
        id: "c1",
        title: "Email",
        column_name: "email",
        uidt: "Email",
        fk_model_id: "t1",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockColumn);

      const result = await api.createColumn("t1", { title: "Email", uidt: "Email" });
      
      expect(result.uidt).toBe("Email");
    });
  });

  describe("Filter operations return correct types", () => {
    it("listViewFilters returns ListResponse<Filter>", async () => {
      const mockResponse: ListResponse<Filter> = {
        list: [
          {
            id: "f1",
            fk_view_id: "v1",
            fk_column_id: "c1",
            comparison_op: "eq",
            value: "test",
          },
        ],
        pageInfo: { totalRows: 1 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listViewFilters("v1");
      
      expect(result.list).toHaveLength(1);
      expect(result.list[0].comparison_op).toBe("eq");
    });

    it("createViewFilter returns Filter", async () => {
      const mockFilter: Filter = {
        id: "f1",
        fk_view_id: "v1",
        fk_column_id: "c1",
        comparison_op: "like",
        value: "%test%",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockFilter);

      const result = await api.createViewFilter("v1", {
        fk_column_id: "c1",
        comparison_op: "like",
        value: "%test%",
      });
      
      expect(result.comparison_op).toBe("like");
    });
  });

  describe("Sort operations return correct types", () => {
    it("listViewSorts returns ListResponse<Sort>", async () => {
      const mockResponse: ListResponse<Sort> = {
        list: [
          {
            id: "s1",
            fk_view_id: "v1",
            fk_column_id: "c1",
            direction: "asc",
          },
        ],
        pageInfo: { totalRows: 1 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listViewSorts("v1");
      
      expect(result.list).toHaveLength(1);
      expect(result.list[0].direction).toBe("asc");
    });

    it("createViewSort returns Sort", async () => {
      const mockSort: Sort = {
        id: "s1",
        fk_view_id: "v1",
        fk_column_id: "c1",
        direction: "desc",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockSort);

      const result = await api.createViewSort("v1", {
        fk_column_id: "c1",
        direction: "desc",
      });
      
      expect(result.direction).toBe("desc");
    });

    it("getSort returns Sort", async () => {
      const mockSort: Sort = {
        id: "s1",
        fk_view_id: "v1",
        fk_column_id: "c1",
        direction: "asc",
        order: 1,
      };
      vi.spyOn(client, "request").mockResolvedValue(mockSort);

      const result = await api.getSort("s1");
      
      expect(result.id).toBe("s1");
      expect(result.direction).toBe("asc");
      expect(result.order).toBe(1);
    });

    it("updateSort returns Sort", async () => {
      const mockSort: Sort = {
        id: "s1",
        fk_view_id: "v1",
        fk_column_id: "c1",
        direction: "desc",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockSort);

      const result = await api.updateSort("s1", { direction: "desc" });
      
      expect(result.direction).toBe("desc");
    });

    it("deleteSort returns void", async () => {
      vi.spyOn(client, "request").mockResolvedValue(undefined);

      const result = await api.deleteSort("s1");
      
      expect(result).toBeUndefined();
    });
  });

  describe("Error scenarios for MetaApi methods", () => {
    it("handles network errors in listBases", async () => {
      const error = new Error("Network timeout");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.listBases()).rejects.toThrow("Network timeout");
    });

    it("handles 404 errors in getBase", async () => {
      const error = new Error("Base not found");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.getBase("invalid-id")).rejects.toThrow("Base not found");
    });

    it("handles validation errors in createTable", async () => {
      const error = new Error("Invalid table data");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.createTable("b1", { title: "" })).rejects.toThrow("Invalid table data");
    });

    it("handles authentication errors in updateBase", async () => {
      const error = new Error("Unauthorized");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.updateBase("b1", { title: "New Title" })).rejects.toThrow("Unauthorized");
    });

    it("handles conflict errors in createColumn", async () => {
      const error = new Error("Column already exists");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.createColumn("t1", { title: "Duplicate", uidt: "SingleLineText" }))
        .rejects.toThrow("Column already exists");
    });

    it("handles errors in deleteView", async () => {
      const error = new Error("Cannot delete default view");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.deleteView("v1")).rejects.toThrow("Cannot delete default view");
    });

    it("handles errors in createViewFilter", async () => {
      const error = new Error("Invalid filter configuration");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.createViewFilter("v1", { comparison_op: "eq" }))
        .rejects.toThrow("Invalid filter configuration");
    });

    it("handles errors in updateFilter", async () => {
      const error = new Error("Filter not found");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.updateFilter("f1", { value: "new value" }))
        .rejects.toThrow("Filter not found");
    });
  });

  describe("Edge cases for typed responses", () => {
    it("handles empty list responses", async () => {
      const mockResponse: ListResponse<Base> = {
        list: [],
        pageInfo: { totalRows: 0, page: 1, pageSize: 25 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listBases();
      
      expect(result.list).toHaveLength(0);
      expect(result.pageInfo.totalRows).toBe(0);
    });

    it("handles partial pageInfo in responses", async () => {
      const mockResponse: ListResponse<Table> = {
        list: [{ id: "t1", base_id: "b1", title: "Table", table_name: "table" }],
        pageInfo: { totalRows: 1 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listTables("b1");
      
      expect(result.list).toHaveLength(1);
      expect(result.pageInfo.totalRows).toBe(1);
      expect(result.pageInfo.page).toBeUndefined();
    });

    it("handles optional fields in Base", async () => {
      const mockBase: Base = {
        id: "b1",
        title: "Minimal Base",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockBase);

      const result = await api.getBase("b1");
      
      expect(result.id).toBe("b1");
      expect(result.title).toBe("Minimal Base");
      expect(result.type).toBeUndefined();
      expect(result.created_at).toBeUndefined();
    });

    it("handles optional fields in Column", async () => {
      const mockColumn: Column = {
        id: "c1",
        title: "Name",
        column_name: "name",
        uidt: "SingleLineText",
        fk_model_id: "t1",
      };
      vi.spyOn(client, "request").mockResolvedValue(mockColumn);

      const result = await api.getColumn("c1");
      
      expect(result.id).toBe("c1");
      expect(result.pk).toBeUndefined();
      expect(result.rqd).toBeUndefined();
      expect(result.system).toBeUndefined();
    });

    it("handles filter groups without column_id", async () => {
      const mockFilter: Filter = {
        id: "f1",
        fk_view_id: "v1",
        logical_op: "and",
        is_group: true,
      };
      vi.spyOn(client, "request").mockResolvedValue(mockFilter);

      const result = await api.getFilter("f1");
      
      expect(result.id).toBe("f1");
      expect(result.is_group).toBe(true);
      expect(result.fk_column_id).toBeUndefined();
    });

    it("handles various column types", async () => {
      const columnTypes: Array<Column["uidt"]> = [
        "SingleLineText", "LongText", "Number", "Decimal",
        "Date", "DateTime", "Checkbox", "Email",
        "LinkToAnotherRecord", "Attachment", "Formula"
      ];

      for (const uidt of columnTypes) {
        const mockColumn: Column = {
          id: `c_${uidt}`,
          title: `Col ${uidt}`,
          column_name: `col_${uidt}`,
          uidt,
          fk_model_id: "t1",
        };
        vi.spyOn(client, "request").mockResolvedValue(mockColumn);

        const result = await api.getColumn(`c_${uidt}`);
        expect(result.uidt).toBe(uidt);
      }
    });

    it("handles various view types", async () => {
      const viewTypes: Array<View["type"]> = ["grid", "form", "gallery", "kanban", "calendar"];

      for (const type of viewTypes) {
        const mockView: View = {
          id: `v_${type}`,
          title: `${type} View`,
          type,
          fk_model_id: "t1",
        };
        vi.spyOn(client, "request").mockResolvedValue(mockView);

        const result = await api.getView(`v_${type}`);
        expect(result.type).toBe(type);
      }
    });

    it("handles various comparison operators", async () => {
      const operators: Array<Filter["comparison_op"]> = [
        "eq", "neq", "like", "nlike", "gt", "lt", "gte", "lte",
        "empty", "notempty", "null", "notnull", "allof", "anyof"
      ];

      for (const op of operators) {
        const mockFilter: Filter = {
          id: `f_${op}`,
          fk_view_id: "v1",
          fk_column_id: "c1",
          comparison_op: op,
        };
        vi.spyOn(client, "request").mockResolvedValue(mockFilter);

        const result = await api.getFilter(`f_${op}`);
        expect(result.comparison_op).toBe(op);
      }
    });

    it("handles both sort directions", async () => {
      const directions: Array<Sort["direction"]> = ["asc", "desc"];

      for (const direction of directions) {
        const mockSort: Sort = {
          id: `s_${direction}`,
          fk_view_id: "v1",
          fk_column_id: "c1",
          direction,
        };
        vi.spyOn(client, "request").mockResolvedValue(mockSort);

        const result = await api.getSort(`s_${direction}`);
        expect(result.direction).toBe(direction);
      }
    });
  });

  describe("Filter Children operations", () => {
    it("listFilterChildren returns ListResponse<Filter>", async () => {
      const mockResponse: ListResponse<Filter> = {
        list: [
          { id: "f1", fk_view_id: "v1", fk_column_id: "c1", comparison_op: "eq", value: "test" },
        ],
        pageInfo: { totalRows: 1 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listFilterChildren("fg1");

      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe("f1");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/filters/fg1/children");
    });
  });

  describe("Hook Filters operations", () => {
    it("listHookFilters returns ListResponse<Filter>", async () => {
      const mockResponse: ListResponse<Filter> = {
        list: [
          { id: "hf1", fk_view_id: "v1", comparison_op: "eq", value: "test" },
        ],
        pageInfo: { totalRows: 1 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listHookFilters("hk1");

      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe("hf1");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/hooks/hk1/filters");
    });

    it("createHookFilter returns Filter", async () => {
      const mockFilter: Filter = { id: "hf-new", fk_view_id: "v1", comparison_op: "eq", value: "test" };
      vi.spyOn(client, "request").mockResolvedValue(mockFilter);

      const body = { fk_column_id: "c1", comparison_op: "eq" as const, value: "test" };
      const result = await api.createHookFilter("hk1", body);

      expect(result.id).toBe("hf-new");
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/hooks/hk1/filters", { body });
    });
  });

  describe("Set Primary Column operations", () => {
    it("setColumnPrimary calls correct endpoint", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ msg: "success" });

      const result = await api.setColumnPrimary("col1");

      expect(result).toEqual({ msg: "success" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/columns/col1/primary");
    });
  });

  describe("Duplicate operations", () => {
    it("duplicateBase without options", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ id: "job1" });

      const result = await api.duplicateBase("b1");

      expect(result).toEqual({ id: "job1" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/duplicate/b1", {});
    });

    it("duplicateBase with options", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ id: "job1" });

      const result = await api.duplicateBase("b1", { excludeData: true, excludeViews: true });

      expect(result).toEqual({ id: "job1" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/duplicate/b1", {
        body: { options: { excludeData: true, excludeViews: true } },
      });
    });

    it("duplicateSource without options", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ id: "job2" });

      const result = await api.duplicateSource("b1", "src1");

      expect(result).toEqual({ id: "job2" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/duplicate/b1/src1", {});
    });

    it("duplicateSource with options", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ id: "job2" });

      const result = await api.duplicateSource("b1", "src1", { excludeHooks: true });

      expect(result).toEqual({ id: "job2" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/duplicate/b1/src1", {
        body: { options: { excludeHooks: true } },
      });
    });

    it("duplicateTable without options", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ id: "job3" });

      const result = await api.duplicateTable("b1", "t1");

      expect(result).toEqual({ id: "job3" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/duplicate/b1/table/t1", {});
    });

    it("duplicateTable with all options", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ id: "job3" });

      const opts = { excludeData: true, excludeViews: true, excludeHooks: true };
      const result = await api.duplicateTable("b1", "t1", opts);

      expect(result).toEqual({ id: "job3" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/duplicate/b1/table/t1", {
        body: { options: opts },
      });
    });
  });

  describe("Visibility Rules operations", () => {
    it("getVisibilityRules returns array", async () => {
      const mockRules = [
        { id: "vw1", title: "Grid View", disabled: { viewer: true } },
        { id: "vw2", title: "Form View", disabled: {} },
      ];
      vi.spyOn(client, "request").mockResolvedValue(mockRules);

      const result = await api.getVisibilityRules("b1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("vw1");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/bases/b1/visibility-rules");
    });

    it("setVisibilityRules sends body", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ msg: "success" });

      const rules = [{ id: "vw1", disabled: { viewer: true } }];
      const result = await api.setVisibilityRules("b1", rules);

      expect(result).toEqual({ msg: "success" });
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/bases/b1/visibility-rules", { body: rules });
    });
  });

  describe("App Info operations", () => {
    it("getAppInfo returns AppInfo", async () => {
      const mockInfo = { version: "0.250.0", authType: "jwt", isDocker: true };
      vi.spyOn(client, "request").mockResolvedValue(mockInfo);

      const result = await api.getAppInfo();

      expect(result.version).toBe("0.250.0");
      expect(result.authType).toBe("jwt");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/nocodb/info");
    });
  });

  describe("Cloud Workspace operations", () => {
    it("listWorkspaces returns ListResponse<NcWorkspace>", async () => {
      const mockResponse = {
        list: [
          { id: "ws1", title: "My Workspace", description: "Test" },
          { id: "ws2", title: "Other Workspace" },
        ],
        pageInfo: { totalRows: 2 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listWorkspaces();

      expect(result.list).toHaveLength(2);
      expect(result.list[0].id).toBe("ws1");
      expect(result.list[0].title).toBe("My Workspace");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/workspaces");
    });

    it("getWorkspace returns workspace with user count", async () => {
      const mockResponse = {
        workspace: { id: "ws1", title: "My Workspace", description: "Test", order: 1 },
        workspaceUserCount: 5,
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.getWorkspace("ws1");

      expect(result.workspace.id).toBe("ws1");
      expect(result.workspace.title).toBe("My Workspace");
      expect(result.workspaceUserCount).toBe(5);
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/workspaces/ws1");
    });

    it("createWorkspace returns NcWorkspace", async () => {
      const mockWs = { id: "ws-new", title: "New Workspace" };
      vi.spyOn(client, "request").mockResolvedValue(mockWs);

      const result = await api.createWorkspace({ title: "New Workspace" });

      expect(result.id).toBe("ws-new");
      expect(result.title).toBe("New Workspace");
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/workspaces", { body: { title: "New Workspace" } });
    });

    it("updateWorkspace returns void", async () => {
      vi.spyOn(client, "request").mockResolvedValue(undefined);

      const result = await api.updateWorkspace("ws1", { title: "Updated" });

      expect(result).toBeUndefined();
      expect(client.request).toHaveBeenCalledWith("PATCH", "/api/v2/meta/workspaces/ws1", { body: { title: "Updated" } });
    });

    it("deleteWorkspace returns void", async () => {
      vi.spyOn(client, "request").mockResolvedValue(undefined);

      const result = await api.deleteWorkspace("ws1");

      expect(result).toBeUndefined();
      expect(client.request).toHaveBeenCalledWith("DELETE", "/api/v2/meta/workspaces/ws1");
    });

    it("listWorkspaceUsers returns ListResponse<NcWorkspaceUser>", async () => {
      const mockResponse = {
        list: [
          { email: "alice@test.com", roles: "owner", fk_user_id: "u1", invite_accepted: true },
          { email: "bob@test.com", roles: "viewer", fk_user_id: "u2", invite_accepted: false },
        ],
        pageInfo: { totalRows: 2 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listWorkspaceUsers("ws1");

      expect(result.list).toHaveLength(2);
      expect(result.list[0].email).toBe("alice@test.com");
      expect(result.list[0].roles).toBe("owner");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/workspaces/ws1/users");
    });

    it("getWorkspaceUser returns NcWorkspaceUser", async () => {
      const mockUser = { email: "alice@test.com", roles: "editor", fk_user_id: "u1" };
      vi.spyOn(client, "request").mockResolvedValue(mockUser);

      const result = await api.getWorkspaceUser("ws1", "u1");

      expect(result.email).toBe("alice@test.com");
      expect(result.roles).toBe("editor");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/workspaces/ws1/users/u1");
    });

    it("inviteWorkspaceUser calls invitations endpoint", async () => {
      vi.spyOn(client, "request").mockResolvedValue({ msg: "success" });

      await api.inviteWorkspaceUser("ws1", { email: "new@test.com", roles: "viewer" });

      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/workspaces/ws1/invitations", {
        body: { email: "new@test.com", roles: "viewer" },
      });
    });

    it("updateWorkspaceUser returns void", async () => {
      vi.spyOn(client, "request").mockResolvedValue(undefined);

      const result = await api.updateWorkspaceUser("ws1", "u1", { roles: "editor" });

      expect(result).toBeUndefined();
      expect(client.request).toHaveBeenCalledWith("PATCH", "/api/v2/meta/workspaces/ws1/users/u1", { body: { roles: "editor" } });
    });

    it("deleteWorkspaceUser returns void", async () => {
      vi.spyOn(client, "request").mockResolvedValue(undefined);

      const result = await api.deleteWorkspaceUser("ws1", "u1");

      expect(result).toBeUndefined();
      expect(client.request).toHaveBeenCalledWith("DELETE", "/api/v2/meta/workspaces/ws1/users/u1");
    });

    it("listWorkspaceBases returns ListResponse<Base>", async () => {
      const mockResponse = {
        list: [
          { id: "b1", title: "Base 1" },
          { id: "b2", title: "Base 2" },
        ],
        pageInfo: { totalRows: 2 },
      };
      vi.spyOn(client, "request").mockResolvedValue(mockResponse);

      const result = await api.listWorkspaceBases("ws1");

      expect(result.list).toHaveLength(2);
      expect(result.list[0].id).toBe("b1");
      expect(client.request).toHaveBeenCalledWith("GET", "/api/v2/meta/workspaces/ws1/bases");
    });

    it("createWorkspaceBase returns Base", async () => {
      const mockBase = { id: "b-new", title: "New Base" };
      vi.spyOn(client, "request").mockResolvedValue(mockBase);

      const result = await api.createWorkspaceBase("ws1", { title: "New Base" });

      expect(result.id).toBe("b-new");
      expect(result.title).toBe("New Base");
      expect(client.request).toHaveBeenCalledWith("POST", "/api/v2/meta/workspaces/ws1/bases", { body: { title: "New Base" } });
    });

    it("handles cloud-only error gracefully", async () => {
      const error = new Error("HTTP 404: Not Found");
      vi.spyOn(client, "request").mockRejectedValue(error);

      await expect(api.listWorkspaces()).rejects.toThrow("HTTP 404: Not Found");
    });
  });
});
