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

export function TaskEditor({ control, register, setValue, errors }) {
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
            <Typography className="font-semibold">Task {idx + 1}</Typography>
            {fields.length > 1 ? (
              <Button color="error" variant="text" onClick={() => remove(idx)}>
                Remove
              </Button>
            ) : null}
          </div>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: "block" }}
          >
            Task
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
            placeholder="Task LaTeX"
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
              Solution
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
              placeholder="Solution LaTeX"
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
              Upload task image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => setTaskImage(idx, e.target.files?.[0] || null)}
              />
            </Button>

            <TextField
              label="Points"
              placeholder="Points"
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
              label="Related to topic"
            />
          </div>
        </Box>
      ))}
    </Box>
  );
}
