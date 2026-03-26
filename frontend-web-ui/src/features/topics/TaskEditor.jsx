import { useFieldArray, useWatch } from "react-hook-form";
import { Box, TextField, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { LatexFormField } from "../../components/ui";

export function TaskEditor({
  control,
  register,
  setValue,
  errors,
  editable = true,
}) {
  const { t } = useTranslation();
  const { fields, remove } = useFieldArray({ control, name: "tasks" });
  const watchedTasks = useWatch({ control, name: "tasks" }) || [];

  // const setTaskImage = async (index, file) => {
  //   if (!file) {
  //     setValue(`tasks.${index}.question_img`, null);
  //     return;
  //   }
  //   const base64 = await fileToBase64(file);
  //   setValue(`tasks.${index}.question_img`, {
  //     base64,
  //     contentType: file.type || "application/octet-stream",
  //     filename: file.name || "",
  //   });
  // };

  return (
    <Box className="flex flex-col gap-5">
      {fields.map((f, idx) => (
        <Box key={f.id} className="rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <Typography className="font-semibold">
              {t("topics.taskLabel", { index: idx + 1 })}
            </Typography>
            {fields.length > 1 ? (
              <Button
                color="error"
                variant="text"
                onClick={() => remove(idx)}
                disabled={!editable}
                size="small"
              >
                {t("topics.remove")}
              </Button>
            ) : null}
          </div>

          <LatexFormField
            label={t("topics.taskBlockTitle")}
            value={watchedTasks[idx]?.question || ""}
            onChange={(value) => {
              if (!editable) return;
              setValue(`tasks.${idx}.question`, value, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
            height={220}
            placeholder={t("topics.taskLatex")}
            errorText={errors?.tasks?.[idx]?.question?.message}
          />

          <div className="mt-5">
            <LatexFormField
              label={t("common.solution")}
              value={watchedTasks[idx]?.solution || ""}
              onChange={(value) => {
                if (!editable) return;
                setValue(`tasks.${idx}.solution`, value, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              height={220}
              placeholder={t("topics.solutionLatex")}
              errorText={errors?.tasks?.[idx]?.solution?.message}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
              size="small"
              disabled={!editable}
            >
              {t("topics.uploadTaskImage")}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => setTaskImage(idx, e.target.files?.[0] || null)}
              />
            </Button> */}

            <TextField
              label={t("common.points")}
              placeholder={t("common.points")}
              type="number"
              slotProps={{ htmlInput: { min: 1 } }}
              fullWidth
              size="small"
              {...register(`tasks.${idx}.points`)}
              error={!!errors?.tasks?.[idx]?.points}
              helperText={errors?.tasks?.[idx]?.points?.message}
              disabled={!editable}
            />
          </div>

          {/* <div className="mt-4">
            <FormControlLabel
              control={
                <Checkbox
                  defaultChecked
                  {...register(`tasks.${idx}.isRelatedToTopic`)}
                  disabled={!editable}
                />
              }
              label={t("topics.relatedToTopic")}
            />
          </div> */}
        </Box>
      ))}
    </Box>
  );
}
