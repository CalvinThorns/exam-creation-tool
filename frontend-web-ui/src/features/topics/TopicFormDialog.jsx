import { useEffect } from "react";
import {
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import AddIcon from "@mui/icons-material/Add";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { topicSchema } from "../../utils/validators";
import { fileToBase64 } from "../../utils/fileToBase64";
import { TaskEditor } from "./TaskEditor";
import { useTranslation } from "react-i18next";
import {
  AppDialog,
  DialogSubmitActions,
  LatexFormField,
} from "../../components/ui";

export function TopicFormDialog({
  open,
  onClose,
  initialValues,
  onSubmit,
  submitting,
  courses,
}) {
  const { t } = useTranslation();
  const form = useForm({
    resolver: zodResolver(topicSchema(t)),
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
  const descriptionValue = useWatch({ control, name: "description" }) || "";

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
    <AppDialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      title={
        <Box className="px-6 py-3">
          <Typography className="font-semibold text-lg">
            {t("topics.dialogTitle")}
          </Typography>
        </Box>
      }
      titleSx={{ p: 0 }}
      contentSx={{ p: 0, bgcolor: "background.paper" }}
      actionsSx={{ px: 10, py: 4, gap: 2 }}
      actions={
        <DialogSubmitActions
          cancelLabel={t("common.cancel")}
          submitLabel={t("common.save")}
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          submitting={submitting}
        />
      }
      PaperProps={{ sx: { width: "92vw", maxWidth: 1400, borderRadius: 3 } }}
    >
      <Box className="px-10 py-8">
        {/* Row 1: Course + Topic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TextField
            select
            label={t("common.course")}
            fullWidth
            {...register("courseId")}
            error={!!formState.errors.courseId}
            helperText={formState.errors.courseId?.message}
          >
            <MenuItem value="">{t("common.selectCourse")}</MenuItem>
            {(courses || []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.title} ({c.shortName})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t("common.topic")}
            fullWidth
            {...register("topic")}
            error={!!formState.errors.topic}
            helperText={formState.errors.topic?.message}
          />
        </div>

        {/* Description */}
        <div className="mt-8">
          <LatexFormField
            label={t("common.description")}
            value={descriptionValue}
            onChange={(value) =>
              setValue("description", value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            height={300}
            placeholder={t("topics.descriptionLatex")}
            errorText={formState.errors.description?.message}
          />
        </div>

        {/* Row 3: Image + Points */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            className="justify-between"
            fullWidth
          >
            {t("topics.uploadImage")}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => setDescriptionImage(e.target.files?.[0] || null)}
            />
          </Button>

          <TextField
            label={t("common.points")}
            placeholder={t("common.points")}
            type="number"
            fullWidth
            {...register("points")}
            error={!!formState.errors.points}
            helperText={formState.errors.points?.message}
          />
        </div>

        {/* Task block */}
        <div className="mt-10 rounded-2xl border p-5">
          <div className="flex items-center mb-4">
            <Typography className="font-semibold">
              {t("topics.taskBlockTitle")}
            </Typography>
          </div>

          <TaskEditor
            control={control}
            register={register}
            setValue={setValue}
            errors={formState.errors}
          />

          <div className="mt-4 flex justify-end">
            <IconButton onClick={addTask}>
              <AddIcon />
            </IconButton>
          </div>
        </div>
      </Box>
    </AppDialog>
  );
}
