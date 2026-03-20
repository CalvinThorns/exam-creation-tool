import { useMemo, useState } from "react";
import { Box, Button, Paper, TextField, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { TopicFormDialog } from "./TopicFormDialog";
import {
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from "./topics.hooks";
import { useCourses } from "../courses/courses.hooks";

export function TopicsPage() {
  // const [courseFilter, setCourseFilter] = useState("");
  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = coursesData?.data || [];

  const { data, isLoading, error } = useTopics({
    page: 1,
    limit: 100,
    // courseId: courseFilter || undefined,
  });

  const createM = useCreateTopic();
  const updateM = useUpdateTopic();
  const deleteM = useDeleteTopic();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null });

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
      { headerName: "Topic", field: "topic" },
      { headerName: "Course", field: "courseTitle" },
      { headerName: "Points", field: "points" },
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
    if (editing) await updateM.mutateAsync({ id: editing.id, body: values });
    else await createM.mutateAsync(values);
    setFormOpen(false);
  };

  const remove = async () => {
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}
    >
      <PageHeader
        title="Tasks"
        right={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add New
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
              noRowsTitle="No tasks"
              noRowsHint="Add a task set for a course topic."
              noFilteredRowsTitle="No matching tasks"
              noFilteredRowsHint="Try adjusting or clearing filters."
              actions={actions}
              actionsHeaderName="Actions"
              pageSize={10}
              height="100%"
            />
          </Paper>
        </Box>
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
    </Box>
  );
}
