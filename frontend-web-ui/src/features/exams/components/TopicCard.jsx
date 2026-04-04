import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import { LatexEditor } from "../../../components/ui/LatexEditor";
import { useTranslation } from "react-i18next";

export function TopicCard({
  topicGroup,
  pointsValidationByFlatIndex,
  solutionSpaceOptions,
  editable = true,
  onVariantField,
  onVariantSolutionSpace,
  onSubtaskField,
  onAddTask,
  onRemoveSubtask,
  onRegenerate,
  regenPending,
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: theme.palette.divider,
        "&:hover": { borderColor: theme.palette.primary.light },
        transition: "border-color 0.2s",
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {topicGroup.topicName}
            </Typography>
            <Chip
              label={`${topicGroup.totalPoints} ${t("exams.pts")}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              {t("exams.tasksCount", { count: topicGroup.variants.length })}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => onRegenerate(topicGroup.topicName)}
              disabled={regenPending || !editable}
            >
              {t("exams.regenerate")}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => onAddTask(topicGroup.topicName)}
              disabled={!editable}
            >
              {t("exams.addTask")}
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          {topicGroup.variants.map((variant, variantIndex) => {
            const flatIndex = topicGroup.flatIndices[variantIndex];
            const sharedSolutionSpace =
              (variant.tasks || []).find((task) => task?.solutionSpace)?.solutionSpace ||
              "1 Page";
            const pointsValidation = pointsValidationByFlatIndex.get(flatIndex);

            return (
              <Card
                key={`${topicGroup.topicName}-${flatIndex}`}
                variant="outlined"
                sx={{
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  borderColor: alpha(theme.palette.primary.main, 0.12),
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Typography variant="subtitle2" fontWeight={700}>
                        {t("exams.taskLabel", { index: variantIndex + 1 })}
                      </Typography>
                      <Chip
                        label={`${variant.points} ${t("exams.pts")}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      {pointsValidation && !pointsValidation.isValid && (
                        <Typography variant="caption" color="error.main">
                          {t("exams.pointsValidationErrorTopicDetails", {
                            taskPoints: pointsValidation.taskPoints,
                            topicPoints: pointsValidation.topicPoints,
                          })}
                        </Typography>
                      )}
                    </Stack>

                    <TextField
                      select
                      label={t("exams.solutionSpace")}
                      value={sharedSolutionSpace}
                      onChange={(event) =>
                        onVariantSolutionSpace(flatIndex, event.target.value)
                      }
                      SelectProps={{ native: true }}
                      size="small"
                      sx={{ width: 180 }}
                      disabled={!editable}
                    >
                      {solutionSpaceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </TextField>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 2,
                      alignItems: "start",
                      mb: 2,
                    }}
                  >
                    <TextField
                      label={t("common.topic")}
                      value={variant.topic || ""}
                      fullWidth
                      size="small"
                      disabled
                    />
                    <TextField
                      label={t("common.points")}
                      type="number"
                      slotProps={{ htmlInput: { min: 1 } }}
                      value={variant.points ?? ""}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        const nextValue =
                          rawValue === "" ? "" : Math.max(1, Number(rawValue));
                        onVariantField(flatIndex, "points", nextValue);
                      }}
                      sx={{ width: 110 }}
                      size="small"
                      disabled={!editable}
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    {t("exams.taskDescriptionLabel", {
                      index: variantIndex + 1,
                      defaultValue: `Task ${variantIndex + 1} Description`,
                    })}
                  </Typography>

                  <LatexEditor
                    value={variant.description || ""}
                    onChange={(value) => {
                      if (!editable) return;
                      onVariantField(flatIndex, "description", value);
                    }}
                    height={140}
                  />

                  {(variant.tasks || []).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {t("exams.subtasksCount", { count: variant.tasks.length })}
                      </Typography>
                      <Stack spacing={1.5}>
                        {(variant.tasks || []).map((task, taskIndex) => (
                          <Card
                            key={`${flatIndex}-${taskIndex}`}
                            variant="outlined"
                            sx={{
                              borderRadius: 1.5,
                              bgcolor: alpha(theme.palette.secondary.main, 0.03),
                              borderColor: alpha(theme.palette.secondary.main, 0.12),
                            }}
                          >
                            <CardContent sx={{ pb: "12px !important" }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mb: 1.5 }}
                              >
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  color="text.secondary"
                                >
                                  {t("exams.subtaskLabel", { index: taskIndex + 1 })}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <TextField
                                    label={t("common.points")}
                                    type="number"
                                    slotProps={{ htmlInput: { min: 1 } }}
                                    value={task.points ?? ""}
                                    onChange={(event) => {
                                      const rawValue = event.target.value;
                                      const nextValue =
                                        rawValue === ""
                                          ? ""
                                          : Math.max(1, Number(rawValue));
                                      onSubtaskField(
                                        flatIndex,
                                        taskIndex,
                                        "points",
                                        nextValue,
                                      );
                                    }}
                                    sx={{ width: 100 }}
                                    size="small"
                                    disabled={!editable}
                                  />
                                </Stack>
                              </Stack>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mb: 0.5 }}
                              >
                                {t("common.question")}
                              </Typography>
                              <LatexEditor
                                value={task.question || ""}
                                onChange={(value) => {
                                  if (!editable) return;
                                  onSubtaskField(flatIndex, taskIndex, "question", value);
                                }}
                                height={160}
                              />

                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 1.5, mb: 0.5 }}
                              >
                                {t("common.solution")}
                              </Typography>
                              <LatexEditor
                                value={task.solution || ""}
                                onChange={(value) => {
                                  if (!editable) return;
                                  onSubtaskField(flatIndex, taskIndex, "solution", value);
                                }}
                                height={120}
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
