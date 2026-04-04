// GenerateExamPage.jsx
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
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
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
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
  useExamValidation,
  useGenerateDraft,
  useRegenerateDraftTopic,
  useUpdateExam,
} from "./hooks";
import { examsApi } from "../../api/exams.api";
import { coursesApi } from "../../api/courses.api";
import { useTranslation } from "react-i18next";
import {
  getCompileResultPayload,
  notifyCompileOutcome,
  toCompilerMessages,
} from "../../utils/compileDiagnostics";

const SOLUTION_SPACE_OPTIONS = ["1 Page", "2 Pages", "3 Pages", "4 Pages"];
const SEMESTER_OPTIONS = ["SoSe", "WiSe"];

const DEFAULT_SOLUTION_SPACE = "1 Page";
const DEFAULT_SPLIT_PERCENT = 65;
const COLLAPSE_THRESHOLD_PERCENT = 10;

function parseSemesterStartYear(rawYear) {
  const value = String(rawYear || "").trim();
  const match = value.match(/^(\d{4})/);
  return match ? match[1] : "";
}

function parseSemesterValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return { year: "", semesterType: "" };

  const match = value.match(/^(.*)\s+(SoSe|WiSe)$/);
  if (!match) {
    return { year: value, semesterType: "" };
  }

  return {
    year: String(match[1] || "").trim(),
    semesterType: match[2],
  };
}

function formatSemesterValue(year, semesterType) {
  const normalizedYear = parseSemesterStartYear(year);
  const normalizedType = String(semesterType || "").trim();
  if (!normalizedYear || !normalizedType) return "";
  if (normalizedType === "WiSe") {
    const nextShortYear = String((Number(normalizedYear) + 1) % 100).padStart(
      2,
      "0",
    );
    return `${normalizedYear}/${nextShortYear} ${normalizedType}`;
  }
  return `${normalizedYear} ${normalizedType}`;
}

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

function normalizeDraftTopicVariant(topic) {
  return {
    ...topic,
    topicId: topic?.topicId || topic?.id || "",
    tasks: (topic?.tasks || []).map((task) => ({
      ...task,
      solutionSpace: SOLUTION_SPACE_OPTIONS.includes(task?.solutionSpace)
        ? task.solutionSpace
        : DEFAULT_SOLUTION_SPACE,
    })),
  };
}

function groupDraftTopicsForUi(topics = []) {
  const groups = [];
  const byName = new Map();

  (topics || []).forEach((topic, flatIndex) => {
    const topicName = String(topic?.topic || "").trim() || `topic-${flatIndex}`;
    if (!byName.has(topicName)) {
      const group = {
        topicName,
        flatIndices: [],
        variants: [],
      };
      byName.set(topicName, group);
      groups.push(group);
    }

    const group = byName.get(topicName);
    group.flatIndices.push(flatIndex);
    group.variants.push(topic);
  });

  return groups.map((group) => ({
    ...group,
    totalPoints: group.variants.reduce(
      (sum, variant) => sum + Number(variant?.points || 0),
      0,
    ),
  }));
}

function shuffleItems(items = []) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildTopicVariantKey(topic) {
  const explicitId = String(topic?.topicId || topic?.id || "").trim();
  if (explicitId) return explicitId;

  return JSON.stringify({
    topic: String(topic?.topic || "").trim(),
    description: String(topic?.description || "").trim(),
    points: Number(topic?.points || 0),
    full_tex_code: String(topic?.full_tex_code || "").trim(),
    tasks: Array.isArray(topic?.tasks)
      ? topic.tasks.map((task) => ({
          description: String(task?.description || "").trim(),
          question: String(task?.question || "").trim(),
          solution: String(task?.solution || "").trim(),
          points: Number(task?.points || 0),
        }))
      : [],
  });
}

function uniqueTopicVariants(items = []) {
  const seen = new Set();
  return (items || []).filter((topic) => {
    const key = buildTopicVariantKey(topic);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const dropdownPaperBg =
    theme.palette.mode === "light"
      ? theme.palette.grey[50]
      : theme.palette.grey[900];
  const dropdownPaperColor = theme.palette.getContrastText(dropdownPaperBg);
  const dropdownHoverBg = alpha(
    theme.palette.primary.main,
    theme.palette.action.hoverOpacity + 0.1,
  );
  const dropdownSelectedBg = alpha(
    theme.palette.primary.main,
    theme.palette.action.selectedOpacity + 0.16,
  );

  const [courseQuery, setCourseQuery] = useState("");
  const [debouncedCourseQuery, setDebouncedCourseQuery] = useState("");
  const [topicQuery, setTopicQuery] = useState("");
  const [debouncedTopicQuery, setDebouncedTopicQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedCourseQuery(courseQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [courseQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedTopicQuery(topicQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [topicQuery]);

  const { data: coursesData, isFetching: isCoursesLoading } = useCourses({
    page: 1,
    limit: 20,
    q: debouncedCourseQuery || undefined,
  });
  const courses = useMemo(
    () => coursesData?.data || coursesData || [],
    [coursesData],
  );

  const [courseId, setCourseId] = useState("");
  const [semesterYear, setSemesterYear] = useState("");
  const [semesterType, setSemesterType] = useState("");
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
    action: null, // "cancel" or "navigate"
  });
  const splitContainerRef = useRef(null);
  const blockerRef = useRef(null);
  const blockedLocationRef = useRef(null);
  const isIntentionalNavigationRef = useRef(false);
  const initialStateRef = useRef({
    courseId: "",
    semesterYear: "",
    semesterType: "",
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
    const parsedSemester = parseSemesterValue(exam.semester);

    setCourseId(resolvedCourseId || "");
    setSemesterYear(parseSemesterStartYear(parsedSemester.year));
    setSemesterType(parsedSemester.semesterType || "");
    setTargetPoints(exam.targetPoints ?? exam.points ?? "");

    const topicNames = (exam.topics || []).map((t) => t.topic);
    setSelectedTopics(topicNames);

    // Shape the exam into the same draft format GenerateExamPage uses
    const normalizedTopics = withSolutionSpace(exam.topics || []).map(
      normalizeDraftTopicVariant,
    );
    setDraft({
      course:
        typeof exam.courseId === "object"
          ? exam.courseId
          : { id: resolvedCourseId },
      targetPoints: exam.targetPoints ?? exam.points ?? "",
      totalPoints:
        exam.totalPoints ??
        normalizedTopics.reduce((s, t) => s + Number(t.points || 0), 0),
      diff: 0,
      topics: normalizedTopics,
    });
    initialStateRef.current = {
      courseId: resolvedCourseId || "",
      semesterYear: parseSemesterStartYear(parsedSemester.year),
      semesterType: parsedSemester.semesterType || "",
      targetPoints: exam.targetPoints ?? exam.points ?? "",
      selectedTopics: topicNames,
      draft: {
        course:
          typeof exam.courseId === "object"
            ? exam.courseId
            : { id: resolvedCourseId },
        targetPoints: exam.targetPoints ?? exam.points ?? "",
        totalPoints:
          exam.totalPoints ??
          normalizedTopics.reduce((s, t) => s + Number(t.points || 0), 0),
        diff: 0,
        topics: normalizedTopics,
      },
    };
    setIsEditable(true);
  }, [examData]);

  useEffect(() => {
    if (!isEditMode) {
      initialStateRef.current = {
        courseId: "",
        semesterYear: "",
        semesterType: "",
        targetPoints: "",
        selectedTopics: [],
        draft: null,
      };
      setIsEditable(true);
    }
  }, [isEditMode]);

  const { data: topicsData, isFetching: isTopicsLoading } = useTopics({
    page: 1,
    limit: 20,
    courseId: courseId || undefined,
    q: debouncedTopicQuery || undefined,
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
  const examValidation = useExamValidation(draft);
  const hasPointsValidationError = Boolean(draft) && examValidation.hasErrors;
  const mismatchedTopicNames = examValidation.invalidTopics || [];

  const topicValidationByIndex = useMemo(() => {
    const validationMap = new Map();
    (examValidation.topicErrors || []).forEach((entry) => {
      validationMap.set(entry.topicIndex, entry);
    });
    return validationMap;
  }, [examValidation.topicErrors]);

  const groupedDraftTopics = useMemo(
    () => groupDraftTopicsForUi(draft?.topics || []),
    [draft?.topics],
  );

  const getAvailableTopicVariants = useCallback(
    (topicName) => {
      const normalizedTopicName = String(topicName || "").trim().toLowerCase();
      return uniqueTopicVariants(
        (topics || []).filter(
          (topic) =>
            String(topic?.topic || "").trim().toLowerCase() === normalizedTopicName,
        ),
      );
    },
    [topics],
  );

  const countRemainingTopicVariants = useCallback(
    (topicName, currentDraftTopics = draft?.topics || []) => {
      const normalizedTopicName = String(topicName || "").trim().toLowerCase();
      const usedTopicKeys = new Set(
        (currentDraftTopics || [])
          .filter(
            (topic) =>
              String(topic?.topic || "").trim().toLowerCase() === normalizedTopicName,
          )
          .map(buildTopicVariantKey)
          .filter(Boolean),
      );

      return getAvailableTopicVariants(topicName).filter((topic) => {
        const variantKey = buildTopicVariantKey(topic);
        return variantKey && !usedTopicKeys.has(variantKey);
      }).length;
    },
    [draft?.topics, getAvailableTopicVariants],
  );

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

  const selectedCourseOption = useMemo(() => {
    const matchedCourse = courses.find((course) => course.id === courseId);
    if (matchedCourse) {
      return matchedCourse;
    }

    if (courseId && courseLabel) {
      return {
        id: courseId,
        title: courseLabel,
        shortName: "",
      };
    }

    return null;
  }, [courses, courseId, courseLabel]);

  const handleCourseChange = (nextCourse) => {
    setCourseId(nextCourse?.id || "");
    setSelectedTopics([]);
    setTopicQuery("");
    setDraft(null);
  };

  const handleTargetPointsChange = (e) => {
    const nextRawValue = e.target.value;
    const nextTarget =
      nextRawValue === "" ? "" : Math.max(1, Number(nextRawValue));
    setTargetPoints(nextTarget);

    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      next.targetPoints =
        nextTarget === "" ? "" : Math.max(1, Number(nextTarget));
      return recalcDraftTotals(next);
    });
  };

  const handleSemesterYearChange = (e) => {
    setSemesterYear(e.target.value);
  };

  const handleSemesterTypeChange = (e) => {
    setSemesterType(e.target.value);
  };

  // version: "STUDENT" | "TEACHER"
  const compileDraft = async (version) => {
    if (!draft || hasPointsValidationError) return;
    clearPdf();
    setCompileDiagnostics(null);

    setIsCompiling(true);
    setCompiledVersion(version);
    try {
      const res = await examsApi.compileDraft({
        course: draft.course,
        courseId: draft.course?.id || courseId,
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
        courseId: draft.course?.id || courseId,
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
    const resolvedCourseId = String(draft?.course?.id || courseId || "").trim();
    if (!resolvedCourseId || !draft?.course) return;

    const latestCourse = await coursesApi.getById(resolvedCourseId);
    const currentCourse = latestCourse?.data ?? latestCourse;

    await coursesApi.update(resolvedCourseId, {
      title: currentCourse?.title || draft.course?.title || "",
      coverPage: coverPageDraft,
      topics: Array.isArray(currentCourse?.topics) ? currentCourse.topics : [],
    });

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

  const generateDraft = async () => {
    const normalizedSemester = formatSemesterValue(semesterYear, semesterType);
    if (
      !courseId ||
      !normalizedSemester ||
      selectedTopics.length === 0 ||
      Number(targetPoints) <= 0
    )
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
    setDraft({
      ...res.data,
      topics: withSolutionSpace(res.data?.topics || []).map(normalizeDraftTopicVariant),
    });
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
      return recalcDraftTotals(next);
    });
  };

  const updateTopicSolutionSpace = (topicIndex, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const tasks = Array.isArray(next.topics?.[topicIndex]?.tasks)
        ? next.topics[topicIndex].tasks
        : [];
      tasks.forEach((task) => {
        task.solutionSpace = value;
      });
      return recalcDraftTotals(next);
    });
  };

  const addTask = (topicName) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const normalizedTopicName = String(topicName || "").trim().toLowerCase();
      const usedTopicKeys = new Set(
        (prev.topics || [])
          .filter(
            (topic) =>
              String(topic?.topic || "").trim().toLowerCase() === normalizedTopicName,
          )
          .map(buildTopicVariantKey)
          .filter(Boolean),
      );

      const availableVariants = getAvailableTopicVariants(topicName).filter(
        (topic) => {
          const variantKey = buildTopicVariantKey(topic);
          return variantKey && !usedTopicKeys.has(variantKey);
        },
      );

      if (availableVariants.length === 0) {
        return prev;
      }

      const pickedVariant =
        availableVariants[Math.floor(Math.random() * availableVariants.length)];
      const next = structuredClone(prev);
      const normalizedVariant = normalizeDraftTopicVariant(pickedVariant);
      const insertAfterIndex = (next.topics || []).reduce((lastIndex, topic, index) => {
        return String(topic?.topic || "").trim().toLowerCase() ===
          String(topicName || "").trim().toLowerCase()
          ? index
          : lastIndex;
      }, -1);

      if (insertAfterIndex >= 0) {
        next.topics.splice(insertAfterIndex + 1, 0, normalizedVariant);
      } else {
        next.topics.push(normalizedVariant);
      }
      return recalcDraftTotals(next);
    });
  };

  const removeTask = (topicIndex) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      if (!Array.isArray(next.topics) || topicIndex < 0) return prev;
      next.topics.splice(topicIndex, 1);
      return recalcDraftTotals(next);
    });
  };

  const regenerateTopic = async (topicName) => {
    if (!draft) return;
    setCompileDiagnostics(null);

    const normalizedTopicName = String(topicName || "").trim().toLowerCase();
    const matchingIndices = (draft.topics || [])
      .map((topic, index) => ({
        index,
        topic,
      }))
      .filter(
        ({ topic }) =>
          String(topic?.topic || "").trim().toLowerCase() === normalizedTopicName,
      );

    if (matchingIndices.length === 0) return;

    const uniqueVariants = shuffleItems(
      uniqueTopicVariants(getAvailableTopicVariants(topicName)),
    );

    if (uniqueVariants.length === 0) return;

    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const replacementVariants = uniqueVariants
        .slice(0, matchingIndices.length)
        .map(normalizeDraftTopicVariant);

      const firstIndex = matchingIndices[0].index;
      next.topics = (next.topics || []).filter(
        (topic) =>
          String(topic?.topic || "").trim().toLowerCase() !== normalizedTopicName,
      );
      next.topics.splice(firstIndex, 0, ...replacementVariants);
      return recalcDraftTotals(next);
    });
  };

  const saveExam = async () => {
    if (!draft || hasPointsValidationError) return;
    const normalizedSemester = formatSemesterValue(semesterYear, semesterType);
    if (!normalizedSemester) return;

    const body = {
      courseId: draft.course?.id || courseId,
      semester: normalizedSemester,
      targetPoints: Number(draft.targetPoints),
      topics: withSolutionSpace(draft.topics),
    };

    if (isEditMode) {
      await updateM.mutateAsync({ id: examId, body });
      // After successful update, sync initial state to prevent blocker dialog on nav
      initialStateRef.current = {
        courseId: draft.course?.id || courseId,
        semesterYear,
        semesterType,
        targetPoints,
        selectedTopics,
        draft,
      };
      nav("/exams/list");
      return;
    }

    await saveM.mutateAsync(body);
    // After successful create, sync initial state to prevent blocker dialog on nav
    initialStateRef.current = {
      courseId: draft.course?.id || courseId,
      semesterYear,
      semesterType,
      targetPoints,
      selectedTopics,
      draft,
    };
    nav("/exams/list");
  };

  const hasUnsavedChanges = useCallback(() => {
    const snapshot = initialStateRef.current;
    return (
      courseId !== snapshot.courseId ||
      semesterYear !== snapshot.semesterYear ||
      semesterType !== snapshot.semesterType ||
      targetPoints !== snapshot.targetPoints ||
      JSON.stringify(selectedTopics) !==
        JSON.stringify(snapshot.selectedTopics) ||
      JSON.stringify(draft) !== JSON.stringify(snapshot.draft)
    );
  }, [
    courseId,
    semesterYear,
    semesterType,
    targetPoints,
    selectedTopics,
    draft,
  ]);

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setConfirmDialog({ open: true, action: "cancel" });
    } else {
      nav("/exams/list");
    }
  };

  // Prevent navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Block route changes when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname,
  );

  // Store blocker in ref and show dialog when navigation is blocked
  useEffect(() => {
    blockerRef.current = blocker;
    if (blocker.state === "blocked") {
      // Skip if this is an intentional navigation from dialog
      if (isIntentionalNavigationRef.current) {
        isIntentionalNavigationRef.current = false;
        blockerRef.current.proceed();
        return;
      }

      // Only open dialog if this is a new blocked state (different location)
      const currentLocation = blocker.location.pathname;
      if (
        blockedLocationRef.current !== currentLocation &&
        !confirmDialog.open
      ) {
        blockedLocationRef.current = currentLocation;
        setConfirmDialog({
          open: true,
          action: "navigate",
        });
      }
    } else if (blocker.state === "unblocked") {
      blockedLocationRef.current = null;
    }
  }, [blocker, blocker.state, blocker.location?.pathname, confirmDialog.open]);

  const handleResetClick = () => {
    resetExamForm();
  };

  const handleConfirmDialogConfirm = () => {
    const action = confirmDialog.action;
    setConfirmDialog({ open: false, action: null });

    if (action === "cancel") {
      isIntentionalNavigationRef.current = true;
      nav("/exams/list");
    } else if (action === "navigate" && blockerRef.current) {
      blockerRef.current.proceed();
    }
  };

  const handleConfirmDialogCancel = () => {
    if (blockerRef.current?.state === "blocked") {
      blockerRef.current.reset();
    }
    setConfirmDialog({ open: false, action: null });
  };

  const resetExamForm = () => {
    const snapshot = initialStateRef.current;
    setCourseId(snapshot.courseId || "");
    setSemesterYear(snapshot.semesterYear || "");
    setSemesterType(snapshot.semesterType || "");
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
  const isSemesterReady = Boolean(
    formatSemesterValue(semesterYear, semesterType),
  );

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
                !draft ||
                saveM.isPending ||
                updateM.isPending ||
                !isEditable ||
                !formatSemesterValue(semesterYear, semesterType) ||
                hasPointsValidationError
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
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={generateDraft}
                        disabled={
                          !courseId ||
                          !isSemesterReady ||
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
                  gridTemplateColumns: "15% 20% 10% 50%",
                  gap: 2,
                }}
              >
                <Autocomplete
                  options={courses}
                  value={selectedCourseOption}
                  onChange={(_, value) => handleCourseChange(value)}
                  onInputChange={(_, value, reason) => {
                    if (reason === "clear") {
                      setCourseQuery("");
                      return;
                    }
                    if (reason === "input") {
                      setCourseQuery(value);
                    }
                  }}
                  loading={isCoursesLoading}
                  disabled={!isEditable}
                  fullWidth
                  size="small"
                  slotProps={{
                    paper: {
                      elevation: 8,
                      sx: {
                        bgcolor: dropdownPaperBg,
                        color: dropdownPaperColor,
                        border: 1,
                        borderColor: "divider",
                      },
                    },
                    listbox: {
                      sx: {
                        maxHeight: 200,
                        overflowY: "auto",
                        bgcolor: dropdownPaperBg,
                        color: dropdownPaperColor,
                        "& .MuiAutocomplete-option": {
                          minHeight: 40,
                          color: dropdownPaperColor,
                        },
                        "& .MuiAutocomplete-option.Mui-focused": {
                          bgcolor: dropdownHoverBg,
                        },
                        '& .MuiAutocomplete-option[aria-selected="true"]': {
                          bgcolor: dropdownSelectedBg,
                          color: dropdownPaperColor,
                        },
                        '& .MuiAutocomplete-option[aria-selected="true"].Mui-focused':
                          {
                            bgcolor: dropdownSelectedBg,
                          },
                      },
                    },
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  getOptionLabel={(option) => {
                    if (!option) return "";
                    const title = option.title || "";
                    const shortName = option.shortName
                      ? ` (${option.shortName})`
                      : "";
                    return `${title}${shortName}`.trim();
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("common.course")}
                      placeholder={t("common.selectCourse")}
                    />
                  )}
                />

                <Stack direction="row" spacing={1}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label={t("exams.year")}
                      views={["year"]}
                      openTo="year"
                      value={
                        semesterYear && /^\d{4}$/.test(semesterYear)
                          ? dayjs(`${semesterYear}-01-01`)
                          : null
                      }
                      onChange={(value) => {
                        const year = value ? value.year() : "";
                        handleSemesterYearChange({
                          target: { value: year ? String(year) : "" },
                        });
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          disabled: !isEditable,
                        },
                      }}
                      format="YYYY"
                      yearsOrder="asc"
                      minDate={dayjs(`${new Date().getFullYear() - 25}-01-01`)}
                      maxDate={dayjs(`${new Date().getFullYear() + 25}-12-31`)}
                    />
                  </LocalizationProvider>

                  <TextField
                    select
                    label={t("exams.semester")}
                    value={semesterType}
                    onChange={handleSemesterTypeChange}
                    fullWidth
                    size="small"
                    disabled={!isEditable}
                  >
                    <MenuItem value="">{t("exams.selectSemester")}</MenuItem>
                    {SEMESTER_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <TextField
                  label={t("exams.totalPoints")}
                  type="number"
                  slotProps={{ htmlInput: { min: 1 } }}
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
                  inputValue={topicQuery}
                  onInputChange={(_, value, reason) => {
                    if (reason === "clear") {
                      setTopicQuery("");
                      return;
                    }
                    if (reason === "input") {
                      setTopicQuery(value);
                    }
                  }}
                  loading={isTopicsLoading}
                  disabled={!courseId || !isEditable}
                  fullWidth
                  size="small"
                  filterSelectedOptions
                  filterOptions={(options) => options}
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
                    paper: {
                      elevation: 8,
                      sx: {
                        bgcolor: dropdownPaperBg,
                        color: dropdownPaperColor,
                        border: 1,
                        borderColor: "divider",
                      },
                    },
                    listbox: {
                      sx: {
                        maxHeight: 200,
                        overflowY: "auto",
                        bgcolor: dropdownPaperBg,
                        color: dropdownPaperColor,
                        "& .MuiAutocomplete-option": {
                          minHeight: 40,
                          color: dropdownPaperColor,
                        },
                        "& .MuiAutocomplete-option.Mui-focused": {
                          bgcolor: dropdownHoverBg,
                        },
                        '& .MuiAutocomplete-option[aria-selected="true"]': {
                          bgcolor: dropdownSelectedBg,
                          color: dropdownPaperColor,
                        },
                        '& .MuiAutocomplete-option[aria-selected="true"].Mui-focused':
                          {
                            bgcolor: dropdownSelectedBg,
                          },
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
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={generateDraft}
                      disabled={
                        !courseId ||
                        !isSemesterReady ||
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
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            ({draft.totalPoints} / {draft.targetPoints}{" "}
                            {t("exams.pts")})
                          </Typography>
                          {hasPointsValidationError && (
                            <Typography
                              component="span"
                              variant="body2"
                              color="error.main"
                              sx={{ ml: 2, fontWeight: 600 }}
                            >
                              {t("exams.pointsValidationErrorTopics", {
                                topics: mismatchedTopicNames.join(", "),
                              })}
                            </Typography>
                          )}
                        </>
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
                          disabled={
                            !draft || !isEditable || hasPointsValidationError
                          }
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
                          {groupedDraftTopics.map((topicGroup, i) => (
                          <TopicCard
                            key={`${topicGroup.topicName}-${i}`}
                            topicGroup={topicGroup}
                            pointsValidationByFlatIndex={topicValidationByIndex}
                            solutionSpaceOptions={SOLUTION_SPACE_OPTIONS}
                            editable={isEditable}
                            onVariantField={updateTopicField}
                            onVariantSolutionSpace={updateTopicSolutionSpace}
                            onSubtaskField={updateTaskField}
                            onAddTask={addTask}
                            canAddTask={
                              countRemainingTopicVariants(
                                topicGroup.topicName,
                                draft?.topics || [],
                              ) > 0
                            }
                            onRemoveSubtask={removeTask}
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
