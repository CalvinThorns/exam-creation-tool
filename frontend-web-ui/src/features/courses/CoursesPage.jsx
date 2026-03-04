import { useMemo, useState } from "react";
import { Box, Button, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PageHeader } from "../../components/ui/PageHeader";
import { Loader } from "../../components/ui/Loader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { CourseFormDialog } from "./CourseFormDialog";
import {
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useUpdateCourse,
} from "./courses.hooks";

export function CoursesPage() {
  const { data, isLoading, error } = useCourses();
  const createM = useCreateCourse();
  const updateM = useUpdateCourse();
  const deleteM = useDeleteCourse();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const rows = useMemo(() => data?.data || [], [data]);

  const columns = useMemo(
    () => [
      { headerName: "Name", field: "title" },
      { headerName: "Short Name", field: "shortName" },
    ],
    [],
  );

  const actions = useMemo(
    () => [
      {
        id: "edit",
        label: "Edit",
        icon: EditIcon,
        onClick: (row) => {
          setEditing(row);
          setFormOpen(true);
        },
      },
      {
        id: "delete",
        label: "Delete",
        icon: DeleteIcon,
        onClick: (row) => {
          setConfirm({ open: true, id: row.id });
        },
      },
    ],
    [],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const submit = async (values) => {
    if (editing) {
      await updateM.mutateAsync({ id: editing.id, body: values });
    } else {
      await createM.mutateAsync(values);
    }
    setFormOpen(false);
  };

  const remove = async () => {
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", pb: 2 }}>
      <PageHeader
        title="Courses"
        right={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add New
          </Button>
        }
      />

      {isLoading ? <Loader /> : null}
      {error ? <ErrorState message={error.message || "Failed to load courses"} /> : null}

      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState
          title="No courses"
          hint="Click Add New to create your first course."
        />
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper sx={{ overflow: "hidden", p: 1, height: "100%" }}>
            <DataTable
              columnDefs={columns}
              rowData={rows}
              actions={actions}
              actionsHeaderName="Actions"
              pageSize={10}
              height="100%"
            />
          </Paper>
        </Box>
      ) : null}

      <CourseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialValues={editing}
        onSubmit={submit}
        submitting={createM.isPending || updateM.isPending}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete course"
        message="Are you sure you want to delete this course?"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </Box>
  );
}