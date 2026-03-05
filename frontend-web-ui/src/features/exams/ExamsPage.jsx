import { useCallback, useMemo, useState } from "react";
import { Box, Button, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Loader } from "../../components/ui/Loader";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { useExams, useDeleteExam } from "./exams.hooks";
import { formatDate } from "../../utils/format";
import { agGridFilterToApiFilters } from "../../utils/listQuery";

const DEFAULT_PAGE_SIZE = 10;

export function ExamsPage() {
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

  const { data: examsResponse, isLoading, error } = useExams(queryParams);
  const deleteM = useDeleteExam();

  const items = examsResponse?.data ?? [];
  const meta = examsResponse?.meta ?? {};
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
      { headerName: "Course", field: "courseTitle", colId: "courseId" },
      { headerName: "Points", field: "points", colId: "points" },
      { headerName: "Date", field: "date", colId: "createdAt" },
    ],
    [],
  );

  const actions = useMemo(
    () => [
      {
        id: "edit",
        label: "Edit",
        icon: EditIcon,
        // visible: () => false,
      },
      {
        id: "delete",
        label: "Delete",
        icon: DeleteIcon,
        maxWidth: 100,
        onClick: (row) => setConfirm({ open: true, id: row.id }),
      },
    ],
    [],
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

  const hasData =
    rowCount > 0 || (items.length > 0 && meta.total === undefined);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}
    >
      <PageHeader
        title="Exams"
        right={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => nav("/exams/generate")}
          >
            Add New
          </Button>
        }
      />

      {isLoading ? <Loader /> : null}
      {error ? <ErrorState message={error.userMessage} /> : null}

      {!isLoading && !error && rowCount === 0 && !filterModel ? (
        <EmptyState
          title="No exams"
          hint="Click Add New to generate and save an exam."
        />
      ) : null}

      {!isLoading && !error && (hasData || filterModel) ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper sx={{ overflow: "hidden", p: 1, height: "100%" }}>
            <DataTable
              columnDefs={columns}
              rowData={rows}
              actions={actions}
              actionsHeaderName="Actions"
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
        title="Delete exam"
        message="Are you sure you want to delete this exam?"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </Box>
  );
}
