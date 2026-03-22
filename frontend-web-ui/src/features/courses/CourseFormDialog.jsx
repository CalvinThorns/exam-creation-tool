import { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema } from "../../utils/validators";
import { LatexEditor } from "../../components/ui/LatexEditor";

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

  const { register, handleSubmit, formState, setValue, control } = form;
  const coverPageValue = useWatch({ control, name: "coverPage" }) || "";

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
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, display: "block" }}
            >
              Cover page LaTeX
            </Typography>
            <LatexEditor
              value={coverPageValue}
              onChange={(value) =>
                setValue("coverPage", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              height={480}
              placeholder="Cover page LaTeX"
            />
            {formState.errors.coverPage?.message ? (
              <Typography
                variant="caption"
                color="error.main"
                sx={{ mt: 0.75, display: "block" }}
              >
                {formState.errors.coverPage.message}
              </Typography>
            ) : null}
          </Box>
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
