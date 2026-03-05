// GenerateExamPage.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  Chip,
  useTheme,
  alpha,
  Tooltip,
  IconButton,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import BuildIcon from "@mui/icons-material/Build";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";

import { PageHeader } from "../../components/ui/PageHeader";
import { useCourses } from "../courses/courses.hooks";
import { useTopics } from "../topics/topics.hooks";
import {
  useCreateExam,
  useExam,
  useGenerateDraft,
  useRegenerateDraftTopic,
} from "./exams.hooks";
import { LatexEditor } from "../../components/ui/LatexEditor";
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
// PDF Preview Panel
// ---------------------------------------------------------------------------
function PdfPreviewPanel({
  pdfUrl,
  onDownload,
  isCompiling,
  compilingVersion,
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef(null);

  return (
    <Paper
      ref={panelRef}
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
        ...(expanded && {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100vh",
          zIndex: theme.zIndex.modal,
        }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" color="text.primary">
            Preview
          </Typography>
          {pdfUrl && !isCompiling && compilingVersion && (
            <Chip
              label={compilingVersion === "STUDENT" ? "Student" : "Teacher"}
              size="small"
              color={compilingVersion === "STUDENT" ? "primary" : "secondary"}
              variant="outlined"
              icon={
                compilingVersion === "STUDENT" ? (
                  <SchoolIcon style={{ fontSize: 13 }} />
                ) : (
                  <MenuBookIcon style={{ fontSize: 13 }} />
                )
              }
              sx={{ fontWeight: 600, fontSize: 11, paddingInline: "6px" }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={!pdfUrl || isCompiling}
            onClick={onDownload}
          >
            Download
          </Button>
          <Tooltip title={expanded ? "Collapse" : "Expand"}>
            <IconButton size="small" onClick={() => setExpanded((p) => !p)}>
              {expanded ? (
                <CloseFullscreenIcon fontSize="small" />
              ) : (
                <OpenInFullIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.5, flexShrink: 0 }} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px dashed ${theme.palette.divider}`,
        }}
      >
        {isCompiling ? (
          <Stack alignItems="center" spacing={2}>
            <CircularProgress
              size={48}
              thickness={3}
              sx={{ color: "primary.main" }}
            />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Compiling {compilingVersion === "STUDENT" ? "Student" : "Teacher"}{" "}
              version…
            </Typography>
          </Stack>
        ) : pdfUrl ? (
          <iframe
            title="PDF Preview"
            src={pdfUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ opacity: 0.45 }}>
            <BuildIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Compile to see the PDF preview
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Topic Card
// ---------------------------------------------------------------------------
function TopicCard({
  topic,
  topicIndex,
  onTopicField,
  onTaskField,
  onRegenerate,
  regenPending,
  theme,
}) {
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
          <LatexEditor
            value={topic.topic || ""}
            onChange={(v) => onTopicField(topicIndex, "topic", v)}
            height={200}
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

        <TextField
          label="Description"
          value={topic.description || ""}
          onChange={(e) =>
            onTopicField(topicIndex, "description", e.target.value)
          }
          fullWidth
          multiline
          minRows={2}
          size="small"
          sx={{ mb: 2 }}
        />

        {(topic.tasks || []).length > 0 && (
          <Box>
            <Typography
              variant="body2"
              fontWeight={700}
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Tasks ({topic.tasks.length})
            </Typography>
            <Stack spacing={1.5}>
              {(topic.tasks || []).map((task, ti) => (
                <Card
                  key={`${topicIndex}-${ti}`}
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
                        Task {ti + 1}
                      </Typography>
                      <TextField
                        label="Points"
                        type="number"
                        value={task.points ?? 0}
                        onChange={(e) =>
                          onTaskField(
                            topicIndex,
                            ti,
                            "points",
                            Number(e.target.value || 0),
                          )
                        }
                        sx={{ width: 100 }}
                        size="small"
                      />
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
                      onChange={(v) =>
                        onTaskField(topicIndex, ti, "question", v)
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
                      onChange={(v) =>
                        onTaskField(topicIndex, ti, "solution", v)
                      }
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
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFilename, setPdfFilename] = useState("exam.pdf");
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

  const topics = topicsData?.data || [];
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
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

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
      setPdfFilename(filename || "exam.pdf");

      const binary = atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    } finally {
      setIsCompiling(false);
    }
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
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
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
                        theme={theme}
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
              isCompiling={isCompiling}
              compilingVersion={compiledVersion}
            />
          </Box>
        </> // end of isEditMode && examLoading conditional
      )}
    </Box>
  );
}
