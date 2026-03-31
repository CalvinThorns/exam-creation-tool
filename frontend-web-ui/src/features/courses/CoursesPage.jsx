import { useMemo, useState } from "react";
import { Box, Button, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { useCourses, useDeleteCourse } from "./courses.hooks";
import { AddCollaboratorsDialog } from "./AddCollaboratorsDialog";
import { useTranslation } from "react-i18next";

export function CoursesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data, isLoading, error } = useCourses();
  const deleteM = useDeleteCourse();

  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [collaboratorDialog, setCollaboratorDialog] = useState({
    open: false,
    course: null,
  });
  const rows = useMemo(() => data?.data || [], [data]);

  const fullNameOrDash = (user) => {
    if (!user) return "-";
    const first = user.firstName || "";
    const last = user.lastName || "";
    const full = `${first} ${last}`.trim();
    return full || user.email || "-";
  };

  const columns = useMemo(
    () => [
      { headerName: t("common.name"), field: "title" },
      { headerName: t("common.shortName"), field: "shortName" },
      {
        headerName: t("courses.createdBy"),
        field: "createdBy",
        valueGetter: (params) => fullNameOrDash(params.data?.createdBy),
      },
      {
        headerName: t("courses.collaborators"),
        field: "collaborators",
        valueGetter: (params) => {
          const collaborators = params.data?.collaborators || [];
          if (!Array.isArray(collaborators) || collaborators.length === 0) {
            return "-";
          }
          return collaborators.map((c) => fullNameOrDash(c)).join(", ");
        },
      },
    ],
    [t],
  );

  const actions = useMemo(
    () => [
      {
        id: "addCollaborators",
        label: t("courses.addCollaborators"),
        icon: PersonAddIcon,
        onClick: (row) => {
          setCollaboratorDialog({ open: true, course: row });
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

      <AddCollaboratorsDialog
        open={collaboratorDialog.open}
        courseId={collaboratorDialog.course?.id}
        existingCollaborators={collaboratorDialog.course?.collaborators || []}
        createdBy={collaboratorDialog.course?.createdBy || null}
        onClose={() => setCollaboratorDialog({ open: false, course: null })}
      />
    </Box>
  );
}
