// GenerateExamPage.jsx
import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Divider,
  Stack,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import BuildIcon from "@mui/icons-material/Build";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";

import { PageHeader } from "../../components/ui/PageHeader";
import { PdfPreviewPanel } from "../../components/ui/PdfPreviewPanel";
import { usePdfPreview } from "../../hooks/usePdfPreview";
import { TopicCard } from "./components/TopicCard";
import { useCourses } from "../courses/courses.hooks";
import { useTopics } from "../topics/topics.hooks";
import {
  useCreateExam,
  useExam,
  useGenerateDraft,
  useRegenerateDraftTopic,
} from "./exams.hooks";
import { examsApi } from "../../api/exams.api";

function sumPoints(topics) {
  return (topics || []).reduce((acc, t) => acc + Number(t.points || 0), 0);
}

// ---------------------------------------------------------------------------
// Compile Split Button  (Build ▾  →  dropdown with Student / Teacher)
// ---------------------------------------------------------------------------
function CompileButton({ disabled, onCompile }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (version) => {
    handleClose();
    onCompile(version);
  };

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        endIcon={<ArrowDropDownIcon />}
        startIcon={<BuildIcon />}
        disabled={disabled}
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Compile
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: { mt: 0.5, minWidth: 180, borderRadius: 2 },
          },
        }}
      >
        <MenuItem onClick={() => handleSelect("STUDENT")} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <SchoolIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Student Version"
            secondary="No solutions"
            primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            secondaryTypographyProps={{ fontSize: 12 }}
          />
        </MenuItem>

        <MenuItem onClick={() => handleSelect("TEACHER")} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <MenuBookIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText
            primary="Teacher Version"
            secondary="Includes solutions"
            primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            secondaryTypographyProps={{ fontSize: 12 }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export function GenerateExamPage() {
  const theme = useTheme();
  const { id: examId } = useParams(); // present only in edit mode (/exams/:id/edit)
  const isEditMode = Boolean(examId);

  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = coursesData?.data || coursesData || [];

  const [courseId, setCourseId] = useState("");
  const [targetPoints, setTargetPoints] = useState(0);
  const [topicPick, setTopicPick] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const { pdfUrl, setPdfFromBase64, clearPdf, downloadPdf } =
    usePdfPreview("exam.pdf");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledVersion, setCompiledVersion] = useState(null);
  const [draft, setDraft] = useState(null);

  // Fetch existing exam when in edit mode
  const { data: examData, isLoading: examLoading } = useExam(examId, {
    enabled: isEditMode,
  });

  // Hydrate form once exam data arrives
  useEffect(() => {
    if (!examData) return;
    const exam = examData.data ?? examData;

    const resolvedCourseId =
      typeof exam.courseId === "object" ? exam.courseId?.id : exam.courseId;

    setCourseId(resolvedCourseId || "");
    setTargetPoints(exam.targetPoints ?? exam.points ?? 0);

    const topicNames = (exam.topics || []).map((t) => t.topic);
    setSelectedTopics(topicNames);

    // Shape the exam into the same draft format GenerateExamPage uses
    setDraft({
      course:
        typeof exam.courseId === "object"
          ? exam.courseId
          : { id: resolvedCourseId },
      targetPoints: exam.targetPoints ?? exam.points ?? 0,
      totalPoints:
        exam.totalPoints ??
        (exam.topics || []).reduce((s, t) => s + Number(t.points || 0), 0),
      diff: 0,
      topics: exam.topics || [],
    });
  }, [examData]);

  const { data: topicsData } = useTopics({
    page: 1,
    limit: 500,
    courseId: courseId || undefined,
  });

  const topics = useMemo(() => topicsData?.data || [], [topicsData?.data]);
  const topicNames = useMemo(() => {
    const s = new Set();
    topics.forEach((t) => s.add(t.topic));
    return Array.from(s);
  }, [topics]);

  const generateM = useGenerateDraft();
  const regenM = useRegenerateDraftTopic();
  const saveM = useCreateExam();

  const handleCourseChange = (e) => {
    setCourseId(e.target.value);
    setSelectedTopics([]);
    setTopicPick("");
    setDraft(null);
  };

  // version: "STUDENT" | "TEACHER"
  const compileDraft = async (version) => {
    if (!draft) return;
    clearPdf();

    setIsCompiling(true);
    setCompiledVersion(version);
    try {
      const res = await examsApi.compileDraft({
        course: draft.course,
        coverPage: draft.course?.coverPage || "",
        topics: draft.topics,
        version,
      });

      const { pdfBase64, filename } = res.data;
      setPdfFromBase64({ base64: pdfBase64, filename });
    } finally {
      setIsCompiling(false);
    }
  };

  const addTopic = () => {
    const name = String(topicPick || "").trim();
    if (!name || selectedTopics.includes(name)) return;
    setSelectedTopics((prev) => [...prev, name]);
    setTopicPick("");
  };

  const removeTopic = (name) =>
    setSelectedTopics((prev) => prev.filter((x) => x !== name));

  const recalcDraftTotals = (nextDraft) => {
    const total = sumPoints(nextDraft.topics);
    nextDraft.totalPoints = total;
    nextDraft.diff = Number(nextDraft.targetPoints || 0) - total;
    return nextDraft;
  };

  const generateDraft = async () => {
    if (!courseId || selectedTopics.length === 0 || Number(targetPoints) <= 0)
      return;
    // Clear previous content immediately so the UI shows empty states while loading
    setDraft(null);
    clearPdf();
    setCompiledVersion(null);
    const res = await generateM.mutateAsync({
      courseId,
      topics: selectedTopics,
      targetPoints: Number(targetPoints),
    });
    setDraft(res.data);
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
    await saveM.mutateAsync({
      courseId: draft.course?.id || courseId,
      targetPoints: Number(draft.targetPoints),
      topics: draft.topics,
    });
  };

  const diffColor = !draft
    ? "text.secondary"
    : draft.diff === 0
      ? "success.main"
      : draft.diff > 0
        ? "warning.main"
        : "error.main";

  return (
    <Box
      sx={{
        height: "95vh",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflow: "hidden",
      }}
    >
      {/* ── Page header ── */}
      <Box sx={{ flexShrink: 0 }}>
        <PageHeader title={isEditMode ? "Edit Exam" : "Generate Exam"} />
      </Box>

      {/* Loading skeleton while fetching exam in edit mode */}
      {isEditMode && examLoading ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Loading exam…
          </Typography>
        </Box>
      ) : (
        <>
          {/* ── Controls panel (generate mode only) ── */}
          {!isEditMode && (
            <Paper
              sx={{
                p: 2.5,
                flexShrink: 0,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 2,
                }}
              >
                <TextField
                  select
                  label="Course"
                  value={courseId}
                  onChange={handleCourseChange}
                  fullWidth
                  size="small"
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
                  size="small"
                />

                <TextField
                  select
                  label="Add topic"
                  value={topicPick}
                  onChange={(e) => setTopicPick(e.target.value)}
                  fullWidth
                  size="small"
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
                  Add Topic
                </Button>
              </Box>

              {selectedTopics.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {selectedTopics.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        onDelete={() => removeTopic(t)}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Stack>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                {draft ? (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Target:{" "}
                      <Box
                        component="span"
                        fontWeight={700}
                        color="text.primary"
                      >
                        {draft.targetPoints}
                      </Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total:{" "}
                      <Box
                        component="span"
                        fontWeight={700}
                        color="text.primary"
                      >
                        {draft.totalPoints}
                      </Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Diff:{" "}
                      <Box component="span" fontWeight={700} color={diffColor}>
                        {draft.diff > 0 ? `+${draft.diff}` : draft.diff}
                      </Box>
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    Select a course, add topics and click Generate
                  </Typography>
                )}

                <Stack direction="row" spacing={1}>
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
                    variant="outlined"
                    color="secondary"
                    startIcon={<SaveIcon />}
                    onClick={saveExam}
                    disabled={!draft || saveM.isPending}
                  >
                    Save
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* ── Two-column panels row ── */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 2,
              overflow: "hidden",
            }}
          >
            {/* Left: Exam panel */}
            <Paper
              sx={{
                p: 2.5,
                height: "100%",
                boxSizing: "border-box",
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ flexShrink: 0, mb: 2 }}
              >
                <Typography variant="h6">
                  Exam{" "}
                  {draft && !isEditMode && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                    >
                      ({draft.totalPoints} / {draft.targetPoints} pts)
                    </Typography>
                  )}
                </Typography>

                {/* Compile dropdown button */}
                {isCompiling ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    disabled
                    startIcon={<CircularProgress size={14} color="inherit" />}
                  >
                    Compiling…
                  </Button>
                ) : (
                  <CompileButton disabled={!draft} onCompile={compileDraft} />
                )}
              </Stack>

              <Divider sx={{ flexShrink: 0, mb: 2 }} />

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    borderRadius: 3,
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.4),
                  },
                }}
              >
                {!draft ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      border: `1px dashed ${theme.palette.divider}`,
                    }}
                  >
                    <Typography color="text.disabled" variant="body2">
                      No exam generated yet
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ pr: 0.5 }}>
                    {draft.topics.map((topic, i) => (
                      <TopicCard
                        key={`${topic.topic}-${i}`}
                        topic={topic}
                        topicIndex={i}
                        onTopicField={updateTopicField}
                        onTaskField={updateTaskField}
                        onRegenerate={regenerateTopic}
                        regenPending={regenM.isPending}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>

            {/* Right: PDF Preview */}
            <PdfPreviewPanel
              pdfUrl={pdfUrl}
              onDownload={downloadPdf}
              isLoading={isCompiling}
              loadingText={`Compiling ${compiledVersion === "STUDENT" ? "Student" : "Teacher"} version…`}
              statusContent={
                pdfUrl &&
                !isCompiling &&
                compiledVersion && (
                  <Chip
                    label={
                      compiledVersion === "STUDENT" ? "Student" : "Teacher"
                    }
                    size="small"
                    color={
                      compiledVersion === "STUDENT" ? "primary" : "secondary"
                    }
                    variant="outlined"
                    icon={
                      compiledVersion === "STUDENT" ? (
                        <SchoolIcon style={{ fontSize: 13 }} />
                      ) : (
                        <MenuBookIcon style={{ fontSize: 13 }} />
                      )
                    }
                    sx={{ fontWeight: 600, fontSize: 11, paddingInline: "6px" }}
                  />
                )
              }
            />
          </Box>
        </> // end of isEditMode && examLoading conditional
      )}
    </Box>
  );
}
