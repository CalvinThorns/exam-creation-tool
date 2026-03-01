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
  TextField,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PageHeader } from "../../components/ui/PageHeader";
import { Loader } from "../../components/ui/Loader";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { TopicFormDialog } from "./TopicFormDialog";
import {
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from "./topics.hooks";
import { useCourses } from "../courses/courses.hooks";

export function TopicsPage() {
  const [courseFilter, setCourseFilter] = useState("");
  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = coursesData?.data || [];

  const { data, isLoading, error } = useTopics({
    page: 1,
    limit: 100,
    courseId: courseFilter || undefined,
  });

  const createM = useCreateTopic();
  const updateM = useUpdateTopic();
  const deleteM = useDeleteTopic();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const rows = useMemo(() => data?.data || [], [data]);

  const courseTitleById = useMemo(() => {
    const m = new Map();
    courses.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [courses]);

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
    if (editing) await updateM.mutateAsync({ id: editing.id, body: values });
    else await createM.mutateAsync(values);
    setFormOpen(false);
  };

  const remove = async () => {
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        right={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add New
          </Button>
        }
      />

      <Paper sx={{ p: 2, borderRadius: 1, mb: 2 }}>
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
      </Paper>

      {isLoading ? <Loader /> : null}
      {error ? <ErrorState message={error.userMessage} /> : null}

      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState
          title="No tasks"
          hint="Add a task set for a course topic."
        />
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <Paper sx={{ borderRadius: 1, overflow: "hidden" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#d9d9d9" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Topic</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Points</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {" "}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.topic}</TableCell>
                  <TableCell>
                    {courseTitleById.get(t.courseId) || t.courseId}
                  </TableCell>
                  <TableCell>{t.points}</TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      justifyContent="flex-end"
                      spacing={1}
                    >
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<EditIcon />}
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => openDelete(t.id)}
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

      <TopicFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialValues={editing}
        onSubmit={submit}
        submitting={createM.isPending || updateM.isPending}
        courses={courses}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete task set"
        message="Are you sure you want to delete this topic and its tasks?"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </>
  );
}
