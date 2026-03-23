import { useFieldArray, useWatch } from "react-hook-form";
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import { fileToBase64 } from "../../utils/fileToBase64";
import { LatexEditor } from "../../components/ui/LatexEditor";
import { useTranslation } from "react-i18next";

export function TaskEditor({ control, register, setValue, errors }) {
  const { t } = useTranslation();
  const { fields, remove } = useFieldArray({ control, name: "tasks" });
  const watchedTasks = useWatch({ control, name: "tasks" }) || [];

  const setTaskImage = async (index, file) => {
    if (!file) {
      setValue(`tasks.${index}.question_img`, null);
      return;
    }
    const base64 = await fileToBase64(file);
    setValue(`tasks.${index}.question_img`, {
      base64,
      contentType: file.type || "application/octet-stream",
      filename: file.name || "",
    });
  };

  return (
    <Box className="flex flex-col gap-5">
      {fields.map((f, idx) => (
        <Box key={f.id} className="rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <Typography className="font-semibold">
              {t("topics.taskLabel", { index: idx + 1 })}
            </Typography>
            {fields.length > 1 ? (
              <Button color="error" variant="text" onClick={() => remove(idx)}>
                {t("topics.remove")}
              </Button>
            ) : null}
          </div>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: "block" }}
          >
            {t("topics.taskBlockTitle")}
          </Typography>
          <LatexEditor
            value={watchedTasks[idx]?.question || ""}
            onChange={(value) =>
              setValue(`tasks.${idx}.question`, value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            height={300}
            placeholder={t("topics.taskLatex")}
          />
          {errors?.tasks?.[idx]?.question?.message ? (
            <Typography
              variant="caption"
              color="error.main"
              sx={{ mt: 0.75, display: "block" }}
            >
              {errors.tasks[idx].question.message}
            </Typography>
          ) : null}

          <div className="mt-5">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, display: "block" }}
            >
              {t("common.solution")}
            </Typography>
            <LatexEditor
              value={watchedTasks[idx]?.solution || ""}
              onChange={(value) =>
                setValue(`tasks.${idx}.solution`, value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              height={300}
              placeholder={t("topics.solutionLatex")}
            />
            {errors?.tasks?.[idx]?.solution?.message ? (
              <Typography
                variant="caption"
                color="error.main"
                sx={{ mt: 0.75, display: "block" }}
              >
                {errors.tasks[idx].solution.message}
              </Typography>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {t("topics.uploadTaskImage")}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => setTaskImage(idx, e.target.files?.[0] || null)}
              />
            </Button>

            <TextField
              label={t("common.points")}
              placeholder={t("common.points")}
              type="number"
              fullWidth
              {...register(`tasks.${idx}.points`)}
              error={!!errors?.tasks?.[idx]?.points}
              helperText={errors?.tasks?.[idx]?.points?.message}
            />
          </div>

          <div className="mt-4">
            <FormControlLabel
              control={
                <Checkbox
                  defaultChecked
                  {...register(`tasks.${idx}.isRelatedToTopic`)}
                />
              }
              label={t("topics.relatedToTopic")}
            />
          </div>
        </Box>
      ))}
    </Box>
  );
}
