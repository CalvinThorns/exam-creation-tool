import { useFieldArray } from "react-hook-form";
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
import { resizableTextAreaSx } from "../../components/ui/fieldStyles";

export function TaskEditor({ control, register, setValue, errors }) {
  const { fields, remove } = useFieldArray({ control, name: "tasks" });

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

          <TextField
            label="Task"
            placeholder="Task LaTeX"
            fullWidth
            multiline
            minRows={4}
            {...register(`tasks.${idx}.question`)}
            error={!!errors?.tasks?.[idx]?.question}
            helperText={errors?.tasks?.[idx]?.question?.message}
            sx={resizableTextAreaSx}
          />

          <div className="mt-5">
            <TextField
              label="Solution"
              placeholder="Solution LaTeX"
              fullWidth
              multiline
              minRows={2}
              {...register(`tasks.${idx}.solution`)}
            sx={resizableTextAreaSx}
            />
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
