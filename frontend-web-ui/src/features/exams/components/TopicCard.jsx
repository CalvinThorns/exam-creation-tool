import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LatexEditor } from "../../../components/ui/LatexEditor";
import { useTranslation } from "react-i18next";

export function TopicCard({
  topic,
  topicIndex,
  solutionSpaceOptions,
  editable = true,
  onTopicField,
  onTaskField,
  onAddTask,
  onRemoveTask,
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
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            {topic.topic}
          </Typography>
          <Chip
            label={`${topic.points} ${t("exams.pts")}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, mr: 1 }}
          />
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => onRegenerate(topic.topic)}
            disabled={regenPending || !editable}
          >
            {t("exams.regenerate")}
          </Button>
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
            value={topic.topic || ""}
            onChange={(e) => onTopicField(topicIndex, "topic", e.target.value)}
            fullWidth
            size="small"
            disabled={!editable}
          />
          <TextField
            label={t("common.points")}
            type="number"
            slotProps={{ htmlInput: { min: 1 } }}
            value={topic.points ?? ""}
            onChange={(e) => {
              const rawValue = e.target.value;
              const nextValue =
                rawValue === "" ? "" : Math.max(1, Number(rawValue));
              onTopicField(topicIndex, "points", nextValue);
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
          {t("common.description")}
        </Typography>
        <LatexEditor
          value={topic.description || ""}
          onChange={(value) => {
            if (!editable) return;
            onTopicField(topicIndex, "description", value);
          }}
          height={140}
        />

        {(topic.tasks || []).length > 0 && (
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
              >
                {t("exams.tasksCount", { count: topic.tasks.length })}
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {(topic.tasks || []).map((task, taskIndex) => (
                <Card
                  key={`${topicIndex}-${taskIndex}`}
                  variant="outlined"
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                    borderColor: alpha(theme.palette.primary.main, 0.12),
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
                        {t("topics.taskLabel", { index: taskIndex + 1 })}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label={t("common.points")}
                          type="number"
                          slotProps={{ htmlInput: { min: 1 } }}
                          value={task.points ?? ""}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            const nextValue =
                              rawValue === ""
                                ? ""
                                : Math.max(1, Number(rawValue));
                            onTaskField(
                              topicIndex,
                              taskIndex,
                              "points",
                              nextValue,
                            );
                          }}
                          sx={{ width: 100 }}
                          size="small"
                          disabled={!editable}
                        />
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => onRemoveTask(topicIndex, taskIndex)}
                          disabled={!editable}
                        >
                          {t("topics.remove")}
                        </Button>
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
                        onTaskField(topicIndex, taskIndex, "question", value);
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
                        onTaskField(topicIndex, taskIndex, "solution", value);
                      }}
                      height={120}
                    />

                    <TextField
                      select
                      label={t("exams.solutionSpace")}
                      value={task.solutionSpace || "1 Page"}
                      onChange={(e) =>
                        onTaskField(
                          topicIndex,
                          taskIndex,
                          "solutionSpace",
                          e.target.value,
                        )
                      }
                      size="small"
                      sx={{ mt: 1.5, width: "50%" }}
                      disabled={!editable}
                    >
                      {solutionSpaceOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.25 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => onAddTask(topicIndex)}
                disabled={!editable}
              >
                {t("exams.addTask")}
              </Button>
            </Box>
          </Box>
        )}

        {(topic.tasks || []).length === 0 && (
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
              >
                {t("exams.tasksCount", { count: 0 })}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => onAddTask(topicIndex)}
              >
                {t("exams.addTask")}
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
