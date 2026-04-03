import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema } from "../../utils/validators";
import { examsApi } from "../../api/exams.api";
import { LatexEditor } from "../../components/ui/LatexEditor";
import { PdfPreviewPanel } from "../../components/ui/PdfPreviewPanel";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RequiredLabel } from "../../components/ui/RequiredLabel";
import { PageHeader } from "../../components/ui/PageHeader";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loader } from "../../components/ui/Loader";
import { usePdfPreview } from "../../hooks/usePdfPreview";
import { useCourse, useCreateCourse, useUpdateCourse } from "./courses.hooks";
import { useTranslation } from "react-i18next";
import {
  getCompileResultPayload,
  notifyCompileOutcome,
  toCompilerMessages,
} from "../../utils/compileDiagnostics";

const DEFAULT_SPLIT_PERCENT = 50;
const COLLAPSE_THRESHOLD_PERCENT = 10;

export function CourseFormPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const nav = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const {
    data: courseData,
    isLoading,
    error,
  } = useCourse(id, {
    enabled: isEditMode,
  });
  const createM = useCreateCourse();
  const updateM = useUpdateCourse();

  const form = useForm({
    resolver: zodResolver(courseSchema(t)),
    defaultValues: {
      title: "",
      coverPage: "",
      topics: [],
    },
  });

  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilerMessages, setCompilerMessages] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
  });

  const initialValuesRef = useRef({
    title: "",
    coverPage: "",
    topics: [],
  });
  const splitContainerRef = useRef(null);
  const blockerRef = useRef(null);
  const blockedLocationRef = useRef(null);
  const isIntentionalNavigationRef = useRef(false);
  const { pdfUrl, setPdfFromBase64, clearPdf } =
    usePdfPreview("cover-page.pdf");

  const {
    control,
    formState,
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
  } = form;

  const coverPageValue = useWatch({ control, name: "coverPage" }) || "";
  const { fields: topicFields, append: appendTopic, remove: removeTopic } =
    useFieldArray({
      control,
      name: "topics",
    });

  useEffect(() => {
    if (!isEditMode) {
      const defaults = {
        title: "",
        coverPage: "",
        topics: [],
      };
      reset(defaults);
      initialValuesRef.current = defaults;
      clearPdf();
      setCompilerMessages(null);
      setCollapsedPane(null);
      setSplitPercent(DEFAULT_SPLIT_PERCENT);
      return;
    }

    const resolved = courseData?.data ?? courseData;
    if (!resolved) return;

    const hydrated = {
      title: String(resolved.title || ""),
      coverPage: String(resolved.coverPage || ""),
      topics: Array.isArray(resolved.topics) ? resolved.topics : [],
    };

    reset(hydrated);
    initialValuesRef.current = hydrated;
    clearPdf();
    setCompilerMessages(null);
    setCollapsedPane(null);
    setSplitPercent(DEFAULT_SPLIT_PERCENT);
  }, [clearPdf, courseData, isEditMode, reset]);

  useEffect(() => {
    if (!isDraggingSplit) return undefined;

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

  const normalizeTopics = (topics) =>
    (Array.isArray(topics) ? topics : []).map((topic) => String(topic || ""));

  const hasUnsavedChanges = () => {
    const currentValues = {
      title: String(getValues("title") || ""),
      coverPage: String(getValues("coverPage") || ""),
      topics: normalizeTopics(getValues("topics")),
    };

    return (
      JSON.stringify(currentValues) !== JSON.stringify(initialValuesRef.current)
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
  }, [blocker, confirmDialog.open]);

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

  const handleCancelClick = () => {
    if (hasUnsavedChanges()) {
      setConfirmDialog({ open: true, action: "cancel" });
      return;
    }
    nav("/courses/list");
  };

  const handleConfirmDialogConfirm = () => {
    const action = confirmDialog.action;
    setConfirmDialog({ open: false, action: null });

    if (action === "cancel") {
      isIntentionalNavigationRef.current = true;
      nav("/courses/list");
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

  const resetForm = () => {
    reset(initialValuesRef.current);
    clearPdf();
    setCompilerMessages(null);
  };

  const addTopicField = () => {
    appendTopic("", {
      shouldFocus: true,
    });
  };

  const removeTopicField = (index) => {
    removeTopic(index);
  };

  const compileCoverPage = async () => {
    const latexContent = String(getValues("coverPage") || "").trim();
    if (!latexContent) {
      clearPdf();
      setCompilerMessages(null);
      return;
    }

    clearPdf();
    setCompilerMessages(null);
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

  const loadTexFile = async (file) => {
    if (!file) return;
    const fileName = String(file.name || "").toLowerCase();
    if (!fileName.endsWith(".tex")) {
      return;
    }

    const content = await file.text();
    setValue("coverPage", content, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleTexUpload = async (event) => {
    const [file] = Array.from(event.target.files || []);
    try {
      await loadTexFile(file);
    } finally {
      event.target.value = "";
    }
  };

  const submit = handleSubmit(async (values) => {
    if (isEditMode) {
      await updateM.mutateAsync({ id, body: values });
    } else {
      await createM.mutateAsync(values);
    }

    initialValuesRef.current = {
      title: String(values.title || ""),
      coverPage: String(values.coverPage || ""),
      topics: normalizeTopics(values.topics),
    };

    nav("/courses/list");
  });

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}
    >
      <PageHeader
        title={isEditMode ? t("courses.editTitle") : t("courses.createTitle")}
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
              disabled={createM.isPending || updateM.isPending}
            >
              {t("common.save")}
            </Button>
          </Stack>
        }
      />

      {isEditMode && isLoading ? <Loader /> : null}
      {error ? (
        <ErrorState message={error.userMessage || error.message} />
      ) : null}

      {!error && !(isEditMode && isLoading) ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box
              ref={splitContainerRef}
              sx={{
                display: "flex",
                gap: 0,
                flex: 1,
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
                    {t("courses.coverPage")}
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
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <TextField
                    label={<RequiredLabel label={t("common.title")} />}
                    fullWidth
                    size="small"
                    {...register("title")}
                    error={!!formState.errors.title}
                    helperText={formState.errors.title?.message}
                  />

                  <Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {t("courses.courseTopics")}
                      </Typography>
                      <Button size="small" onClick={addTopicField}>
                        {t("courses.addTopic")}
                      </Button>
                    </Stack>

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                        alignItems: "flex-start",
                      }}
                    >
                      {topicFields.map((field, index) => (
                        <Stack
                          key={field.id}
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            px: 1,
                            py: 0.75,
                            bgcolor: "background.default",
                          }}
                        >
                          <TextField
                            size="small"
                            {...register(`topics.${index}`)}
                            error={Boolean(formState.errors.topics?.[index])}
                            helperText={formState.errors.topics?.[index]?.message}
                            placeholder={t("courses.addTopic")}
                            sx={{
                              width: 180,
                              "& .MuiFormHelperText-root": {
                                ml: 0,
                                mr: 0,
                              },
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeTopicField(index)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      gap={1}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {t("courses.coverPageLatex")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button variant="outlined" component="label" size="small">
                          {t("topics.uploadTexFile")}
                          <input
                            hidden
                            type="file"
                            accept=".tex,text/x-tex,application/x-tex"
                            onChange={handleTexUpload}
                          />
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          startIcon={
                            isCompiling ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <BuildIcon />
                            )
                          }
                          onClick={compileCoverPage}
                          disabled={isCompiling}
                        >
                          {isCompiling
                            ? t("common.compiling")
                            : t("common.compilePreview")}
                        </Button>
                      </Stack>
                    </Stack>

                    <Box sx={{ flex: 1, minHeight: 0 }}>
                      <LatexEditor
                        value={coverPageValue}
                        onChange={(value) => {
                          setValue("coverPage", value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        height="100%"
                        placeholder={t("courses.coverPageLatex")}
                      />
                    </Box>
                  </Box>
                </Box>
              )}

              {collapsedPane === null ? (
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
              ) : null}

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
                    loadingText={t("courses.compilingPreview")}
                    emptyText={t("courses.emptyPreview")}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      ) : null}

      <ConfirmDialog
        open={confirmDialog.open}
        title={t("courses.confirmCancelTitle")}
        message={t("courses.unsavedChangesMessage")}
        confirmText={t("courses.confirmYes")}
        onCancel={handleConfirmDialogCancel}
        onConfirm={handleConfirmDialogConfirm}
      />
    </Box>
  );
}
