import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Box,
  IconButton,
  Stack,
  TablePagination,
  Tooltip,
} from "@mui/material";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register all community features so AG Grid v33 works out-of-the-box
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Reusable data table built on ag-grid-react.
 *
 * Client-side mode (default):
 * - pageSize, pagination: built-in AG Grid pagination.
 *
 * Server-side mode (serverSide=true):
 * - rowCount: total number of rows (from API).
 * - page: 0-based page index.
 * - pageSize: rows per page.
 * - onPageChange(page, pageSize): when user changes page or page size.
 * - onSortChange(sortModel): sortModel = [{ colId, sort: 'asc'|'desc' }].
 * - onFilterChange(filterModel): AG Grid filter model; parent maps to API.
 * - sortModel / filterModel: optional controlled state for AG Grid.
 *
 * actions: optional row actions column (see below).
 */
export function DataTable({
  columnDefs,
  rowData,
  actions = [],
  actionsHeaderName = "Actions",
  actionsWidth = 220,
  // client-side
  pageSize = 10,
  height = 500,
  // server-side
  serverSide = false,
  rowCount = 0,
  page = 0,
  onPageChange,
  onSortChange,
  onFilterChange,
  sortModel,
  filterModel,
  gridOptions,
  ...rest
}) {
  const gridRef = useRef(null);
  const apiRef = useRef(null);

  const applyServerState = useCallback(
    (api) => {
      if (!api) return;
      if (sortModel != null && sortModel.length > 0) {
        const state = sortModel.map((s, i) => ({
          colId: s.colId,
          sort: s.sort || "asc",
          sortIndex: i,
        }));
        api.applyColumnState({ state });
      }
      if (filterModel != null && Object.keys(filterModel).length > 0) {
        api.setFilterModel(filterModel);
      }
    },
    [sortModel, filterModel]
  );

  const onGridReady = useCallback(
    (e) => {
      apiRef.current = e.api;
      if (serverSide) applyServerState(e.api);
    },
    [serverSide, applyServerState]
  );

  useEffect(() => {
    if (!serverSide || !apiRef.current) return;
    applyServerState(apiRef.current);
  }, [serverSide, applyServerState]);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 120,
    }),
    []
  );

  const onSortChanged = useCallback(
    (e) => {
      if (!e.api || !onSortChange) return;
      const model = e.api
        .getColumnState()
        .filter((c) => c.sort != null)
        .map((c) => ({ colId: c.colId, sort: c.sort }));
      onSortChange(model);
    },
    [onSortChange]
  );

  const onFilterChanged = useCallback(
    (e) => {
      if (!e.api || !onFilterChange) return;
      onFilterChange(e.api.getFilterModel());
    },
    [onFilterChange]
  );

  const columnsWithActions = useMemo(() => {
    if (!actions || actions.length === 0) return columnDefs;

    return [
      ...columnDefs,
      {
        headerName: actionsHeaderName,
        field: "__actions__",
        sortable: false,
        filter: false,
        width: actionsWidth,
        cellRenderer: (params) => {
          const row = params.data;

          return (
            <Stack
              direction="row"
              justifyContent="flex-end"
              spacing={1}
              sx={{ width: "100%" }}
            >
              {actions
                .filter((action) =>
                  action.visible ? action.visible(row) : true
                )
                .map((action) => {
                  const disabled = action.disabled
                    ? action.disabled(row)
                    : false;
                  const Icon = action.icon;

                  const handleClick = () => {
                    if (disabled || !action.onClick) return;
                    action.onClick(row);
                  };

                  const content = Icon ? <Icon fontSize="small" /> : null;
                  const button = (
                    <span key={action.id || action.label}>
                      <IconButton
                        size="small"
                        onClick={handleClick}
                        disabled={disabled}
                      >
                        {content}
                      </IconButton>
                    </span>
                  );

                  return action.label ? (
                    <Tooltip
                      key={action.id || action.label}
                      title={action.label}
                    >
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  );
                })}
            </Stack>
          );
        },
      },
    ];
  }, [actions, actionsHeaderName, actionsWidth, columnDefs]);

  const handlePageChange = useCallback(
    (_, newPage) => {
      onPageChange?.(newPage, pageSize);
    },
    [onPageChange, pageSize]
  );

  const handleRowsPerPageChange = useCallback(
    (e) => {
      const newSize = Math.max(10, parseInt(e.target.value, 10) || 10);
      onPageChange?.(0, newSize);
    },
    [onPageChange]
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        className="ag-theme-quartz"
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          height: serverSide
            ? undefined
            : typeof height === "number"
            ? `${height}px`
            : height,
          ...(serverSide && { minHeight: 200 }),
        }}
      >
        <AgGridReact
          ref={gridRef}
          columnDefs={columnsWithActions}
          rowData={rowData}
          pagination={!serverSide}
          paginationPageSize={pageSize}
          theme="legacy"
          suppressCellFocus={false}
          enableCellTextSelection
          defaultColDef={defaultColDef}
          animateRows
          onGridReady={serverSide ? onGridReady : undefined}
          onSortChanged={serverSide ? onSortChanged : undefined}
          onFilterChanged={serverSide ? onFilterChanged : undefined}
          {...gridOptions}
          {...rest}
        />
      </div>
      {serverSide && (
        <TablePagination
          component="div"
          count={rowCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ borderTop: 1, borderColor: "divider", flexShrink: 0 }}
        />
      )}
    </Box>
  );
}
