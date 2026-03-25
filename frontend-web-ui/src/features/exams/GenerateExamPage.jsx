// GenerateExamPage.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Autocomplete,
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Divider,
  Stack,
  Chip,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import BuildIcon from "@mui/icons-material/Build";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";

import { PageHeader, PdfPreviewPanel } from "../../components/ui";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { usePdfPreview } from "../../hooks/usePdfPreview";
import { TopicCard, CoverPagePreviewDialog } from "./components";
import { useCourses } from "../courses";
import { useTopics } from "../topics";
import {
  useCreateExam,
  useExam,
  useGenerateDraft,
  useRegenerateDraftTopic,
  useUpdateExam,
} from "./hooks";
import { examsApi } from "../../api/exams.api";
import { useTranslation } from "react-i18next";
import {
  getCompileResultPayload,
  notifyCompileOutcome,
  toCompilerMessages,
} from "../../utils/compileDiagnostics";

const SOLUTION_SPACE_OPTIONS = ["1 Page", "2 Pages", "3 Pages", "4 Pages"];

const DEFAULT_SOLUTION_SPACE = "1 Page";
const DEFAULT_SPLIT_PERCENT = 65;
const COLLAPSE_THRESHOLD_PERCENT = 10;

function sumPoints(topics) {
  return (topics || []).reduce((acc, topic) => {
    const tasks = topic?.tasks || [];
    if (tasks.length > 0) {
      const taskPoints = tasks.reduce(
        (taskAcc, task) => taskAcc + Number(task?.points || 0),
        0,
      );
      return acc + taskPoints;
    }
    return acc + Number(topic?.points || 0);
  }, 0);
}

function withSolutionSpace(topics = []) {
  return (topics || []).map((topic) => ({
    ...topic,
    tasks: (topic?.tasks || []).map((task) => ({
      ...task,
      solutionSpace: SOLUTION_SPACE_OPTIONS.includes(task?.solutionSpace)
        ? task.solutionSpace
        : DEFAULT_SOLUTION_SPACE,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Compile Split Button  (Build ▾  →  dropdown with Student / Teacher)
// ---------------------------------------------------------------------------
function CompileButton({ disabled, onCompile }) {
  const { t } = useTranslation();
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
        {t("common.compile")}
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
            primary={t("exams.studentVersion")}
            secondary={t("exams.studentVersionHint")}
            primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            secondaryTypographyProps={{ fontSize: 12 }}
          />
        </MenuItem>

        <MenuItem onClick={() => handleSelect("TEACHER")} sx={{ py: 1.25 }}>
          <ListItemIcon>
            <MenuBookIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText
            primary={t("exams.teacherVersion")}
            secondary={t("exams.teacherVersionHint")}
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
  const { t } = useTranslation();
  const theme = useTheme();
  const nav = useNavigate();
  const { id: examId } = useParams(); // present only in edit mode (/exams/:id/edit)
  const isEditMode = Boolean(examId);

  const { data: coursesData } = useCourses({ page: 1, limit: 200 });
  const courses = useMemo(
    () => coursesData?.data || coursesData || [],
    [coursesData],
  );

  const [courseId, setCourseId] = useState("");
  const [targetPoints, setTargetPoints] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const { pdfUrl, setPdfFromBase64, clearPdf, downloadPdf } =
    usePdfPreview("exam.pdf");
  const {
    pdfUrl: coverPdfUrl,
    setPdfFromBase64: setCoverPdfFromBase64,
    clearPdf: clearCoverPdf,
  } = usePdfPreview("cover-page.pdf");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledVersion, setCompiledVersion] = useState(null);
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [coverPageDraft, setCoverPageDraft] = useState("");
  const [isCoverCompiling, setIsCoverCompiling] = useState(false);
  const [coverCompileDiagnostics, setCoverCompileDiagnostics] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [compileDiagnostics, setCompileDiagnostics] = useState(null);
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null, // "cancel" or "reset"
  });
  const splitContainerRef = useRef(null);
  const initialStateRef = useRef({
    courseId: "",
    targetPoints: "",
    selectedTopics: [],
    draft: null,
  });

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
    initialStateRef.current = {
      courseId: resolvedCourseId || "",
      targetPoints: exam.targetPoints ?? exam.points ?? 0,
      selectedTopics: topicNames,
      draft: {
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
      },
    };
    setIsEditable(true);
  }, [examData]);

  useEffect(() => {
    if (!isEditMode) {
      initialStateRef.current = {
        courseId: "",
        targetPoints: "",
        selectedTopics: [],
        draft: null,
      };
      setIsEditable(true);
    }
  }, [isEditMode]);

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
  const updateM = useUpdateExam();

  const courseLabel = useMemo(() => {
    const courseFromDraft = draft?.course;
    if (courseFromDraft?.title || courseFromDraft?.shortName) {
      return `${courseFromDraft.title || ""}${courseFromDraft.shortName ? ` (${courseFromDraft.shortName})` : ""}`;
    }

    const matchedCourse = courses.find((c) => c.id === courseId);
    if (matchedCourse) {
      return `${matchedCourse.title} (${matchedCourse.shortName})`;
    }

    if (examData) {
      const exam = examData.data ?? examData;
      const course = exam.courseId;
      if (typeof course === "object" && course) {
        return `${course.title || ""}${course.shortName ? ` (${course.shortName})` : ""}`;
      }
    }

    return courseId || "";
  }, [draft, courses, courseId, examData]);

  const handleCourseChange = (e) => {
    setCourseId(e.target.value);
    setSelectedTopics([]);
    setDraft(null);
  };

  const handleTargetPointsChange = (e) => {
    const nextRawValue = e.target.value;
    const nextTarget = nextRawValue === "" ? "" : Number(nextRawValue);
    setTargetPoints(nextTarget);

    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.targetPoints = Number(nextTarget || 0);
      return recalcDraftTotals(next);
    });
  };

  // version: "STUDENT" | "TEACHER"
  const compileDraft = async (version) => {
    if (!draft) return;
    clearPdf();
    setCompileDiagnostics(null);

    setIsCompiling(true);
    setCompiledVersion(version);
    try {
      const res = await examsApi.compileDraft({
        course: draft.course,
        coverPage: draft.course?.coverPage || "",
        topics: draft.topics,
        version,
      });

      const { pdfBase64, filename, contentType, diagnostics } =
        getCompileResultPayload(res);

      setPdfFromBase64({
        base64: pdfBase64,
        filename,
        mimeType: contentType || "application/pdf",
      });

      setCompileDiagnostics(toCompilerMessages(diagnostics));
      notifyCompileOutcome(diagnostics);
    } finally {
      setIsCompiling(false);
    }
  };

  const openCoverPageDialog = () => {
    setCoverPageDraft(draft?.course?.coverPage || "");
    clearCoverPdf();
    setCoverCompileDiagnostics(null);
    setIsCoverDialogOpen(true);
  };

  const closeCoverPageDialog = () => {
    setIsCoverDialogOpen(false);
  };

  const compileCoverPage = async () => {
    if (!draft?.course) return;

    clearCoverPdf();
    setCoverCompileDiagnostics(null);
    setIsCoverCompiling(true);

    try {
      const res = await examsApi.compileDraft({
        course: {
          ...draft.course,
          coverPage: coverPageDraft,
        },
        coverPage: coverPageDraft,
        topics: [],
        version: "STUDENT",
      });

      const { pdfBase64, filename, contentType, diagnostics } =
        getCompileResultPayload(res);

      setCoverPdfFromBase64({
        base64: pdfBase64,
        filename,
        mimeType: contentType || "application/pdf",
      });

      setCoverCompileDiagnostics(toCompilerMessages(diagnostics));
      notifyCompileOutcome(diagnostics);
    } finally {
      setIsCoverCompiling(false);
    }
  };

  const saveCoverPage = async () => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        course: {
          ...(prev.course || {}),
          coverPage: coverPageDraft,
        },
      };
    });

    setIsCoverDialogOpen(false);
  };

  const recalcDraftTotals = (nextDraft) => {
    const total = sumPoints(nextDraft.topics);
    nextDraft.totalPoints = total;
    nextDraft.diff = Number(nextDraft.targetPoints || 0) - total;
    return nextDraft;
  };

  const syncTopicPointsFromTasks = (nextDraft, topicIndex) => {
    const tasks = nextDraft.topics?.[topicIndex]?.tasks || [];
    if (tasks.length === 0) {
      return nextDraft;
    }

    nextDraft.topics[topicIndex].points = tasks.reduce(
      (acc, task) => acc + Number(task?.points || 0),
      0,
    );
    return nextDraft;
  };

  const generateDraft = async () => {
    if (!courseId || selectedTopics.length === 0 || Number(targetPoints) <= 0)
      return;
    // Clear previous content immediately so the UI shows empty states while loading
    setDraft(null);
    clearPdf();
    setCompiledVersion(null);
    setCompileDiagnostics(null);
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
      syncTopicPointsFromTasks(next, topicIndex);
      return recalcDraftTotals(next);
    });
  };

  const addTask = (topicIndex) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.topics[topicIndex].tasks = next.topics[topicIndex].tasks || [];
      next.topics[topicIndex].tasks.push({
        question: "",
        solution: "",
        solutionSpace: DEFAULT_SOLUTION_SPACE,
        points: 0,
      });
      syncTopicPointsFromTasks(next, topicIndex);
      return recalcDraftTotals(next);
    });
  };

  const removeTask = (topicIndex, taskIndex) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.topics[topicIndex].tasks = next.topics[topicIndex].tasks || [];
      next.topics[topicIndex].tasks.splice(taskIndex, 1);
      syncTopicPointsFromTasks(next, topicIndex);
      return recalcDraftTotals(next);
    });
  };

  const regenerateTopic = async (topicName) => {
    if (!draft) return;
    setCompileDiagnostics(null);
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
    const body = {
      courseId: draft.course?.id || courseId,
      targetPoints: Number(draft.targetPoints),
      topics: withSolutionSpace(draft.topics),
    };

    if (isEditMode) {
      await updateM.mutateAsync({ id: examId, body });
      return;
    }

    await saveM.mutateAsync(body);
    nav("/exams/list");
  };

  const hasUnsavedChanges = () => {
    const snapshot = initialStateRef.current;
    return (
      courseId !== snapshot.courseId ||
      targetPoints !== snapshot.targetPoints ||
      JSON.stringify(selectedTopics) !==
        JSON.stringify(snapshot.selectedTopics) ||
      JSON.stringify(draft) !== JSON.stringify(snapshot.draft)
    );
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setConfirmDialog({ open: true, action: "cancel" });
    } else {
      nav("/exams/list");
    }
  };

  const handleResetClick = () => {
    resetExamForm();
  };

  const handleConfirmDialogConfirm = () => {
    const action = confirmDialog.action;
    setConfirmDialog({ open: false, action: null });

    if (action === "cancel") {
      nav("/exams/list");
    }
  };

  const handleConfirmDialogCancel = () => {
    setConfirmDialog({ open: false, action: null });
  };

  const resetExamForm = () => {
    const snapshot = initialStateRef.current;
    setCourseId(snapshot.courseId || "");
    setTargetPoints(snapshot.targetPoints ?? "");
    setSelectedTopics(snapshot.selectedTopics || []);
    setDraft(snapshot.draft ? structuredClone(snapshot.draft) : null);
    setCompileDiagnostics(null);
    clearPdf();
    setCompiledVersion(null);
    setIsEditable(true);
  };

  const resetSplitLayout = () => {
    setCollapsedPane(null);
    setSplitPercent(DEFAULT_SPLIT_PERCENT);
  };

  const startSplitDrag = (event) => {
    if (collapsedPane) return;
    event.preventDefault();
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (event) => {
      const container = splitContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;

      if (nextPercent <= COLLAPSE_THRESHOLD_PERCENT) {
        setCollapsedPane("left");
        setSplitPercent(DEFAULT_SPLIT_PERCENT);
        setIsDraggingSplit(false);
        return;
      }

      if (nextPercent >= 100 - COLLAPSE_THRESHOLD_PERCENT) {
        setCollapsedPane("right");
        setSplitPercent(DEFAULT_SPLIT_PERCENT);
        setIsDraggingSplit(false);
        return;
      }

      const clampedPercent = Math.max(
        COLLAPSE_THRESHOLD_PERCENT,
        Math.min(100 - COLLAPSE_THRESHOLD_PERCENT, nextPercent),
      );
      setCollapsedPane(null);
      setSplitPercent(clampedPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDraggingSplit]);

  const diffColor = !draft
    ? "text.secondary"
    : draft.diff === 0
      ? "success.main"
      : draft.diff > 0
        ? "warning.main"
        : "error.main";

  const leftPanelWidth =
    collapsedPane === "right" ? "100%" : `${splitPercent}%`;
  const rightPanelWidth =
    collapsedPane === "left" ? "100%" : `${100 - splitPercent}%`;

  return (
    <Box
      sx={{
        height: "95vh",
        display: "flex",
        flexDirection: "column",
        pb: 1,
        overflow: "hidden",
      }}
    >
      {/* ── Page header ── */}
      <PageHeader
        title={isEditMode ? t("exams.editTitle") : t("exams.createTitle")}
        right={
          <Stack direction="row" spacing={1}>
            {!isEditMode ? (
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                size="small"
                onClick={handleResetClick}
              >
                {t("common.reset")}
              </Button>
            ) : null}
            <Button variant="outlined" size="small" onClick={handleCancelClick}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              size="small"
              onClick={saveExam}
              disabled={
                !draft || saveM.isPending || updateM.isPending || !isEditable
              }
            >
              {t("common.save")}
            </Button>
          </Stack>
        }
      />

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
            {t("exams.loadingExam")}
          </Typography>
        </Box>
      ) : (
        <>
          {/* ── Controls panel ── */}
          <Paper
            sx={{
              px: 2.5,
              py: 1,
              flexShrink: 0,
              border: `1px solid ${theme.palette.divider}`,
              mb: 1,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2} alignItems="center">
                {isControlsCollapsed &&
                  (draft ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("common.target")}:{" "}
                        <Box
                          component="span"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {draft.targetPoints}
                        </Box>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("common.total")}:{" "}
                        <Box
                          component="span"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {draft.totalPoints}
                        </Box>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("common.diff")}:{" "}
                        <Box
                          component="span"
                          fontWeight={700}
                          color={diffColor}
                        >
                          {draft.diff > 0 ? `+${draft.diff}` : draft.diff}
                        </Box>
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      {t("exams.selectAndGenerate")}
                    </Typography>
                  ))}
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1.5}>
                {isControlsCollapsed && (
                  <>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={generateDraft}
                        disabled={
                          !courseId ||
                          selectedTopics.length === 0 ||
                          Number(targetPoints) <= 0 ||
                          generateM.isPending ||
                          !isEditable
                        }
                      >
                        {t("exams.generate")}
                      </Button>
                    </Stack>
                  </>
                )}

                <IconButton
                  size="small"
                  onClick={() => setIsControlsCollapsed((prev) => !prev)}
                  aria-label={
                    isControlsCollapsed
                      ? t("exams.expandControls")
                      : t("exams.collapseControls")
                  }
                >
                  {isControlsCollapsed ? (
                    <ExpandMoreIcon />
                  ) : (
                    <ExpandLessIcon />
                  )}
                </IconButton>
              </Stack>
            </Stack>

            {!isControlsCollapsed && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "20% 10% 65%",
                  gap: 2,
                }}
              >
                <TextField
                  select
                  label={t("common.course")}
                  value={courseId}
                  onChange={handleCourseChange}
                  fullWidth
                  size="small"
                  disabled={isEditMode || !isEditable}
                >
                  <MenuItem value="">{t("common.selectCourse")}</MenuItem>
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.title} ({c.shortName})
                    </MenuItem>
                  ))}
                  {isEditMode &&
                    courseId &&
                    !courses.some((c) => c.id === courseId) && (
                      <MenuItem value={courseId}>{courseLabel}</MenuItem>
                    )}
                </TextField>

                <TextField
                  label={t("exams.totalPoints")}
                  type="number"
                  value={targetPoints}
                  onChange={handleTargetPointsChange}
                  fullWidth
                  size="small"
                  disabled={!isEditable}
                />

                <Autocomplete
                  multiple
                  options={topicNames}
                  value={selectedTopics}
                  onChange={(_, value) => setSelectedTopics(value)}
                  disabled={!courseId || !isEditable}
                  fullWidth
                  size="small"
                  filterSelectedOptions
                  sx={{
                    "& .MuiAutocomplete-inputRoot": {
                      flexWrap: "nowrap",
                      overflowX: "auto",
                      overflowY: "hidden",
                      minHeight: 40,
                    },
                    "& .MuiAutocomplete-tag": {
                      flexShrink: 0,
                    },
                    "& .MuiAutocomplete-input": {
                      minWidth: 80,
                    },
                  }}
                  slotProps={{
                    listbox: {
                      sx: {
                        maxHeight: 240,
                        overflowY: "auto",
                      },
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("exams.topics")}
                      placeholder={
                        courseId
                          ? t("common.selectTopics")
                          : t("common.selectCourseFirst")
                      }
                    />
                  )}
                />
              </Box>
            )}

            {!isControlsCollapsed && (
              <>
                <Divider sx={{ my: 2 }} />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {draft ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("common.target")}:{" "}
                        <Box
                          component="span"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {draft.targetPoints}
                        </Box>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("common.total")}:{" "}
                        <Box
                          component="span"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {draft.totalPoints}
                        </Box>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("common.diff")}:{" "}
                        <Box
                          component="span"
                          fontWeight={700}
                          color={diffColor}
                        >
                          {draft.diff > 0 ? `+${draft.diff}` : draft.diff}
                        </Box>
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      {t("exams.selectAndGenerate")}
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
                        generateM.isPending ||
                        !isEditable
                      }
                    >
                      {t("exams.generate")}
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}
          </Paper>

          {/* ── Two-column panels row ── */}
          <Box
            ref={splitContainerRef}
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              gap: 0,
              overflow: "hidden",
            }}
          >
            {/* Left: Exam panel */}
            {collapsedPane === "left" ? (
              <Box
                sx={{
                  width: 34,
                  flexShrink: 0,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  mr: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexDirection: "column",
                  py: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    paddingInline: 2,
                  }}
                >
                  {t("exams.exam")}
                </Typography>
                <Tooltip title={t("exams.expandExamPanel")}>
                  <IconButton size="small" onClick={resetSplitLayout}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Box
                sx={{
                  width: leftPanelWidth,
                  minWidth: 0,
                  height: "100%",
                  pr: collapsedPane === "right" ? 0 : 1,
                  boxSizing: "border-box",
                }}
              >
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
                      {t("exams.exam")}{" "}
                      {draft && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          ({draft.totalPoints} / {draft.targetPoints}{" "}
                          {t("exams.pts")})
                        </Typography>
                      )}
                    </Typography>

                    {/* Compile dropdown button */}
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={openCoverPageDialog}
                        disabled={!draft || !isEditable}
                      >
                        {t("exams.editCoverPage")}
                      </Button>

                      {isCompiling ? (
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          disabled
                          startIcon={
                            <CircularProgress size={14} color="inherit" />
                          }
                        >
                          {t("common.compiling")}
                        </Button>
                      ) : (
                        <CompileButton
                          disabled={!draft || !isEditable}
                          onCompile={compileDraft}
                        />
                      )}
                    </Stack>
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
                          {t("exams.noExamYet")}
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2} sx={{ pr: 0.5 }}>
                        {draft.topics.map((topic, i) => (
                          <TopicCard
                            key={`${topic.topic}-${i}`}
                            topic={topic}
                            topicIndex={i}
                            solutionSpaceOptions={SOLUTION_SPACE_OPTIONS}
                            editable={isEditable}
                            onTopicField={updateTopicField}
                            onTaskField={updateTaskField}
                            onAddTask={addTask}
                            onRemoveTask={removeTask}
                            onRegenerate={regenerateTopic}
                            regenPending={regenM.isPending}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </Box>
            )}

            {collapsedPane === null && (
              <Box
                onMouseDown={startSplitDrag}
                role="separator"
                aria-orientation="vertical"
                aria-label={t("exams.resizeAria")}
                sx={{
                  width: 10,
                  flexShrink: 0,
                  cursor: "col-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    width: 3,
                    height: 64,
                    borderRadius: 999,
                    bgcolor: isDraggingSplit
                      ? "primary.main"
                      : alpha(theme.palette.text.primary, 0.2),
                  }}
                />
                <Stack spacing={0.5} sx={{ ml: 0.5 }}>
                  <Tooltip title={t("exams.closeTasksPanel")}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCollapsedPane("left");
                        setSplitPercent(DEFAULT_SPLIT_PERCENT);
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("common.dragToResize")}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 0.25,
                        py: 0.2,
                        borderRadius: 1,
                        color: isDraggingSplit
                          ? "primary.main"
                          : "text.secondary",
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                  <Tooltip title={t("coverPageDialog.closePreview")}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCollapsedPane("right");
                        setSplitPercent(DEFAULT_SPLIT_PERCENT);
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            )}

            {/* Right: PDF Preview */}
            {collapsedPane === "right" ? (
              <Box
                sx={{
                  width: 34,
                  flexShrink: 0,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  ml: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexDirection: "column",
                  py: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Tooltip title={t("coverPageDialog.expandPreview")}>
                  <IconButton size="small" onClick={resetSplitLayout}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    writingMode: "vertical-rl",
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    paddingInline: 2,
                  }}
                >
                  {t("common.preview")}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  width: rightPanelWidth,
                  minWidth: 0,
                  height: "100%",
                  pl: collapsedPane === "left" ? 0 : 1,
                  boxSizing: "border-box",
                }}
              >
                <PdfPreviewPanel
                  pdfUrl={pdfUrl}
                  onDownload={downloadPdf}
                  isLoading={isCompiling}
                  compilerMessages={compileDiagnostics}
                  loadingText={t("exams.compilingVersion", {
                    version:
                      compiledVersion === "STUDENT"
                        ? t("exams.student")
                        : t("exams.teacher"),
                  })}
                  statusContent={
                    pdfUrl &&
                    !isCompiling &&
                    compiledVersion && (
                      <Chip
                        label={
                          compiledVersion === "STUDENT"
                            ? t("exams.student")
                            : t("exams.teacher")
                        }
                        size="small"
                        color={
                          compiledVersion === "STUDENT"
                            ? "primary"
                            : "secondary"
                        }
                        variant="outlined"
                        icon={
                          compiledVersion === "STUDENT" ? (
                            <SchoolIcon style={{ fontSize: 13 }} />
                          ) : (
                            <MenuBookIcon style={{ fontSize: 13 }} />
                          )
                        }
                        sx={{
                          fontWeight: 600,
                          fontSize: 11,
                          paddingInline: "6px",
                        }}
                      />
                    )
                  }
                />
              </Box>
            )}
          </Box>
        </> // end of isEditMode && examLoading conditional
      )}

      {isCoverDialogOpen && (
        <CoverPagePreviewDialog
          open={isCoverDialogOpen}
          onClose={closeCoverPageDialog}
          coverPageValue={coverPageDraft}
          onCoverPageChange={setCoverPageDraft}
          onCompile={compileCoverPage}
          isCompiling={isCoverCompiling}
          pdfUrl={coverPdfUrl}
          compilerMessages={coverCompileDiagnostics}
          onSave={saveCoverPage}
          disableActions={!draft}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={t("exams.confirmCancelTitle")}
        message={t("exams.unsavedChangesMessage")}
        confirmText={t("exams.confirmYes")}
        onCancel={handleConfirmDialogCancel}
        onConfirm={handleConfirmDialogConfirm}
      />
    </Box>
  );
}
