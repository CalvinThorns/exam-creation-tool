import { useMemo } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ConfirmDialog, EntityTablePage } from "../../components/ui";
import { CourseFormDialog } from "./CourseFormDialog";
import {
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useUpdateCourse,
} from "./hooks";
import { useTranslation } from "react-i18next";
import { useDialogState } from "../../hooks/useDialogState";

export function CoursesPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCourses();
  const createM = useCreateCourse();
  const updateM = useUpdateCourse();
  const deleteM = useDeleteCourse();

  const formDialog = useDialogState(null);
  const confirmDialog = useDialogState(null);
  const rows = useMemo(() => data?.data || [], [data]);

  const columns = useMemo(
    () => [
      { headerName: t("common.name"), field: "title" },
      { headerName: t("common.shortName"), field: "shortName" },
    ],
    [t],
  );

  const actions = useMemo(
    () => [
      {
        id: "edit",
        label: t("common.edit"),
        icon: EditIcon,
        onClick: (row) => formDialog.openDialog(row),
      },
      {
        id: "delete",
        label: t("common.delete"),
        icon: DeleteIcon,
        onClick: (row) => confirmDialog.openDialog(row.id),
      },
    ],
    [confirmDialog, formDialog, t],
  );

  const openAdd = () => {
    formDialog.openDialog(null);
  };

  const submit = async (values) => {
    const editing = formDialog.data;
    if (editing) {
      await updateM.mutateAsync({ id: editing.id, body: values });
    } else {
      await createM.mutateAsync(values);
    }
    formDialog.closeDialog();
  };

  const remove = async () => {
    await deleteM.mutateAsync(confirmDialog.data);
    confirmDialog.closeDialog();
  };

  return (
    <EntityTablePage
      title={t("courses.pageTitle")}
      addLabel={t("common.addNew")}
      onAdd={openAdd}
      error={error?.message || (error ? t("courses.failedLoad") : null)}
      dataTableProps={{
        columnDefs: columns,
        rowData: rows,
        loading: isLoading,
        noRowsTitle: t("courses.noRows"),
        noRowsHint: t("courses.noRowsHint"),
        noFilteredRowsTitle: t("courses.noFilteredRows"),
        noFilteredRowsHint: t("datatable.noFilteredHint"),
        actions,
        actionsHeaderName: t("common.actions"),
        pageSize: 10,
        height: "100%",
      }}
    >
      <CourseFormDialog
        open={formDialog.open}
        onClose={formDialog.closeDialog}
        initialValues={formDialog.data}
        onSubmit={submit}
        submitting={createM.isPending || updateM.isPending}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={t("courses.deleteTitle")}
        message={t("courses.deleteMessage")}
        onCancel={confirmDialog.closeDialog}
        onConfirm={remove}
      />
    </EntityTablePage>
  );
}
