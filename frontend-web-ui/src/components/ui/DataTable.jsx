import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  TablePagination,
  Typography,
  Tooltip,
} from "@mui/material";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register all community features so AG Grid v33 works out-of-the-box
ModuleRegistry.registerModules([AllCommunityModule]);

function GridLoadingOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <Stack direction="column" spacing={1.5} alignItems="center">
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Stack>
    </Box>
  );
}

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
  loading = false,
  noRowsTitle = "No rows",
  noRowsHint,
  noFilteredRowsTitle = "No matching results",
  noFilteredRowsHint = "Try adjusting or clearing filters.",
  gridOptions,
  ...rest
}) {
  const gridRef = useRef(null);
  const apiRef = useRef(null);
  const isApplyingServerStateRef = useRef(false);
  const [isFilterActive, setIsFilterActive] = useState(false);

  const isEqual = useCallback((a, b) => {
    if (a === b) return true;
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }, []);

  const GridNoRowsOverlay = useMemo(
    () =>
      function NoRowsOverlay() {
        const title = isFilterActive ? noFilteredRowsTitle : noRowsTitle;
        const hint = isFilterActive ? noFilteredRowsHint : noRowsHint;

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <Stack direction="column" spacing={1} alignItems="center">
              <Typography variant="subtitle2" color="text.primary">
                {title}
              </Typography>
              {hint ? (
                <Typography variant="body2" color="text.secondary">
                  {hint}
                </Typography>
              ) : null}
            </Stack>
          </Box>
        );
      },
    [
      isFilterActive,
      noFilteredRowsHint,
      noFilteredRowsTitle,
      noRowsHint,
      noRowsTitle,
    ],
  );

  const applyServerState = useCallback(
    (api) => {
      if (!api) return;
      isApplyingServerStateRef.current = true;
      try {
        if (sortModel != null) {
          const state = (sortModel || []).map((s, i) => ({
            colId: s.colId,
            sort: s.sort || "asc",
            sortIndex: i,
          }));
          api.applyColumnState({
            state,
            defaultState: { sort: null },
            applyOrder: false,
          });
        }
        if (filterModel != null) {
          api.setFilterModel(filterModel);
        }
      } finally {
        isApplyingServerStateRef.current = false;
      }
    },
    [sortModel, filterModel],
  );

  const onGridReady = useCallback(
    (e) => {
      apiRef.current = e.api;
      setIsFilterActive(e.api.isAnyFilterPresent());
      if (serverSide) applyServerState(e.api);
    },
    [serverSide, applyServerState],
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
    [],
  );

  const onSortChanged = useCallback(
    (e) => {
      if (!e.api || !onSortChange) return;
      if (isApplyingServerStateRef.current) return;

      const model = e.api
        .getColumnState()
        .filter((c) => c.sort != null)
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .map((c) => ({ colId: c.colId, sort: c.sort }));

      if (isEqual(model, sortModel ?? [])) return;
      onSortChange(model);
    },
    [isEqual, onSortChange, sortModel],
  );

  const onFilterChanged = useCallback(
    (e) => {
      if (!e.api) return;
      setIsFilterActive(e.api.isAnyFilterPresent());

      if (!onFilterChange) return;
      if (isApplyingServerStateRef.current) return;

      const nextFilterModel = e.api.getFilterModel();
      if (isEqual(nextFilterModel, filterModel ?? null)) return;
      onFilterChange(nextFilterModel);
    },
    [filterModel, isEqual, onFilterChange],
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
                  action.visible ? action.visible(row) : true,
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
    [onPageChange, pageSize],
  );

  const handleRowsPerPageChange = useCallback(
    (e) => {
      const newSize = Math.max(10, parseInt(e.target.value, 10) || 10);
      onPageChange?.(0, newSize);
    },
    [onPageChange],
  );

  useEffect(() => {
    if (!serverSide) return;
    setIsFilterActive(
      (filterModel && Object.keys(filterModel).length > 0) || false,
    );
  }, [filterModel, serverSide]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    if (loading) {
      api.showLoadingOverlay();
      return;
    }

    if ((rowData?.length ?? 0) === 0) {
      api.showNoRowsOverlay();
      return;
    }

    api.hideOverlay();
  }, [loading, rowData, isFilterActive]);

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
          loading={loading}
          loadingOverlayComponent={GridLoadingOverlay}
          noRowsOverlayComponent={GridNoRowsOverlay}
          pagination={!serverSide}
          paginationPageSize={pageSize}
          theme="legacy"
          suppressCellFocus={false}
          enableCellTextSelection
          defaultColDef={defaultColDef}
          animateRows
          onGridReady={onGridReady}
          onSortChanged={serverSide ? onSortChanged : undefined}
          onFilterChanged={onFilterChanged}
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
