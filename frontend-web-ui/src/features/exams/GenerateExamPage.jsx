import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Divider,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";

import { PageHeader } from "../../components/ui/PageHeader";
import { useCourses } from "../courses/courses.hooks";
import { useTopics } from "../topics/topics.hooks";
import {
  useCreateExam,
  useGenerateDraft,
  useRegenerateDraftTopic,
} from "./exams.hooks";
import { LatexEditor } from "../../components/ui/LatexEditor";
import { examsApi } from "../../api/exams.api";

function sumPoints(topics) {
  return (topics || []).reduce((acc, t) => acc + Number(t.points || 0), 0);
}

export function GenerateExamPage() {
  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = coursesData?.data || [];

  const [courseId, setCourseId] = useState("");
  const [targetPoints, setTargetPoints] = useState(0);

  const [topicPick, setTopicPick] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);

  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFilename, setPdfFilename] = useState("exam.pdf");

  const { data: topicsData } = useTopics({
    page: 1,
    limit: 500,
    courseId: courseId || undefined,
  });

  const topics = topicsData?.data || [];
  const topicNames = useMemo(() => {
    // show unique topic names, because there can be multiple variants
    const s = new Set();
    topics.forEach((t) => s.add(t.topic));
    return Array.from(s);
  }, [topics]);

  const generateM = useGenerateDraft();
  const regenM = useRegenerateDraftTopic();
  const saveM = useCreateExam();

  // Draft is fully editable and only stored client-side until Save
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTopics([]);
    setTopicPick("");
    setDraft(null);
  }, [courseId]);

  const compileDraft = async () => {
    if (!draft) return;

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const blob = await examsApi.compileDraft({
      course: draft.course,
      coverPage: draft.course?.coverPage || "",
      topics: draft.topics,
    });

    // Try to get filename from headers later if you want.
    setPdfFilename("exam.pdf");

    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const addTopic = () => {
    const name = String(topicPick || "").trim();
    if (!name) return;
    if (selectedTopics.includes(name)) return;
    setSelectedTopics((prev) => [...prev, name]);
    setTopicPick("");
  };

  const removeTopic = (name) =>
    setSelectedTopics((prev) => prev.filter((x) => x !== name));

  const generateDraft = async () => {
    if (!courseId) return;
    if (selectedTopics.length === 0) return;
    if (!Number.isFinite(Number(targetPoints)) || Number(targetPoints) <= 0)
      return;

    const res = await generateM.mutateAsync({
      courseId,
      topics: selectedTopics,
      targetPoints: Number(targetPoints),
    });

    setDraft(res.data);
  };

  const recalcDraftTotals = (nextDraft) => {
    const total = sumPoints(nextDraft.topics);
    nextDraft.totalPoints = total;
    nextDraft.diff = Number(nextDraft.targetPoints || 0) - total;
    return nextDraft;
  };

  const updateTopicField = (topicIndex, field, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.topics[topicIndex][field] = value;
      return recalcDraftTotals(next);
    });
  };

  const updateTaskField = (topicIndex, taskIndex, field, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.topics[topicIndex].tasks[taskIndex][field] = value;
      return next;
    });
  };

  const regenerateTopic = async (topicName) => {
    if (!draft) return;

    const res = await regenM.mutateAsync({
      courseId,
      topicName,
      targetPoints: Number(draft.targetPoints),
      currentDraftTopics: draft.topics,
    });

    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.topics = res.data.topics;
      next.totalPoints = res.data.totalPoints;
      next.diff = res.data.diff;
      return next;
    });
  };

  const saveExam = async () => {
    if (!draft) return;

    const payload = {
      courseId: draft.course?.id || courseId,
      targetPoints: Number(draft.targetPoints),
      topics: draft.topics,
    };

    await saveM.mutateAsync(payload);
    // optional: after save, clear draft or navigate to exams list
    // setDraft(null);
  };

  return (
    <>
      <PageHeader title="Generate Exam" />

      {/* Top controls like mock */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TextField
            select
            label="Course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">Select course</MenuItem>
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.title} ({c.shortName})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Total points"
            type="number"
            value={targetPoints}
            onChange={(e) => setTargetPoints(Number(e.target.value || 0))}
            fullWidth
          />

          <TextField
            select
            label="Topics"
            value={topicPick}
            onChange={(e) => setTopicPick(e.target.value)}
            fullWidth
            disabled={!courseId}
          >
            <MenuItem value="">Select topic</MenuItem>
            {topicNames.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addTopic}
            disabled={!courseId || !topicPick}
            fullWidth
          >
            Add
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box className="flex flex-wrap gap-2">
          {selectedTopics.map((t) => (
            <Button
              key={t}
              variant="outlined"
              color="secondary"
              onClick={() => removeTopic(t)}
            >
              {t} (remove)
            </Button>
          ))}
        </Box>

        <Box className="flex gap-2 mt-3 justify-end">
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={generateDraft}
            disabled={
              !courseId ||
              selectedTopics.length === 0 ||
              Number(targetPoints) <= 0 ||
              generateM.isPending
            }
          >
            Generate
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveExam}
            disabled={!draft || saveM.isPending}
            color="secondary"
          >
            Save
          </Button>
        </Box>

        {draft ? (
          <Box className="mt-3">
            <Typography sx={{ fontWeight: 700 }}>
              Target: {draft.targetPoints} | Total: {draft.totalPoints} | Diff:{" "}
              {draft.diff}
            </Typography>
          </Box>
        ) : null}
      </Paper>

      {/* Two columns like mock */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Editable generated exam */}
        <Paper sx={{ p: 2, minHeight: 520 }}>
          <Box className="flex items-center justify-between">
            <Typography variant="h6">
              Exam{" "}
              {draft
                ? `(Total: ${draft.totalPoints}, Target: ${draft.targetPoints})`
                : ""}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={!draft}
              onClick={compileDraft}
            >
              Compile
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {!draft ? (
            <Typography sx={{ opacity: 0.8 }}>
              Select a course, enter total points, add topics, then click
              Generate.
            </Typography>
          ) : (
            <Box className="flex flex-col gap-2">
              {draft.topics.map((topic, i) => (
                <Card
                  key={`${topic.topic}-${i}`}
                  variant="outlined"
                  sx={{ borderRadius: 1 }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography sx={{ fontWeight: 800 }}>
                        {topic.topic}
                      </Typography>
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        onClick={() => regenerateTopic(topic.topic)}
                        disabled={regenM.isPending}
                      >
                        Regenerate
                      </Button>
                    </Stack>

                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {/* <TextField
                        label="Topic"
                        value={topic.topic || ""}
                        onChange={(e) =>
                          updateTopicField(i, "topic", e.target.value)
                        }
                        fullWidth
                        sx={grayFieldSx}
                      /> */}
                      <LatexEditor
                        value={topic.topic || ""}
                        onChange={(e) =>
                          updateTopicField(i, "topic", e.target.value)
                        }
                        height={320}
                      />

                      <TextField
                        label="Points"
                        type="number"
                        value={topic.points ?? 0}
                        onChange={(e) =>
                          updateTopicField(
                            i,
                            "points",
                            Number(e.target.value || 0),
                          )
                        }
                        fullWidth
                        sx={grayFieldSx}
                      />
                    </Box>

                    <TextField
                      className="mt-3"
                      label="Description"
                      value={topic.description || ""}
                      onChange={(e) =>
                        updateTopicField(i, "description", e.target.value)
                      }
                      fullWidth
                      multiline
                      minRows={3}
                      sx={grayFieldSx}
                    />

                    {(topic.tasks || []).length > 0 ? (
                      <Box className="mt-3">
                        <Typography sx={{ fontWeight: 700, mb: 1 }}>
                          Tasks
                        </Typography>

                        {(topic.tasks || []).map((task, ti) => (
                          <Card
                            key={`${i}-${ti}`}
                            variant="outlined"
                            sx={{ borderRadius: 1, mb: 1 }}
                          >
                            <CardContent>
                              <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <TextField
                                  label="Task points"
                                  type="number"
                                  value={task.points ?? 0}
                                  onChange={(e) =>
                                    updateTaskField(
                                      i,
                                      ti,
                                      "points",
                                      Number(e.target.value || 0),
                                    )
                                  }
                                  fullWidth
                                  sx={grayFieldSx}
                                />
                                {/* <TextField
                                  label="Related"
                                  value={String(task.isRelatedToTopic ?? true)}
                                  fullWidth
                                  disabled
                                  sx={grayFieldSx}
                                /> */}
                              </Box>

                              {/* <TextField
                                className="mt-3"
                                label="Question"
                                value={task.question || ""}
                                onChange={(e) =>
                                  updateTaskField(
                                    i,
                                    ti,
                                    "question",
                                    e.target.value,
                                  )
                                }
                                fullWidth
                                multiline
                                minRows={3}
                                sx={grayFieldSx}
                              /> */}
                              <LatexEditor
                                value={task.question || ""}
                                onChange={(e) =>
                                  updateTaskField(
                                    i,
                                    ti,
                                    "question",
                                    e.target.value,
                                  )
                                }
                                height={320}
                              />

                              {/* <TextField
                                className="mt-3"
                                label="Solution"
                                value={task.solution || ""}
                                onChange={(e) =>
                                  updateTaskField(
                                    i,
                                    ti,
                                    "solution",
                                    e.target.value,
                                  )
                                }
                                fullWidth
                                multiline
                                minRows={2}
                                sx={grayFieldSx}
                              /> */}

                              <LatexEditor
                                value={task.solution || ""}
                                onChange={(e) =>
                                  updateTaskField(
                                    i,
                                    ti,
                                    "solution",
                                    e.target.value,
                                  )
                                }
                                height={320}
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>

        {/* Right: Preview placeholder */}
        <Paper sx={{ p: 2, minHeight: 520 }}>
          <Box className="flex items-center justify-between">
            <Typography variant="h6">Preview</Typography>
            <Button
              variant="contained"
              color="secondary"
              disabled={!pdfUrl}
              onClick={downloadPdf}
            >
              Download
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ height: 440 }} className="flex items-center justify-center">
            {pdfUrl ? (
              <iframe
                title="PDF Preview"
                src={pdfUrl}
                className="w-full h-full"
              />
            ) : (
              <Typography sx={{ opacity: 0.7 }}>Pdf Preview</Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </>
  );
}
