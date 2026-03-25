import { useMemo } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ConfirmDialog, EntityTablePage } from "../../components/ui";
import { TopicFormDialog } from "./TopicFormDialog";
import {
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from "./hooks";
import { useCourses } from "../courses";
import { useTranslation } from "react-i18next";
import { useDialogState } from "../../hooks/useDialogState";

export function TopicsPage() {
  const { t } = useTranslation();
  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = useMemo(() => coursesData?.data ?? [], [coursesData]);

  const { data, isLoading, error } = useTopics({
    page: 1,
    limit: 100,
  });

  const createM = useCreateTopic();
  const updateM = useUpdateTopic();
  const deleteM = useDeleteTopic();

  const formDialog = useDialogState(null);
  const confirmDialog = useDialogState(null);

  const courseTitleById = useMemo(() => {
    const m = new Map();
    courses.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [courses]);

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
      { headerName: t("common.points"), field: "points" },
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
    if (editing) await updateM.mutateAsync({ id: editing.id, body: values });
    else await createM.mutateAsync(values);
    formDialog.closeDialog();
  };

  const remove = async () => {
    await deleteM.mutateAsync(confirmDialog.data);
    confirmDialog.closeDialog();
  };

  return (
    <EntityTablePage
      title={t("topics.pageTitle")}
      addLabel={t("common.addNew")}
      onAdd={openAdd}
      error={error?.userMessage || null}
      dataTableProps={{
        columnDefs: columns,
        rowData: rows,
        loading: isLoading,
        noRowsTitle: t("topics.noRows"),
        noRowsHint: t("topics.noRowsHint"),
        noFilteredRowsTitle: t("topics.noFilteredRows"),
        noFilteredRowsHint: t("datatable.noFilteredHint"),
        actions,
        actionsHeaderName: t("common.actions"),
        pageSize: 10,
        height: "100%",
      }}
    >
      <TopicFormDialog
        open={formDialog.open}
        onClose={formDialog.closeDialog}
        initialValues={formDialog.data}
        onSubmit={submit}
        submitting={createM.isPending || updateM.isPending}
        courses={courses}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={t("topics.deleteTitle")}
        message={t("topics.deleteMessage")}
        onCancel={confirmDialog.closeDialog}
        onConfirm={remove}
      />
    </EntityTablePage>
  );
}
