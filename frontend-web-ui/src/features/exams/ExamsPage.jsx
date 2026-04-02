import { useCallback, useMemo, useState } from "react";
import { Box, Button, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { useExams, useDeleteExam } from "./exams.hooks";
import { formatDate } from "../../utils/format";
import { agGridFilterToApiFilters } from "../../utils/listQuery";
import { useTranslation } from "react-i18next";

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
  const [confirm, setConfirm] = useState({ open: false, id: null });

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
        semester: e.semester || "",
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
      {
        headerName: t("exams.semester"),
        field: "semester",
        colId: "semester",
      },
      {
        headerName: t("common.points"),
        field: "points",
        colId: "points",
        cellDataType: "number",
        cellStyle: { textAlign: "right" },
      },
      {
        headerName: t("exams.date"),
        field: "date",
        colId: "createdAt",
        cellStyle: { textAlign: "right" },
      },
    ],
    [t],
  );

  const actions = useMemo(
    () => [
      {
        id: "edit",
        label: t("common.edit"),
        icon: EditIcon,
        onClick: (row) => nav(`/exams/edit/${row.id}`),
      },
      {
        id: "delete",
        label: t("common.delete"),
        icon: DeleteIcon,
        maxWidth: 100,
        onClick: (row) => setConfirm({ open: true, id: row.id }),
      },
    ],
    [nav, t],
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
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}
    >
      <PageHeader
        title={t("exams.pageTitle")}
        right={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => nav("/exams/create")}
          >
            {t("common.addNew")}
          </Button>
        }
      />

      {error ? <ErrorState message={error.userMessage} /> : null}

      {!error ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper sx={{ overflow: "hidden", p: 1, height: "100%" }}>
            <DataTable
              columnDefs={columns}
              rowData={rows}
              loading={isLoading || isFetching}
              noRowsTitle={t("exams.noRows")}
              noRowsHint={t("exams.noRowsHint")}
              noFilteredRowsTitle={t("exams.noFilteredRows")}
              noFilteredRowsHint={t("datatable.noFilteredHint")}
              actions={actions}
              actionsHeaderName={t("common.actions")}
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
          </Paper>
        </Box>
      ) : null}

      <ConfirmDialog
        open={confirm.open}
        title={t("exams.deleteTitle")}
        message={t("exams.deleteMessage")}
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </Box>
  );
}
