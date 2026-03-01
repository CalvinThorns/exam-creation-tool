import { useMemo, useState } from "react";
import {
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PageHeader } from "../../components/ui/PageHeader";
import { Loader } from "../../components/ui/Loader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
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

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
  };

  const openDelete = (id) => setConfirm({ open: true, id });

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
    <>
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
        <Paper sx={{ borderRadius: 1, overflow: "hidden" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#d9d9d9" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Short Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.shortName}</TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      justifyContent="flex-end"
                      spacing={1}
                    >
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => openDelete(c.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
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
    </>
  );
}