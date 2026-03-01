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
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Loader } from "../../components/ui/Loader";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useExams, useDeleteExam } from "./exams.hooks";
import { useCourses } from "../courses/courses.hooks";
import { formatDate } from "../../utils/format";

export function ExamsPage() {
  const nav = useNavigate();
  const {
    data: examsData,
    isLoading,
    error,
  } = useExams({ page: 1, limit: 100 });
  const deleteM = useDeleteExam();

  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = coursesData?.data || [];
  const courseTitleById = useMemo(() => {
    const m = new Map();
    courses.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [courses]);

  const rows = examsData?.data || [];
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const remove = async () => {
    await deleteM.mutateAsync(confirm.id);
    setConfirm({ open: false, id: null });
  };

  return (
    <>
      <PageHeader
        title="Exams"
        right={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => nav("/exams/generate")}
          >
            Add New
          </Button>
        }
      />

      {isLoading ? <Loader /> : null}
      {error ? <ErrorState message={error.userMessage} /> : null}

      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState
          title="No exams"
          hint="Click Add New to generate and save an exam."
        />
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <Paper sx={{ borderRadius: 1, overflow: "hidden" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#d9d9d9" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Points</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  {" "}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    {courseTitleById.get(e.courseId) || e.courseId}
                  </TableCell>
                  <TableCell>{e.points}</TableCell>
                  <TableCell>{formatDate(e.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      justifyContent="flex-end"
                      spacing={1}
                    >
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setConfirm({ open: true, id: e.id })}
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

      <ConfirmDialog
        open={confirm.open}
        title="Delete exam"
        message="Are you sure you want to delete this exam?"
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={remove}
      />
    </>
  );
}
