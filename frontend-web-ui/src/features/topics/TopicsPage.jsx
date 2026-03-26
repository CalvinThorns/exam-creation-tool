import { useMemo, useState } from "react";
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

export function TopicsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  // const [courseFilter, setCourseFilter] = useState("");
  const { data: coursesData } = useCourses({ page: 1, limit: 200 });

  const { data, isLoading, error } = useTopics({
    page: 1,
    limit: 100,
    // courseId: courseFilter || undefined,
  });

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

  const columns = useMemo(
    () => [
      { headerName: t("topics.topicColumn"), field: "topic" },
      { headerName: t("common.course"), field: "courseTitle" },
      {
        headerName: t("common.points"),
        field: "points",
        cellDataType: "number",
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

      {/* <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          select
          label="Course filter"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          sx={{ minWidth: 320 }}
        >
          <MenuItem value="">All courses</MenuItem>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.title} ({c.shortName})
            </MenuItem>
          ))}
        </TextField>
      </Paper> */}

      {error ? <ErrorState message={error.userMessage} /> : null}

      {!error ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper sx={{ overflow: "hidden", p: 1, height: "100%" }}>
            <DataTable
              columnDefs={columns}
              rowData={rows}
              loading={isLoading}
              noRowsTitle={t("topics.noRows")}
              noRowsHint={t("topics.noRowsHint")}
              noFilteredRowsTitle={t("topics.noFilteredRows")}
              noFilteredRowsHint={t("datatable.noFilteredHint")}
              actions={actions}
              actionsHeaderName={t("common.actions")}
              pageSize={10}
              height="100%"
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
