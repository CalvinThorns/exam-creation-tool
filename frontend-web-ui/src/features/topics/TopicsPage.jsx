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
import { useTopics, useDeleteTopic } from "./topics.hooks";
import { useCourses } from "../courses/courses.hooks";
import { useTranslation } from "react-i18next";
import { agGridFilterToApiFilters } from "../../utils/listQuery";

const DEFAULT_PAGE_SIZE = 10;

export function TopicsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortModel, setSortModel] = useState([{ colId: "topic", sort: "asc" }]);
  const [filterModel, setFilterModel] = useState(null);

  const { data: coursesData } = useCourses({ page: 1, limit: 200 });

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

  const { data, isLoading, isFetching, error } = useTopics(queryParams);

  const deleteM = useDeleteTopic();

  const [confirm, setConfirm] = useState({ open: false, id: null });

  const courseTitleById = useMemo(() => {
    const sourceCourses = coursesData?.data ?? [];
    const m = new Map();
    sourceCourses.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [coursesData?.data]);

  const rows = useMemo(
    () =>
      (data?.data || []).map((t) => ({
        ...t,
        courseTitle: courseTitleById.get(t.courseId) || t.courseId,
      })),
    [data, courseTitleById],
  );
  const rowCount = useMemo(() => data?.meta?.total ?? 0, [data]);

  const columns = useMemo(
    () => [
      { headerName: t("topics.topicColumn"), field: "topic" },
      {
        headerName: t("common.course"),
        field: "courseTitle",
        // sortable: false,
        // filter: false,
      },
      {
        headerName: t("common.points"),
        field: "points",
        cellDataType: "number",
        cellStyle: { textAlign: "right" },
      },
    ],
    [t],
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

  const actions = useMemo(
    () => [
      {
        id: "edit",
        label: t("common.edit"),
        icon: EditIcon,
        onClick: (row) => nav(`/tasks/edit/${row.id}`),
      },
      {
        id: "delete",
        label: t("common.delete"),
        icon: DeleteIcon,
        onClick: (row) => {
          setConfirm({ open: true, id: row.id });
        },
      },
    ],
    [nav, t],
  );

  const remove = async () => {
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}
    >
      <PageHeader
        title={t("topics.pageTitle")}
        right={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => nav("/tasks/create")}
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
              noRowsTitle={t("topics.noRows")}
              noRowsHint={t("topics.noRowsHint")}
              noFilteredRowsTitle={t("topics.noFilteredRows")}
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
        title={t("topics.deleteTitle")}
        message={t("topics.deleteMessage")}
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </Box>
  );
}
