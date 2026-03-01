import { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import AddIcon from "@mui/icons-material/Add";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { topicSchema } from "../../utils/validators";
import { fileToBase64 } from "../../utils/fileToBase64";
import { TaskEditor } from "./TaskEditor";
import { resizableTextAreaSx } from "../../components/ui/fieldStyles";

const grayFieldSx = {
  "& .MuiInputBase-root": {
    backgroundColor: "#d9d9d9",
    borderRadius: "10px",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#d9d9d9",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#cfcfcf",
  },
};

export function TopicFormDialog({
  open,
  onClose,
  initialValues,
  onSubmit,
  submitting,
  courses,
}) {
  const form = useForm({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      courseId: "",
      topic: "",
      description: "",
      points: 0,
      description_img: null,
      tasks: [
        {
          question: "",
          points: 0,
          question_img: null,
          solution: "",
          isRelatedToTopic: true,
        },
      ],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      courseId: initialValues?.courseId || "",
      topic: initialValues?.topic || "",
      description: initialValues?.description || "",
      points: initialValues?.points ?? 0,
      description_img: null,
      tasks: initialValues?.tasks?.length
        ? initialValues.tasks
        : [
            {
              question: "",
              points: 0,
              question_img: null,
              solution: "",
              isRelatedToTopic: true,
            },
          ],
    });
  }, [open, initialValues, form]);

  const { register, handleSubmit, formState, setValue, control, getValues } =
    form;

  const setDescriptionImage = async (file) => {
    if (!file) {
      setValue("description_img", null);
      return;
    }
    const base64 = await fileToBase64(file);
    setValue("description_img", {
      base64,
      contentType: file.type || "application/octet-stream",
      filename: file.name || "",
    });
  };

  const addTask = () => {
    const current = getValues("tasks") || [];
    setValue("tasks", [
      ...current,
      {
        question: "",
        points: 0,
        question_img: null,
        solution: "",
        isRelatedToTopic: true,
      },
    ]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ sx: { width: "92vw", maxWidth: 1400, borderRadius: 3 } }}
    >
      {/* Header bar like mock */}
      <DialogTitle sx={{ p: 0 }}>
        <Box className="bg-[#d9d9d9] px-6 py-3 rounded-t-[12px]">
          <Typography className="font-semibold text-lg">Add Task</Typography>
        </Box>
      </DialogTitle>

      <DialogContent className="bg-white" sx={{ p: 0 }}>
        <Box className="px-10 py-8">
          {/* Row 1: Course + Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TextField
              select
              label="Course"
              fullWidth
              {...register("courseId")}
              error={!!formState.errors.courseId}
              helperText={formState.errors.courseId?.message}
              sx={grayFieldSx}
            >
              <MenuItem value="">Select course</MenuItem>
              {(courses || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.title} ({c.shortName})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Topic"
              fullWidth
              {...register("topic")}
              error={!!formState.errors.topic}
              helperText={formState.errors.topic?.message}
              sx={grayFieldSx}
            />
          </div>

          {/* Description */}
          <div className="mt-8">
            <TextField
              label="Description"
              placeholder="Description LaTeX"
              fullWidth
              multiline
              minRows={5}
              {...register("description")}
              sx={{
                ...grayFieldSx,
                ...resizableTextAreaSx,
              }}
            />
          </div>

          {/* Row 3: Image + Points */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              className="justify-between"
              sx={{
                height: 56,
                borderRadius: 1.5,
                borderColor: "#d9d9d9",
                color: "#111",
              }}
              fullWidth
            >
              Upload image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setDescriptionImage(e.target.files?.[0] || null)
                }
              />
            </Button>

            <TextField
              label="Points"
              placeholder="Points"
              type="number"
              fullWidth
              {...register("points")}
              error={!!formState.errors.points}
              helperText={formState.errors.points?.message}
              sx={grayFieldSx}
            />
          </div>

          {/* Task block */}
          <div className="mt-10 bg-[#f2f2f2] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Typography className="font-semibold">Task</Typography>

              {/* Plus button on right like mock */}
              <IconButton
                onClick={addTask}
                sx={{
                  bgcolor: "#555",
                  color: "#fff",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "#444" },
                }}
              >
                <AddIcon />
              </IconButton>
            </div>

            <TaskEditor
              control={control}
              register={register}
              setValue={setValue}
              errors={formState.errors}
            />
          </div>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 10, py: 4, gap: 2, bgcolor: "#fff" }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={onClose}
          sx={{ borderRadius: 1.5, px: 7, py: 1.6 }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={submitting}
          sx={{
            borderRadius: 1.5,
            px: 9,
            py: 1.6,
            bgcolor: "#111",
            "&:hover": { bgcolor: "#000" },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
