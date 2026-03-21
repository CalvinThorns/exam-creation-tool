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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LatexEditor } from "../../../components/ui/LatexEditor";

export function TopicCard({
  topic,
  topicIndex,
  onTopicField,
  onTaskField,
  onAddTask,
  onRemoveTask,
  onRegenerate,
  regenPending,
}) {
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
            label={`${topic.points} pts`}
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
            disabled={regenPending}
          >
            Regenerate
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
            label="Topic"
            value={topic.topic || ""}
            onChange={(e) => onTopicField(topicIndex, "topic", e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Points"
            type="number"
            value={topic.points ?? 0}
            onChange={(e) =>
              onTopicField(topicIndex, "points", Number(e.target.value || 0))
            }
            sx={{ width: 110 }}
            size="small"
          />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.5 }}
        >
          Description
        </Typography>
        <LatexEditor
          value={topic.description || ""}
          onChange={(value) => onTopicField(topicIndex, "description", value)}
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
                Tasks ({topic.tasks.length})
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => onAddTask(topicIndex)}
              >
                Add task
              </Button>
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
                        Task {taskIndex + 1}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label="Points"
                          type="number"
                          value={task.points ?? 0}
                          onChange={(e) =>
                            onTaskField(
                              topicIndex,
                              taskIndex,
                              "points",
                              Number(e.target.value || 0),
                            )
                          }
                          sx={{ width: 100 }}
                          size="small"
                        />
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => onRemoveTask(topicIndex, taskIndex)}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      Question
                    </Typography>
                    <LatexEditor
                      value={task.question || ""}
                      onChange={(value) =>
                        onTaskField(topicIndex, taskIndex, "question", value)
                      }
                      height={160}
                    />

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1.5, mb: 0.5 }}
                    >
                      Solution
                    </Typography>
                    <LatexEditor
                      value={task.solution || ""}
                      onChange={(value) =>
                        onTaskField(topicIndex, taskIndex, "solution", value)
                      }
                      height={120}
                    />
                  </CardContent>
                </Card>
              ))}
            </Stack>
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
                Tasks (0)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => onAddTask(topicIndex)}
              >
                Add task
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
