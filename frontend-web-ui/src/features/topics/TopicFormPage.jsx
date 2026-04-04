import { useEffect, useMemo, useRef, useState } from "react";
import {
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  alpha,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BuildIcon from "@mui/icons-material/Build";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import SchoolIcon from "@mui/icons-material/School";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { topicSchema } from "../../utils/validators";
import { examsApi } from "../../api/exams.api";
import { topicsApi } from "../../api/topics.api";
import { LatexEditor } from "../../components/ui/LatexEditor";
import { PdfPreviewPanel } from "../../components/ui/PdfPreviewPanel";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RequiredLabel } from "../../components/ui/RequiredLabel";
import { usePdfPreview } from "../../hooks/usePdfPreview";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loader } from "../../components/ui/Loader";
import { useCreateTopic, useTopic, useUpdateTopic } from "./topics.hooks";
import { useCourses } from "../courses/courses.hooks";
import { useTranslation } from "react-i18next";
import { notifyError } from "../../app/notifications";
import {
  getCompileResultPayload,
  notifyCompileOutcome,
  toCompilerMessages,
} from "../../utils/compileDiagnostics";
import { fileToBase64 } from "../../utils/fileToBase64";

const DEFAULT_SPLIT_PERCENT = 65;
const COLLAPSE_THRESHOLD_PERCENT = 10;

function buildTaskTemplateBody({
  topicTitle = "Topic Title",
  topicDescription = "",
} = {}) {
  const normalizedTopicTitle = String(topicTitle || "").trim() || "Topic Title";
  const normalizedTopicDescription = String(topicDescription || "").trim();

  return String.raw`\section{${normalizedTopicTitle}}
${normalizedTopicDescription || "Some description may go here. Can include text, images, source code, and other things."}

\subsection{5P}
This is the first task

\begin{solution}
    This is the solution for task a)
\end{solution}

\subsection{4P}
This is the second task

\begin{solution}
    This is the solution for task b)
\end{solution}`;
}

function buildTaskLatex(task) {
  const points = Number(task?.points || 0);
  const parts = [`\\subsection{${points}P}`];
  if (task?.question) parts.push(String(task.question).trim());
  if (task?.solution) {
    parts.push(`\\begin{solution}\n${String(task.solution).trim()}\n\\end{solution}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

function buildRawLatexFromTopic(topic) {
  const fullTopicLatex = String(topic?.full_tex_code || "").trim();
  if (fullTopicLatex) return fullTopicLatex;

  const topicTitle = String(topic?.topic || "").trim();
  const description = String(topic?.description || "").trim();
  const tasks = Array.isArray(topic?.tasks) ? topic.tasks : [];

  const parts = [topicTitle ? `\\section{${topicTitle}}` : "", description];
  tasks.forEach((task) => {
    const taskLatex = String(task?.full_tex_code || buildTaskLatex(task)).trim();
    if (taskLatex) parts.push(taskLatex);
  });

  return parts.filter(Boolean).join("\n\n").trim();
}

function resolveParsedTopic(parsedTopics, selectedTopic) {
  if (!Array.isArray(parsedTopics) || parsedTopics.length === 0) return null;
  const normalizedSelectedTopic = String(selectedTopic || "").trim().toLowerCase();

  if (parsedTopics.length === 1) {
    const parsedTopic = parsedTopics[0];
    if (!normalizedSelectedTopic) return parsedTopic;

    return {
      ...parsedTopic,
      topic: String(selectedTopic || parsedTopic.topic || "").trim(),
    };
  }

  if (!normalizedSelectedTopic) return parsedTopics[0];

  const matchedTopic =
    parsedTopics.find(
      (topic) =>
        String(topic?.topic || "").trim().toLowerCase() ===
        normalizedSelectedTopic,
    ) || parsedTopics[0];

  if (!matchedTopic) return null;

  return {
    ...matchedTopic,
    topic: String(selectedTopic || matchedTopic.topic || "").trim(),
  };
}

function hasSubsectionBlocks(latexContent) {
  return /\\subsection\{[^}]*\}/.test(String(latexContent || ""));
}

function buildFilteredTasksListUrl(courseId, topic) {
  const params = new URLSearchParams();
  const normalizedCourseId = String(courseId || "").trim();
  const normalizedTopic = String(topic || "").trim();
  if (normalizedCourseId) params.set("courseId", normalizedCourseId);
  if (normalizedTopic) params.set("topic", normalizedTopic);
  return params.toString() ? `/tasks/list?${params.toString()}` : "/courses/list";
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syncTopicTitleIntoLatex(latexContent, topicTitle) {
  const source = String(latexContent || "");
  const nextTopicTitle = String(topicTitle || "").trim();
  if (!source || !nextTopicTitle) return source;

  if (/\\section\{[^}]*\}/.test(source)) {
    return source.replace(/\\section\{[^}]*\}/, `\\section{${nextTopicTitle}}`);
  }

  return source;
}

function buildPreviewLatex(latexContent, topicTitle, points) {
  let source = syncTopicTitleIntoLatex(latexContent, topicTitle);
  const normalizedPoints = Number(points);
  const normalizedTopicTitle = String(topicTitle || "").trim();

  if (!Number.isFinite(normalizedPoints) || normalizedPoints < 0) {
    return source;
  }

  if (/\\section\{[^}]*\}(?:\s*\([^)]*\))?/.test(source)) {
    return source.replace(
      /\\section\{[^}]*\}(?:\s*\([^)]*\))?/,
      `\\section{${normalizedTopicTitle} (${normalizedPoints}P)}`,
    );
  }

  return source;
}

function injectTaskAssetsIntoLatex(latexContent, assets) {
  const source = String(latexContent || "");
  const nextAssets = Array.isArray(assets) ? assets : [];
  const pendingBlocks = nextAssets
    .filter((asset) => String(asset?.filename || "").trim())
    .filter((asset) => {
      const filename = String(asset.filename).trim();
      return !new RegExp(escapeRegExp(filename)).test(source);
    })
    .map(
      (asset) => String.raw`\begin{center}
\includegraphics[width=0.9\linewidth]{${String(asset.filename).trim()}}
\end{center}`,
    );

  if (pendingBlocks.length === 0) return source;

  const block = `${pendingBlocks.join("\n\n")}\n\n`;
  if (/\\subsection\{[^}]*\}/.test(source)) {
    return source.replace(/(\\subsection\{[^}]*\})/, `${block}$1`);
  }

  return `${source.trim()}\n\n${block}`.trim();
}

function removeTaskAssetFromLatex(latexContent, filename) {
  const source = String(latexContent || "");
  const normalizedFilename = String(filename || "").trim();
  if (!source || !normalizedFilename) return source;

  const escapedFilename = escapeRegExp(normalizedFilename);
  const centeredImageBlockRegex = new RegExp(
    String.raw`(?:\r?\n)?\\begin\{center\}\s*\\includegraphics\[width=0\.9\\linewidth\]\{${escapedFilename}\}\s*\\end\{center\}(?:\r?\n)?`,
    "g",
  );
  const bareImageRegex = new RegExp(
    String.raw`(?:\r?\n)?\\includegraphics(?:\[[^\]]*\])?\{${escapedFilename}\}(?:\r?\n)?`,
    "g",
  );

  return source
    .replace(centeredImageBlockRegex, "\n")
    .replace(bareImageRegex, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectTaskAssetsFromTopic(topic) {
  const tasks = Array.isArray(topic?.tasks) ? topic.tasks : [];
  const seen = new Set();
  const assets = [];

  tasks.forEach((task) => {
    const taskAssets = Array.isArray(task?.assets) ? task.assets : [];
    taskAssets.forEach((asset) => {
      const filename = String(asset?.filename || "").trim();
      const base64 = String(asset?.base64 || "").trim();
      if (!filename || !base64 || seen.has(filename)) return;
      seen.add(filename);
      assets.push({
        filename,
        contentType: String(asset?.contentType || "").trim(),
        base64,
      });
    });
  });

  return assets;
}

function CompileButton({ disabled, loading, onCompile }) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
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
        disabled={disabled || loading}
        endIcon={<ArrowDropDownIcon />}
        startIcon={
          loading ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <BuildIcon />
          )
        }
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {loading ? t("common.compiling") : t("common.compile")}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => handleSelect("STUDENT")}>
          <ListItemIcon>
            <SchoolIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary={t("exams.studentVersion")} />
        </MenuItem>
        <MenuItem onClick={() => handleSelect("TEACHER")}>
          <ListItemIcon>
            <MenuBookIcon fontSize="small" color="secondary" />
          </ListItemIcon>
          <ListItemText primary={t("exams.teacherVersion")} />
        </MenuItem>
      </Menu>
    </>
  );
}

export function TopicFormPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const nav = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);
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
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isTexDropActive, setIsTexDropActive] = useState(false);
  const [isImageDropActive, setIsImageDropActive] = useState(false);
  const [compiledVersion, setCompiledVersion] = useState(null);
  const [compilerMessages, setCompilerMessages] = useState(null);
  const [taskAssets, setTaskAssets] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
  });
  const splitContainerRef = useRef(null);
  const blockerRef = useRef(null);
  const blockedLocationRef = useRef(null);
  const isIntentionalNavigationRef = useRef(false);
  const autoPreviewKeyRef = useRef("");
  const initialTaskAssetsRef = useRef([]);
  const taskAssetsRef = useRef([]);
  const initialValuesRef = useRef({
    courseId: "",
    topic: "",
    points: "",
    taskDescription: "",
    rawLatex: "",
  });
  const requestedCourseId = String(searchParams.get("courseId") || "").trim();
  const requestedTopic = String(searchParams.get("topic") || "").trim();
  const { pdfUrl, setPdfFromBase64, clearPdf } =
    usePdfPreview("topic-preview.pdf");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedCourseQuery(courseQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [courseQuery]);

  const { data: coursesData, isFetching: isCoursesLoading } = useCourses({
    page: 1,
    limit: 20,
    q: debouncedCourseQuery || undefined,
  });
  const courses = useMemo(() => coursesData?.data || [], [coursesData]);

  const {
    data: topicData,
    isLoading: topicLoading,
    error: topicError,
  } = useTopic(id, {
    enabled: isEditMode,
  });

  const createM = useCreateTopic();
  const updateM = useUpdateTopic();
  const [isEditable, setIsEditable] = useState(true);

  const form = useForm({
    resolver: zodResolver(topicSchema(t)),
    defaultValues: {
      courseId: "",
      topic: "",
      points: "",
      taskDescription: "",
      rawLatex: "",
    },
  });

  const {
    control,
    clearErrors,
    formState,
    getValues,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = form;
  const selectedCourseId = useWatch({ control, name: "courseId" }) || "";
  const selectedTopicValue = useWatch({ control, name: "topic" }) || "";
  const taskDescriptionValue =
    useWatch({ control, name: "taskDescription" }) || "";
  const rawLatexValue = useWatch({ control, name: "rawLatex" }) || "";

  useEffect(() => {
    if (!isEditMode) {
      autoPreviewKeyRef.current = "";
      const defaults = {
        courseId: "",
        topic: "",
        points: "",
        taskDescription: "",
        rawLatex: buildTaskTemplateBody({ topicDescription: "" }),
      };
      reset(defaults);
      initialValuesRef.current = defaults;
      initialTaskAssetsRef.current = [];
      taskAssetsRef.current = [];
      setTaskAssets([]);
      setIsEditable(true);
      setCollapsedPane(null);
      setSplitPercent(DEFAULT_SPLIT_PERCENT);
      setCompilerMessages(null);
      clearPdf();
      return;
    }

    const resolved = topicData?.data ?? topicData;
    if (!resolved) return;

    const resolvedCourseId =
      typeof resolved?.courseId === "object"
        ? (resolved?.courseId?.id ?? "")
        : (resolved?.courseId ?? "");

    const hydratedValues = {
      courseId: resolvedCourseId,
      topic: resolved?.topic || "",
      points: resolved?.points ?? "",
      taskDescription:
        Array.isArray(resolved?.tasks) && resolved.tasks.length > 0
          ? resolved.tasks[0]?.description || ""
          : "",
      rawLatex: buildRawLatexFromTopic(resolved),
    };

    reset(hydratedValues);
    initialValuesRef.current = hydratedValues;
    const hydratedTaskAssets = collectTaskAssetsFromTopic(resolved);
    initialTaskAssetsRef.current = hydratedTaskAssets;
    applyTaskAssets(hydratedTaskAssets);
    setIsEditable(true);
    setCollapsedPane(null);
    setSplitPercent(DEFAULT_SPLIT_PERCENT);
    setCompilerMessages(null);
    clearPdf();
  }, [topicData, isEditMode, reset, clearPdf]);

  useEffect(() => {
    if (isEditMode || isCoursesLoading) return;

    const currentCourseId = String(form.getValues("courseId") || "").trim();
    const currentTopic = String(form.getValues("topic") || "").trim();

    if (requestedCourseId && !currentCourseId) {
      const matchedCourse = courses.find((course) => course.id === requestedCourseId);
      if (matchedCourse) {
        form.setValue("courseId", requestedCourseId, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }

    const effectiveCourseId = String(
      form.getValues("courseId") || requestedCourseId || "",
    ).trim();
    const matchedCourse = courses.find((course) => course.id === effectiveCourseId);
    const matchedTopic =
      requestedTopic &&
      Array.isArray(matchedCourse?.topics) &&
      matchedCourse.topics.find(
        (topic) =>
          String(topic || "").trim().toLowerCase() === requestedTopic.toLowerCase(),
      );

    if (matchedTopic && !currentTopic) {
      form.setValue("topic", matchedTopic, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue(
        "rawLatex",
        syncTopicTitleIntoLatex(form.getValues("rawLatex"), matchedTopic),
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );
    }
  }, [
    courses,
    form,
    isCoursesLoading,
    isEditMode,
    requestedCourseId,
    requestedTopic,
  ]);

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

  const selectedCourseOption = useMemo(() => {
    const matchedCourse = (courses || []).find((course) => course.id === selectedCourseId);
    if (matchedCourse) return matchedCourse;

    const resolved = topicData?.data ?? topicData;
    const course = resolved?.courseId;
    if (selectedCourseId && typeof course === "object" && course) {
      return {
        id: selectedCourseId,
        title: course.title || "",
        shortName: course.shortName || "",
        topics: course.topics || [],
      };
    }

    return null;
  }, [courses, selectedCourseId, topicData]);

  const topicOptions = useMemo(() => {
    const matchedCourse = (courses || []).find((course) => course.id === selectedCourseId);
    if (matchedCourse && Array.isArray(matchedCourse.topics)) return matchedCourse.topics;

    if (selectedCourseOption?.topics) return selectedCourseOption.topics;
    return [];
  }, [courses, selectedCourseId, selectedCourseOption]);

  const buildCompileResources = (assets) =>
    (Array.isArray(assets) ? assets : [])
      .filter((asset) => String(asset?.filename || "").trim() && String(asset?.base64 || "").trim())
      .map((asset) => ({
        path: asset.filename,
        content: asset.base64,
      }));

  const applyTaskAssets = (nextAssets) => {
    const normalizedAssets = Array.isArray(nextAssets) ? nextAssets : [];
    taskAssetsRef.current = normalizedAssets;
    setTaskAssets(normalizedAssets);
  };

  const compilePreview = async (version, options = {}) => {
    const resourceAssets = Array.isArray(options.assets)
      ? options.assets
      : taskAssetsRef.current;
    const latexContent = String(
      buildPreviewLatex(
        options.latexContent ?? getValues("rawLatex"),
        options.topicTitle ?? getValues("topic"),
        options.points ?? getValues("points"),
      ) || "",
    ).trim();
    if (!latexContent) return;

    clearPdf();
    setCompilerMessages(null);
    setCompiledVersion(version);
    setIsCompiling(true);

    try {
      const response = await examsApi.compileLatexOnly({
        latexContent,
        version,
        resources: buildCompileResources(resourceAssets),
      });
      const { pdfBase64, filename, contentType, diagnostics } =
        getCompileResultPayload(response);

      setPdfFromBase64({
        base64: pdfBase64,
        filename,
        mimeType: contentType || "application/pdf",
      });

      setCompilerMessages(toCompilerMessages(diagnostics));
      notifyCompileOutcome(diagnostics);
    } catch (compileError) {
      const message =
        compileError?.response?.data?.error?.message ||
        compileError?.userMessage ||
        compileError?.message ||
        t("courses.compileFailed");

      setCompilerMessages({
        clsiStatus: null,
        buildId: null,
        errorCount: 1,
        warningCount: 0,
        errors: [{ message }],
        warnings: [],
        timings: null,
        stats: null,
        log: message,
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const processTaskImageFiles = async (filesInput) => {
    const files = Array.from(filesInput || []);
    if (files.length === 0) return;

    try {
      const nextAssets = [];

      for (const file of files) {
        if (!String(file?.type || "").startsWith("image/")) {
          notifyError(t("errors.invalidImageFile"));
          continue;
        }

        const filename = String(file.name || "").trim() || `pasted-image-${Date.now()}.png`;
        const hasDuplicate = [...taskAssetsRef.current, ...nextAssets].some(
          (asset) => String(asset?.filename || "").trim() === filename,
        );

        if (hasDuplicate) {
          notifyError(
            t("errors.duplicateTaskAsset", {
              filename,
              defaultValue: `A file named ${filename} is already attached.`,
            }),
          );
          continue;
        }

        nextAssets.push({
          filename,
          contentType: file.type || "application/octet-stream",
          base64: await fileToBase64(file),
        });
      }

      if (nextAssets.length === 0) return;

      const mergedAssets = [...taskAssetsRef.current, ...nextAssets];
      applyTaskAssets(mergedAssets);
      const nextRawLatex = injectTaskAssetsIntoLatex(getValues("rawLatex"), mergedAssets);
      setValue("rawLatex", nextRawLatex, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch {
      notifyError(t("errors.imageUploadFailed"));
    }
  };

  const handleTaskImagesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await processTaskImageFiles(files);
    setIsImageDropActive(false);
  };

  const handleTaskImagesDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsImageDropActive(false);
    if (!isEditable) return;
    await processTaskImageFiles(event.dataTransfer?.files || []);
  };

  const handleRawLatexPaste = async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItems = items.filter((item) => String(item.type || "").startsWith("image/"));
    if (imageItems.length === 0) return;

    event.preventDefault();
    const normalizedFiles = imageItems
      .map((item, index) => {
        const file = item.getAsFile();
        if (!file) return null;
        const extension = String(file.type || "image/png").split("/")[1] || "png";
        return new File(
          [file],
          file.name || `pasted-image-${Date.now()}-${index}.${extension}`,
          { type: file.type || "image/png" },
        );
      })
      .filter(Boolean);

    await processTaskImageFiles(normalizedFiles);
  };

  const loadTexFile = async (file) => {
    const filename = String(file?.name || "").toLowerCase();
    if (!filename.endsWith(".tex")) {
      notifyError(t("errors.invalidTexFile"));
      return;
    }

    try {
      const text = await file.text();
      setValue("rawLatex", text, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch {
      notifyError(t("errors.texUploadFailed"));
    }
  };

  const handleTexFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await loadTexFile(file);
    setIsTexDropActive(false);
  };

  const handleTexDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsTexDropActive(false);
    if (!isEditable) return;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await loadTexFile(file);
  };

  const removeTaskAsset = (filename) => {
    const nextAssets = taskAssetsRef.current.filter(
      (asset) => asset.filename !== filename,
    );
    applyTaskAssets(nextAssets);
    const nextRawLatex = removeTaskAssetFromLatex(getValues("rawLatex"), filename);
    setValue("rawLatex", nextRawLatex, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const submit = handleSubmit(async (values) => {
    clearErrors();
    const latexContent = String(values.rawLatex || "").trim();
    if (!latexContent) return;

    try {
      const parseResponse = await topicsApi.parseLatex({
        latexContent,
        topic: values.topic,
        points: values.points,
      });
      const parsedTopics = parseResponse?.data?.topics || parseResponse?.topics || [];
      const parsedTopic = resolveParsedTopic(parsedTopics, values.topic);

      if (!parsedTopic) {
        setError("rawLatex", {
          type: "manual",
          message: t("errors.invalidTaskLatex"),
        });
        return;
      }

      const latexHasSubsections = hasSubsectionBlocks(latexContent);
      const selectedPoints = Number(values.points);
      const parsedPoints = Number(parsedTopic.points || 0);

      if (latexHasSubsections && parsedPoints !== selectedPoints) {
        setError("points", {
          type: "manual",
          message: t("errors.taskPointsMismatch"),
        });
        return;
      }

      const currentTaskAssets = taskAssetsRef.current;
      const normalizedTasks = (parsedTopic.tasks || []).map((task, index) => ({
        ...task,
        description: index === 0 ? values.taskDescription : task.description || "",
        assets: currentTaskAssets,
      }));

      const payload = {
        courseId: values.courseId,
        topic: values.topic,
        description: parsedTopic.description || "",
        points: selectedPoints,
        full_tex_code: values.rawLatex,
        taskDescription: values.taskDescription,
        taskAssets: currentTaskAssets,
        tasks: normalizedTasks,
      };

      if (isEditMode) await updateM.mutateAsync({ id, body: payload });
      else await createM.mutateAsync(payload);

      initialValuesRef.current = {
        courseId: values.courseId,
        topic: values.topic,
        points: values.points,
        taskDescription: values.taskDescription,
        rawLatex: values.rawLatex,
      };
      initialTaskAssetsRef.current = currentTaskAssets;
      isIntentionalNavigationRef.current = true;
      nav(buildFilteredTasksListUrl(values.courseId, values.topic));
    } catch (saveError) {
      const message =
        saveError?.response?.data?.error?.message ||
        saveError?.userMessage ||
        saveError?.message ||
        t("errors.requestFailed");
      setError("rawLatex", { type: "manual", message });
    }
  });

  useEffect(() => {
    if (isEditMode) return;

    const rawLatex = String(rawLatexValue || "").trim();
    if (!rawLatex) return;
    const selectedTopicForPreview = String(
      selectedTopicValue || requestedTopic || "",
    ).trim();

    if (
      selectedTopicForPreview &&
      !new RegExp(`\\\\section\\{${escapeRegExp(selectedTopicForPreview)}\\}`).test(rawLatex)
    ) {
      return;
    }

    const previewKey = `create:${selectedTopicForPreview || "__no_topic__"}`;
    if (autoPreviewKeyRef.current === previewKey) return;

    autoPreviewKeyRef.current = previewKey;
    void compilePreview("TEACHER");
  }, [isEditMode, rawLatexValue, requestedTopic, selectedTopicValue]);

  const resetForm = () => {
    reset(initialValuesRef.current);
    applyTaskAssets(initialTaskAssetsRef.current);
    setCompiledVersion(null);
    setCompilerMessages(null);
    clearPdf();
    setIsEditable(true);
  };

  const hasUnsavedChanges = () => {
    const currentValues = {
      courseId: getValues("courseId"),
      topic: getValues("topic"),
      points: getValues("points"),
      taskDescription: getValues("taskDescription"),
      rawLatex: getValues("rawLatex"),
      assets: taskAssetsRef.current,
    };
    return (
      JSON.stringify(currentValues) !==
      JSON.stringify({
        ...initialValuesRef.current,
        assets: initialTaskAssetsRef.current,
      })
    );
  };

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    blockerRef.current = blocker;
    if (blocker.state === "blocked") {
      if (isIntentionalNavigationRef.current) {
        isIntentionalNavigationRef.current = false;
        blockerRef.current.proceed();
        return;
      }

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

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setConfirmDialog({ open: true, action: "cancel" });
    } else {
      nav(
        buildFilteredTasksListUrl(
          getValues("courseId") || requestedCourseId,
          getValues("topic") || requestedTopic,
        ),
      );
    }
  };

  const handleConfirmDialogConfirm = () => {
    const action = confirmDialog.action;
    setConfirmDialog({ open: false, action: null });

    if (action === "cancel") {
      isIntentionalNavigationRef.current = true;
      nav(
        buildFilteredTasksListUrl(
          getValues("courseId") || requestedCourseId,
          getValues("topic") || requestedTopic,
        ),
      );
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

  const resetSplitLayout = () => {
    setCollapsedPane(null);
    setSplitPercent(DEFAULT_SPLIT_PERCENT);
  };

  const startSplitDrag = (event) => {
    if (collapsedPane) return;
    event.preventDefault();
    setIsDraggingSplit(true);
  };

  const leftPanelWidth =
    collapsedPane === "right" ? "100%" : `${splitPercent}%`;
  const rightPanelWidth =
    collapsedPane === "left" ? "100%" : `${100 - splitPercent}%`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "95vh" }}>
      <PageHeader
        title={isEditMode ? t("topics.editTitle") : t("topics.createTitle")}
        right={
          <Stack direction="row" spacing={1}>
            {!isEditMode ? (
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                size="small"
                onClick={resetForm}
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
              onClick={submit}
              disabled={createM.isPending || updateM.isPending || !isEditable}
            >
              {t("common.save")}
            </Button>
          </Stack>
        }
      />

      {isEditMode && topicLoading ? <Loader /> : null}
      {topicError ? (
        <ErrorState message={topicError.userMessage || topicError.message} />
      ) : null}

      {!topicError && !(isEditMode && topicLoading) ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Box
            ref={splitContainerRef}
            sx={{
              display: "flex",
              gap: 0,
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
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
                  {t("topics.createTitle")}
                </Typography>
                <Tooltip title={t("baseTemplate.expandEditor")}>
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
                    p: 2,
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
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" />
                    <CompileButton
                      disabled={!isEditable}
                      loading={isCompiling}
                      onCompile={compilePreview}
                    />
                  </Stack>

                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflow: "auto",
                      pr: 0.5,
                      py: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "1fr 1fr 1fr",
                        },
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Controller
                        name="courseId"
                        control={control}
                        render={({ field }) => (
                          <Autocomplete
                            options={courses || []}
                            value={selectedCourseOption}
                            onChange={(_, option) => {
                              field.onChange(option?.id || "");
                              setValue("courseId", option?.id || "", {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                              setValue("topic", "", {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }}
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
                            fullWidth
                            size="small"
                            disabled={!isEditable}
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
                                  '& .MuiAutocomplete-option[aria-selected="true"]':
                                    {
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
                              return String(option.title || "").trim();
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={<RequiredLabel label={t("common.course")} />}
                                error={!!formState.errors.courseId}
                                helperText={formState.errors.courseId?.message || " "}
                                placeholder={t("common.selectCourse")}
                              />
                            )}
                          />
                        )}
                      />

                      <Controller
                        name="topic"
                        control={control}
                        render={({ field }) => (
                          <Autocomplete
                            options={topicOptions}
                            value={field.value || ""}
                            fullWidth
                            size="small"
                            onChange={(_, value) => {
                              const nextValue = value || "";
                              field.onChange(nextValue);
                              setValue("topic", nextValue, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                              if (nextValue) {
                                setValue(
                                  "rawLatex",
                                  syncTopicTitleIntoLatex(
                                    getValues("rawLatex"),
                                    nextValue,
                                  ),
                                  {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  },
                                );
                              }
                              if (nextValue) clearErrors("topic");
                            }}
                            isOptionEqualToValue={(option, value) =>
                              String(option || "") === String(value || "")
                            }
                            disabled={!isEditable || !selectedCourseId}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={<RequiredLabel label={t("common.topic")} />}
                                error={!!formState.errors.topic}
                                helperText={
                                  formState.errors.topic?.message ||
                                  (!selectedCourseId
                                    ? t("common.selectCourseFirst")
                                    : " ")
                                }
                                placeholder={t("topics.selectTopicOnly")}
                              />
                            )}
                          />
                        )}
                      />

                      <TextField
                        label={t("common.points")}
                        placeholder={t("common.points")}
                        type="number"
                        slotProps={{ htmlInput: { min: 1 } }}
                        fullWidth
                        size="small"
                        {...register("points")}
                        error={!!formState.errors.points}
                        helperText={formState.errors.points?.message}
                        disabled={!isEditable}
                      />
                    </Box>

                    <TextField
                      label={t("topics.taskDescription")}
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      value={taskDescriptionValue}
                      error={!!formState.errors.taskDescription}
                      helperText={formState.errors.taskDescription?.message}
                      onChange={(event) => {
                        if (!isEditable) return;
                        setValue("taskDescription", event.target.value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
                      disabled={!isEditable}
                      sx={{ mb: 2 }}
                    />

                    <Box
                      className="rounded-2xl border p-4"
                      sx={{ overflow: "auto" }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1.5,
                          mb: 2,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography className="font-semibold">
                          {t("topics.rawLatex")}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            disabled={!isEditable}
                            onDragEnter={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (isEditable) setIsTexDropActive(true);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (isEditable) {
                                event.dataTransfer.dropEffect = "copy";
                                setIsTexDropActive(true);
                              }
                            }}
                            onDragLeave={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setIsTexDropActive(false);
                            }}
                            onDrop={handleTexDrop}
                            sx={{
                              borderColor: isTexDropActive ? "primary.main" : undefined,
                              bgcolor: isTexDropActive
                                ? alpha(theme.palette.primary.main, 0.08)
                                : undefined,
                            }}
                          >
                            {t("topics.uploadTexFile")}
                            <input
                              hidden
                              type="file"
                              accept=".tex,text/x-tex,application/x-tex"
                              onChange={handleTexFileUpload}
                            />
                          </Button>

                          <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            disabled={!isEditable}
                            onDragEnter={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (isEditable) setIsImageDropActive(true);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (isEditable) {
                                event.dataTransfer.dropEffect = "copy";
                                setIsImageDropActive(true);
                              }
                            }}
                            onDragLeave={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setIsImageDropActive(false);
                            }}
                            onDrop={handleTaskImagesDrop}
                            sx={{
                              borderColor: isImageDropActive
                                ? "primary.main"
                                : undefined,
                              bgcolor: isImageDropActive
                                ? alpha(theme.palette.primary.main, 0.08)
                                : undefined,
                            }}
                          >
                            {t("topics.uploadTaskImages")}
                            <input
                              hidden
                              multiple
                              type="file"
                              accept="image/*"
                              onChange={handleTaskImagesUpload}
                            />
                          </Button>
                        </Stack>
                      </Box>

                      {taskAssets.length ? (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          useFlexGap
                          flexWrap="wrap"
                          sx={{ mb: 2, justifyContent: "flex-end" }}
                        >
                          {taskAssets.map((asset) => (
                            <Box
                              key={asset.filename}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                px: 1,
                                py: 0.5,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 999,
                                bgcolor: "background.default",
                                maxWidth: 280,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {asset.filename}
                              </Typography>
                              <Button
                                size="small"
                                color="inherit"
                                onClick={() => removeTaskAsset(asset.filename)}
                                disabled={!isEditable}
                                sx={{
                                  minWidth: 0,
                                  px: 0.75,
                                  py: 0.25,
                                  lineHeight: 1,
                                }}
                              >
                                {t("topics.remove")}
                              </Button>
                            </Box>
                          ))}
                        </Stack>
                      ) : null}

                      <LatexEditor
                        value={rawLatexValue}
                        onPaste={handleRawLatexPaste}
                        onChange={(value) => {
                          if (!isEditable) return;
                          setValue("rawLatex", value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        height={420}
                        placeholder={t("topics.rawLatexPlaceholder")}
                      />
                      {formState.errors.rawLatex?.message ? (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{ mt: 0.75, display: "block" }}
                        >
                          {formState.errors.rawLatex.message}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                </Paper>
              </Box>
            )}

            {collapsedPane === null && (
              <Box
                onMouseDown={startSplitDrag}
                role="separator"
                aria-orientation="vertical"
                aria-label={t("courses.resizeAria")}
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
                  <Tooltip title={t("courses.closeCoverPanel")}>
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
                        color: isDraggingSplit ? "primary.main" : "text.secondary",
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>
                  </Tooltip>
                  <Tooltip title={t("courses.closePreviewPanel")}>
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
                <Tooltip title={t("baseTemplate.expandPreview")}>
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
                  hideDownload
                  isLoading={isCompiling}
                  compilerMessages={compilerMessages}
                  title={
                    compiledVersion
                      ? t("common.preview", {
                          name:
                            compiledVersion === "STUDENT"
                              ? t("exams.student")
                              : t("exams.teacher"),
                        })
                      : undefined
                  }
                  loadingText={t("courses.compilingPreview")}
                  emptyText={t("courses.emptyPreview")}
                />
              </Box>
            )}
          </Box>
        </Box>
      ) : null}

      <ConfirmDialog
        open={confirmDialog.open}
        title={t("topics.confirmCancelTitle")}
        message={t("topics.unsavedChangesMessage")}
        confirmText={t("topics.confirmYes")}
        onCancel={handleConfirmDialogCancel}
        onConfirm={handleConfirmDialogConfirm}
      />
    </Box>
  );
}
