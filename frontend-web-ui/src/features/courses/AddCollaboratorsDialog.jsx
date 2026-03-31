import { useCallback, useMemo, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AppDialog } from "../../components/ui/AppDialog";
import { DataTable } from "../../components/ui/DataTable";
import { useUsers } from "./users.hooks";
import { useAddCollaborator } from "./courses.hooks";
import { agGridFilterToApiFilters } from "../../utils/listQuery";
import { getAuthUser } from "../auth/authSession";

const getEntityId = (entity) => entity?.id || entity?._id || null;
const DEFAULT_PAGE_SIZE = 10;

export function AddCollaboratorsDialog({
  open,
  courseId,
  existingCollaborators = [],
  createdBy = null,
  onClose,
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortModel, setSortModel] = useState([
    { colId: "firstName", sort: "asc" },
  ]);
  const [filterModel, setFilterModel] = useState(null);
  const currentUser = getAuthUser();
  const currentUserId = getEntityId(currentUser);

  const blockedIds = useMemo(
    () =>
      [currentUserId, createdBy, ...existingCollaborators]
        .map((u) => getEntityId(u))
        .filter(Boolean),
    [createdBy, currentUserId, existingCollaborators],
  );

  const queryParams = useMemo(() => {
    const sort =
      sortModel?.length > 0
        ? sortModel.map((s) => `${s.colId}:${s.sort || "asc"}`).join(",")
        : undefined;

    const filters = agGridFilterToApiFilters(filterModel);
    if (blockedIds.length > 0) {
      filters.push({ field: "_id", op: "nin", value: blockedIds });
    }

    return {
      page: page + 1,
      limit: pageSize,
      sort,
      filters: filters.length ? filters : undefined,
    };
  }, [blockedIds, filterModel, page, pageSize, sortModel]);

  const { data, isLoading, isFetching } = useUsers(queryParams);
  const addCollaboratorM = useAddCollaborator();
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  const rows = useMemo(() => data?.data || [], [data]);
  const meta = useMemo(() => data?.meta || {}, [data]);
  const rowCount = meta.total ?? 0;

  const columns = useMemo(
    () => [
      {
        headerName: "",
        field: "__select__",
        colId: "__select__",
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        pinned: "left",
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        checkboxSelection: true,
        headerCheckboxSelection: true,
      },
      { headerName: t("common.firstName"), field: "firstName" },
      { headerName: t("common.lastName"), field: "lastName" },
      { headerName: t("common.email"), field: "email" },
    ],
    [t],
  );

  const handleRowSelection = (e) => {
    const currentPageIds = rows.map((row) => getEntityId(row)).filter(Boolean);
    const selectedOnPage = new Set(
      e.api
        .getSelectedRows()
        .map((row) => getEntityId(row))
        .filter(Boolean),
    );

    setSelectedUsers((prev) => {
      const next = new Set(prev);
      currentPageIds.forEach((id) => next.delete(id));
      selectedOnPage.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleAddCollaborators = async () => {
    if (!courseId || selectedUsers.size === 0) return;

    try {
      await Promise.all(
        [...selectedUsers].map((userId) =>
          addCollaboratorM.mutateAsync({ courseId, userId }),
        ),
      );
      setSelectedUsers(new Set());
      onClose();
    } catch (error) {
      console.error("Error adding collaborators:", error);
    }
  };

  const handlePageChange = useCallback((newPage, newPageSize) => {
    setPage(newPage);
    if (newPageSize != null) setPageSize(newPageSize);
  }, []);

  const handleSortChange = useCallback((newSortModel) => {
    setSortModel(newSortModel ?? []);
    setPage(0);
  }, []);

  const handleFilterChange = useCallback((newFilterModel) => {
    setFilterModel(newFilterModel ?? null);
    setPage(0);
  }, []);

  const gridOptions = {
    rowSelection: "multiple",
    suppressRowClickSelection: true,
    onSelectionChanged: handleRowSelection,
  };

  const actions = [
    <Button key="cancel" onClick={onClose} variant="outlined">
      {t("common.cancel")}
    </Button>,
    <Button
      key="add"
      onClick={handleAddCollaborators}
      variant="contained"
      disabled={selectedUsers.size === 0 || addCollaboratorM.isPending}
    >
      {t("common.add")}
    </Button>,
  ];

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={t("courses.addCollaborators")}
      maxWidth="md"
      actions={
        <Stack direction="row" spacing={1}>
          {actions}
        </Stack>
      }
    >
      <Box sx={{ height: 400, width: "100%" }}>
        <DataTable
          columnDefs={columns}
          rowData={rows}
          loading={isLoading || isFetching}
          noRowsTitle={t("users.noRows")}
          noRowsHint={t("users.noRowsHint")}
          noFilteredRowsTitle={t("datatable.noMatchingResults")}
          noFilteredRowsHint={t("datatable.noFilteredHint")}
          gridOptions={gridOptions}
          height="100%"
          serverSide
          rowCount={rowCount}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          sortModel={sortModel}
          filterModel={filterModel}
        />
      </Box>
    </AppDialog>
  );
}
