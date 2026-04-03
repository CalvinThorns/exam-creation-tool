import { useEffect, useMemo, useState } from "react";
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { useTopics, useDeleteTopic } from "./topics.hooks";
import { useTranslation } from "react-i18next";

function normalizeTopicName(value) {
  return String(value || "").trim().toLowerCase();
}

export function TopicsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = String(searchParams.get("courseId") || "").trim();
  const topicName = String(searchParams.get("topic") || "").trim();
  const deleteM = useDeleteTopic();
  const [confirm, setConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    if (!courseId || !topicName) {
      nav("/courses/list", { replace: true });
    }
  }, [courseId, nav, topicName]);

  const { data, isLoading, error } = useTopics({
    page: 1,
    limit: 200,
    courseId: courseId || undefined,
  });

  const rows = useMemo(() => {
    const normalizedTopic = normalizeTopicName(topicName);
    return (data?.data || [])
      .filter(
        (row) =>
          String(row.courseId || row.courseId?.id || "").trim() === courseId &&
          normalizeTopicName(row.topic) === normalizedTopic,
      )
      .map((row, index) => ({
        id: row.id,
        nr: index + 1,
        points: row.points,
        taskDescription:
          Array.isArray(row.tasks) && row.tasks.length > 0
            ? row.tasks[0]?.description || ""
            : "",
      }));
  }, [courseId, data?.data, topicName]);

  const columns = useMemo(
    () => [
      {
        headerName: t("common.nr"),
        field: "nr",
        width: 90,
        cellDataType: "number",
      },
      {
        headerName: t("topics.taskDescription"),
        field: "taskDescription",
        flex: 1,
      },
      {
        headerName: t("common.points"),
        field: "points",
        width: 120,
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
        onClick: (row) => nav(`/tasks/edit/${row.id}?courseId=${courseId}&topic=${encodeURIComponent(topicName)}`),
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
    [courseId, nav, t, topicName],
  );

  const remove = async () => {
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}>
      <PageHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={t("common.backToCourses", { defaultValue: "Back to Courses" })}>
              <IconButton size="small" onClick={() => nav("/courses/list")}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="h6">{t("topics.pageTitle")}</Typography>
          </Stack>
        }
        right={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() =>
              nav(
                `/tasks/create?courseId=${courseId}&topic=${encodeURIComponent(topicName)}`,
              )
            }
          >
            {t("common.addNew")}
          </Button>
        }
      />

      {error ? <ErrorState message={error.userMessage || error.message} /> : null}

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
