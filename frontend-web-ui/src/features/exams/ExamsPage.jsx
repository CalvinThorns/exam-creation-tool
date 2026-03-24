import { useCallback, useMemo, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, EntityTablePage } from "../../components/ui";
import { useExams, useDeleteExam } from "./hooks";
import { formatDate } from "../../utils/format";
import { agGridFilterToApiFilters } from "../../utils/listQuery";
import { useTranslation } from "react-i18next";
import { useDialogState } from "../../hooks/useDialogState";

const DEFAULT_PAGE_SIZE = 10;

export function ExamsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortModel, setSortModel] = useState([
    { colId: "createdAt", sort: "desc" },
  ]);
  const [filterModel, setFilterModel] = useState(null);
  const {
    open: isConfirmOpen,
    data: confirmId,
    openDialog: openConfirmDialog,
    closeDialog: closeConfirmDialog,
  } = useDialogState(null);

  const queryParams = useMemo(() => {
    const sort =
      sortModel?.length > 0
        ? sortModel.map((s) => `${s.colId}:${s.sort || "asc"}`).join(",")
        : undefined;
    const filters = agGridFilterToApiFilters(filterModel);
    return {
      page: page + 1,
      limit: pageSize,
      sort,
      filters: filters.length ? filters : undefined,
    };
  }, [page, pageSize, sortModel, filterModel]);

  const {
    data: examsResponse,
    isLoading,
    isFetching,
    error,
  } = useExams(queryParams);
  const deleteM = useDeleteExam();

  const items = useMemo(() => examsResponse?.data ?? [], [examsResponse]);
  const meta = useMemo(() => examsResponse?.meta ?? {}, [examsResponse]);
  const rowCount = meta.total ?? 0;

  const rows = useMemo(
    () =>
      items.map((e) => ({
        ...e,
        courseTitle:
          (e.courseId && (e.courseId.title ?? e.courseId.shortName)) ||
          (typeof e.courseId === "string" ? e.courseId : ""),
        date: formatDate(e.createdAt),
      })),
    [items],
  );

  const columns = useMemo(
    () => [
      {
        headerName: t("common.course"),
        field: "courseTitle",
        colId: "courseId",
      },
      { headerName: t("common.points"), field: "points", colId: "points" },
      { headerName: t("exams.date"), field: "date", colId: "createdAt" },
    ],
    [t],
  );

  const actions = useMemo(
    () => [
      {
        id: "edit",
        label: t("common.edit"),
        icon: EditIcon,
        onClick: (row) => nav(`/exams/${row.id}/edit`),
      },
      {
        id: "delete",
        label: t("common.delete"),
        icon: DeleteIcon,
        maxWidth: 100,
        onClick: (row) => openConfirmDialog(row.id),
      },
    ],
    [nav, openConfirmDialog, t],
  );

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

  const remove = async () => {
    await deleteM.mutateAsync(confirmId);
    closeConfirmDialog();
  };

  return (
    <EntityTablePage
      title={t("exams.pageTitle")}
      addLabel={t("common.addNew")}
      onAdd={() => nav("/exams/generate")}
      error={error?.userMessage || null}
      dataTableProps={{
        columnDefs: columns,
        rowData: rows,
        loading: isLoading || isFetching,
        noRowsTitle: t("exams.noRows"),
        noRowsHint: t("exams.noRowsHint"),
        noFilteredRowsTitle: t("exams.noFilteredRows"),
        noFilteredRowsHint: t("datatable.noFilteredHint"),
        actions,
        actionsHeaderName: t("common.actions"),
        height: "100%",
        serverSide: true,
        rowCount,
        page,
        pageSize,
        onPageChange: handlePageChange,
        onSortChange: handleSortChange,
        onFilterChange: handleFilterChange,
        sortModel,
        filterModel,
      }}
    >
      <ConfirmDialog
        open={isConfirmOpen}
        title={t("exams.deleteTitle")}
        message={t("exams.deleteMessage")}
        onCancel={closeConfirmDialog}
        onConfirm={remove}
      />
    </EntityTablePage>
  );
}
