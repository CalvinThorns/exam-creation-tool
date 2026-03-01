import { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema } from "../../utils/validators";
import { resizableTextAreaSx } from "../../components/ui/fieldStyles";

export function CourseFormDialog({
  open,
  onClose,
  initialValues,
  onSubmit,
  submitting,
}) {
  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: "", shortName: "", coverPage: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: initialValues?.title || "",
      shortName: initialValues?.shortName || "",
      coverPage: initialValues?.coverPage || "",
    });
  }, [open, initialValues, form]);

  const { register, handleSubmit, formState } = form;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{initialValues ? "Edit Course" : "Add Course"}</DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#fff" }}>
        <Box className="flex flex-col gap-6">
          {/* Row 1 */}
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label="Title"
              fullWidth
              {...register("title")}
              error={!!formState.errors.title}
              helperText={formState.errors.title?.message}
            />

            <TextField
              label="Short name"
              fullWidth
              {...register("shortName")}
              error={!!formState.errors.shortName}
              helperText={formState.errors.shortName?.message}
            />
          </Box>

          {/* Row 2 */}
          <TextField
            label="Cover page LaTeX"
            fullWidth
            multiline
            minRows={5}
            {...register("coverPage")}
            error={!!formState.errors.coverPage}
            helperText={formState.errors.coverPage?.message}
            sx={resizableTextAreaSx}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button variant="contained" color="secondary" onClick={onClose}>
          CANCEL
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={submitting}
        >
          SAVE
        </Button>
      </DialogActions>
    </Dialog>
  );
}
