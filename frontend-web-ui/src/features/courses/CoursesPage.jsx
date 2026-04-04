import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LaunchIcon from "@mui/icons-material/Launch";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import {
  useAddCollaborator,
  useCourses,
  useDeleteCourse,
} from "./courses.hooks";
import { useTopics } from "../topics/topics.hooks";

function normalizeTopicKey(courseId, topicName) {
  return `${String(courseId || "").trim()}::${String(topicName || "")
    .trim()
    .toLowerCase()}`;
}

export function CoursesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data, isLoading, error } = useCourses();
  const { data: topicsData } = useTopics({ page: 1, limit: 1000 });
  const deleteM = useDeleteCourse();
  const addCollaboratorM = useAddCollaborator();

  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [expandedCourses, setExpandedCourses] = useState({});

  const rows = useMemo(() => data?.data || [], [data]);
  const taskRows = useMemo(() => topicsData?.data || [], [topicsData]);

  useEffect(() => {
    setExpandedCourses((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        if (!(row.id in next)) {
          next[row.id] = true;
        }
      });
      return next;
    });
  }, [rows]);

  const taskCounts = useMemo(() => {
    const counts = new Map();

    taskRows.forEach((row) => {
      const key = normalizeTopicKey(
        typeof row.courseId === "object" ? row.courseId?.id : row.courseId,
        row.topic,
      );
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [taskRows]);

  const toggleCourseTopics = (courseId) => {
    setExpandedCourses((current) => ({
      ...current,
      [courseId]: !current[courseId],
    }));
  };

  const openTopicTasks = (courseId, topic) => {
    const params = new URLSearchParams({
      courseId: String(courseId || ""),
      topic: String(topic || ""),
    });
    nav(`/tasks/list?${params.toString()}`);
  };

  const columns = useMemo(
    () => [
      { headerName: t("common.name"), field: "title" },
      {
        headerName: t("courses.topicsAndTasks"),
        field: "topics",
        flex: 2,
        minWidth: 360,
        autoHeight: true,
        wrapText: true,
        sortable: false,
        filter: false,
        cellRenderer: (params) => {
          const row = params.data || {};
          const topicNames = Array.isArray(row.topics) ? row.topics : [];
          const isExpanded = expandedCourses[row.id] !== false;

          if (!topicNames.length) {
            return (
              <Typography variant="body2" color="text.secondary">
                {t("courses.noTopics")}
              </Typography>
            );
          }

          return (
            <Stack spacing={1} sx={{ py: 0.5 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => toggleCourseTopics(row.id)}
                endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ alignSelf: "flex-start", minHeight: 28, px: 0.5 }}
              >
                {t("courses.courseTopics")} ({topicNames.length})
              </Button>

              {isExpanded ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {topicNames.map((topicName) => {
                    const count =
                      taskCounts.get(normalizeTopicKey(row.id, topicName)) || 0;

                    return (
                      <Chip
                        key={`${row.id}-${topicName}`}
                        clickable
                        icon={<LaunchIcon sx={{ fontSize: 16 }} />}
                        label={`${topicName} (${count})`}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          openTopicTasks(row.id, topicName);
                        }}
                        sx={{
                          height: 40,
                          "& .MuiChip-label": {
                            px: 1,
                            fontSize: "0.875rem",
                            fontWeight: 500,
                          },
                          "& .MuiChip-icon": {
                            ml: 0.75,
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              ) : null}
            </Stack>
          );
        },
      },
    ],
    [expandedCourses, taskCounts, t],
  );

  const actions = useMemo(
    () => [
      {
        id: "add-collaborator",
        label: t("courses.addCollaborator") || "Add collaborator",
        icon: PersonAddIcon,
        onClick: async (row) => {
          const email = window.prompt("Enter the collaborator email address:");

          if (email && email.trim() !== "") {
            try {
              await addCollaboratorM.mutateAsync({
                id: row.id,
                email: email.trim(),
              });
              window.alert("Collaborator added successfully.");
            } catch {
              window.alert("User not found or you do not have permission.");
            }
          }
        },
      },
      {
        id: "edit",
        label: t("common.edit"),
        icon: EditIcon,
        onClick: (row) => nav(`/courses/edit/${row.id}`),
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
    [addCollaboratorM, nav, t],
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
        title={t("courses.pageTitle")}
        right={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => nav("/courses/create")}
          >
            {t("common.addNew")}
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error.message || t("courses.failedLoad")} />
      ) : null}

      {!error ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper sx={{ overflow: "hidden", p: 1, height: "100%" }}>
            <DataTable
              columnDefs={columns}
              rowData={rows}
              loading={isLoading}
              noRowsTitle={t("courses.noRows")}
              noRowsHint={t("courses.noRowsHint")}
              noFilteredRowsTitle={t("courses.noFilteredRows")}
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
        title={t("courses.deleteTitle")}
        message={t("courses.deleteMessage")}
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </Box>
  );
}
