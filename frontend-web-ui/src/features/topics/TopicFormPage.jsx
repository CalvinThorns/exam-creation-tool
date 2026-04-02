import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import {
  alpha,
  Autocomplete,
  CircularProgress,
  Button,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
// import UploadIcon from "@mui/icons-material/Upload";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BuildIcon from "@mui/icons-material/Build";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SchoolIcon from "@mui/icons-material/School";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { topicSchema } from "../../utils/validators";
// import { fileToBase64 } from "../../utils/fileToBase64";
import { examsApi } from "../../api/exams.api";
import { TaskEditor } from "./TaskEditor";
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
import {
  getCompileResultPayload,
  notifyCompileOutcome,
  toCompilerMessages,
} from "../../utils/compileDiagnostics";
import { validateTopicFormPoints } from "../exams/utils/validation";

const DEFAULT_SPLIT_PERCENT = 65;
const COLLAPSE_THRESHOLD_PERCENT = 10;

function getDefaultTask() {
  return {
    question: "",
    points: "",
    // question_img: null,
    solution: "",
    // isRelatedToTopic: true,
  };
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

export function TopicFormPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const nav = useNavigate();
  const { id } = useParams();
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
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledVersion, setCompiledVersion] = useState(null);
  const [compilerMessages, setCompilerMessages] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
  });
  const splitContainerRef = useRef(null);
  const blockerRef = useRef(null);
  const blockedLocationRef = useRef(null);
  const isIntentionalNavigationRef = useRef(false);
  const initialValuesRef = useRef({
    courseId: "",
    topic: "",
    description: "",
    points: "",
    description_img: null,
    tasks: [getDefaultTask()],
  });
  const { pdfUrl, setPdfFromBase64, clearPdf } =
    usePdfPreview("topic-preview.pdf");

  const form = useForm({
    resolver: zodResolver(topicSchema(t)),
    defaultValues: {
      courseId: "",
      topic: "",
      description: "",
      points: "",
      description_img: null,
      tasks: [getDefaultTask()],
    },
  });

  useEffect(() => {
    if (!isEditMode) {
      const defaults = {
        courseId: "",
        topic: "",
        description: "",
        points: "",
        description_img: null,
        tasks: [getDefaultTask()],
      };
      form.reset(defaults);
      initialValuesRef.current = defaults;
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
      description: resolved?.description || "",
      points: resolved?.points ?? "",
      description_img: null,
      tasks: resolved?.tasks?.length
        ? resolved.tasks.map((task) => ({
            ...task,
            points: task?.points ?? "",
          }))
        : [getDefaultTask()],
    };

    form.reset(hydratedValues);
    initialValuesRef.current = hydratedValues;

    setIsEditable(true);
    setCollapsedPane(null);
    setSplitPercent(DEFAULT_SPLIT_PERCENT);
    setCompilerMessages(null);
    clearPdf();
  }, [topicData, isEditMode, form, clearPdf]);

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

  const { register, handleSubmit, formState, setValue, control, getValues } =
    form;
  const selectedCourseId = useWatch({ control, name: "courseId" }) || "";
  const descriptionValue = useWatch({ control, name: "description" }) || "";
  const topicPointsValue = useWatch({ control, name: "points" });
  const tasksValue = useWatch({
    control,
    name: "tasks",
    defaultValue: [getDefaultTask()],
  });

  const topicPointsValidation = useMemo(
    () => validateTopicFormPoints(topicPointsValue, tasksValue),
    [topicPointsValue, tasksValue],
  );
  const hasPointsValidationError = !topicPointsValidation.isValid;

  const selectedCourseOption = useMemo(() => {
    const matchedCourse = (courses || []).find(
      (c) => c.id === selectedCourseId,
    );
    if (matchedCourse) {
      return matchedCourse;
    }

    const resolved = topicData?.data ?? topicData;
    const course = resolved?.courseId;
    if (selectedCourseId && typeof course === "object" && course) {
      return {
        id: selectedCourseId,
        title: course.title || "",
        shortName: course.shortName || "",
      };
    }

    return null;
  }, [courses, selectedCourseId, topicData]);

  // const setDescriptionImage = async (file) => {
  //   if (!file) {
  //     setValue("description_img", null);
  //     return;
  //   }
  //   const base64 = await fileToBase64(file);
  //   setValue("description_img", {
  //     base64,
  //     contentType: file.type || "application/octet-stream",
  //     filename: file.name || "",
  //   });
  // };

  const addTask = () => {
    const current = getValues("tasks") || [];
    setValue("tasks", [...current, getDefaultTask()]);
  };

  const submit = handleSubmit(async (values) => {
    if (hasPointsValidationError) return;
    if (isEditMode) await updateM.mutateAsync({ id, body: values });
    else await createM.mutateAsync(values);
    // After successful save, sync baseline from live form state used by blocker.
    const currentFormValues = form.getValues();
    initialValuesRef.current = {
      courseId: currentFormValues.courseId,
      topic: currentFormValues.topic,
      description: currentFormValues.description,
      points: currentFormValues.points,
      description_img: currentFormValues.description_img,
      tasks: currentFormValues.tasks,
    };

    // Mark post-save redirect as intentional so blocker won't show confirmation.
    isIntentionalNavigationRef.current = true;
    nav("/tasks/list");
  });

  const buildCombinedLatex = (version = "STUDENT") => {
    const values = getValues();
    const selectedCourse = (courses || []).find(
      (c) => c.id === values.courseId,
    );
    const tasks = values.tasks || [];

    const sections = [
      `\\section*{${t("topics.previewDocTitle")}}`,
      values.topic ? `\\textbf{${t("common.topic")}:} ${values.topic}\\\\` : "",
      selectedCourse
        ? `\\textbf{${t("common.course")}:} ${selectedCourse.title} (${selectedCourse.shortName})\\\\`
        : "",
      `\\textbf{${t("common.points")}:} ${Number(values.points || 0)}\\\\`,
      `\\subsection*{${t("common.description")}}`,
      values.description || "",
    ];

    tasks.forEach((task, index) => {
      sections.push(
        `\\subsection*{${t("topics.taskLabel", { index: index + 1 })}}`,
      );
      sections.push(task?.question || "");
      if (version === "TEACHER") {
        sections.push(`\\paragraph{${t("common.solution")}}`);
        sections.push(task?.solution || "");
      }
      sections.push(
        `\\textbf{${t("common.points")}:} ${Number(task?.points || 0)}\\\\`,
      );
    });

    return sections.filter(Boolean).join("\n\n");
  };

  const compilePreview = async (version) => {
    if (hasPointsValidationError) return;
    const latexContent = buildCombinedLatex(version);

    clearPdf();
    setCompilerMessages(null);
    setCompiledVersion(version);
    setIsCompiling(true);

    try {
      const response = await examsApi.compileLatexOnly({ latexContent });
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

  const resetForm = () => {
    form.reset(initialValuesRef.current);
    setCompiledVersion(null);
    setCompilerMessages(null);
    clearPdf();
    setIsEditable(true);
  };

  const hasUnsavedChanges = () => {
    const currentValues = {
      courseId: form.getValues("courseId"),
      topic: form.getValues("topic"),
      description: form.getValues("description"),
      points: form.getValues("points"),
      tasks: form.getValues("tasks"),
    };
    return (
      JSON.stringify(currentValues) !==
      JSON.stringify({
        courseId: initialValuesRef.current.courseId,
        topic: initialValuesRef.current.topic,
        description: initialValuesRef.current.description,
        points: initialValuesRef.current.points,
        tasks: initialValuesRef.current.tasks,
      })
    );
  };

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

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setConfirmDialog({ open: true, action: "cancel" });
    } else {
      nav("/tasks/list");
    }
  };

  const handleConfirmDialogConfirm = () => {
    const action = confirmDialog.action;
    setConfirmDialog({ open: false, action: null });

    if (action === "cancel") {
      isIntentionalNavigationRef.current = true;
      nav("/tasks/list");
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "95vh",
      }}
    >
      <PageHeader
        title={
          <>
            {isEditMode ? t("topics.editTitle") : t("topics.createTitle")}
            {hasPointsValidationError && (
              <Box
                component="span"
                sx={{ ml: 2, color: "error.main", fontSize: 14 }}
              >
                {t("common.sumOfTaskPoints")}{" "}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {topicPointsValidation.taskPoints}
                </Box>{" "}
                {t("exams.pts")} {t("common.mustEqual")}{" "}
                {t("common.topicPointsLabel")}{" "}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {topicPointsValidation.topicPoints}
                </Box>{" "}
                {t("exams.pts")}
              </Box>
            )}
          </>
        }
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
              disabled={
                createM.isPending ||
                updateM.isPending ||
                !isEditable ||
                hasPointsValidationError
              }
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
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                    ></Typography>
                    <CompileButton
                      disabled={!isEditable || hasPointsValidationError}
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
                          md: "40% 40% 15%",
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
                              const title = option.title || "";
                              const shortName = option.shortName
                                ? ` (${option.shortName})`
                                : "";
                              return `${title}${shortName}`.trim();
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={
                                  <RequiredLabel label={t("common.course")} />
                                }
                                error={!!formState.errors.courseId}
                                helperText={formState.errors.courseId?.message}
                                placeholder={t("common.selectCourse")}
                              />
                            )}
                          />
                        )}
                      />

                      <TextField
                        label={<RequiredLabel label={t("common.topic")} />}
                        fullWidth
                        size="small"
                        {...register("topic")}
                        error={!!formState.errors.topic}
                        helperText={formState.errors.topic?.message}
                        disabled={!isEditable}
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

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        {t("topics.descriptionLatex")}
                      </Typography>
                      <LatexEditor
                        value={descriptionValue}
                        onChange={(value) => {
                          if (!isEditable) return;
                          setValue("description", value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        height={220}
                        placeholder={t("topics.descriptionLatex")}
                      />
                      {formState.errors.description?.message ? (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{ mt: 0.75, display: "block" }}
                        >
                          {formState.errors.description.message}
                        </Typography>
                      ) : null}
                    </Box>

                    {/* <Box
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center"
                      sx={{ mb: 2 }}
                    >
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadIcon />}
                        className="justify-between"
                        fullWidth
                        size="small"
                        disabled={!isEditable}
                      >
                        {t("topics.uploadImage")}
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setDescriptionImage(e.target.files?.[0] || null)
                          }
                        />
                      </Button>
                    </Box> */}

                    <Box
                      className="rounded-2xl border p-4"
                      sx={{ overflow: "auto" }}
                    >
                      <Box className="flex items-center mb-4">
                        <Typography className="font-semibold">
                          {t("topics.taskBlockTitle")}
                        </Typography>
                      </Box>

                      <TaskEditor
                        control={control}
                        register={register}
                        setValue={setValue}
                        errors={formState.errors}
                        editable={isEditable}
                      />

                      <Box className="mt-4 flex justify-end">
                        <IconButton onClick={addTask} disabled={!isEditable}>
                          <AddIcon />
                        </IconButton>
                      </Box>
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
                        color: isDraggingSplit
                          ? "primary.main"
                          : "text.secondary",
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
