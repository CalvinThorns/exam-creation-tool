import { useEffect, useRef, useState } from "react";
import {
  alpha,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema } from "../../utils/validators";
import { examsApi } from "../../api/exams.api";
import { LatexEditor } from "../../components/ui/LatexEditor";
import { PdfPreviewPanel } from "../../components/ui/PdfPreviewPanel";
import { usePdfPreview } from "../../hooks/usePdfPreview";
import { useTranslation } from "react-i18next";

const DEFAULT_SPLIT_PERCENT = 50;
const COLLAPSE_THRESHOLD_PERCENT = 10;

export function CourseFormDialog({
  open,
  onClose,
  initialValues,
  onSubmit,
  submitting,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const form = useForm({
    resolver: zodResolver(courseSchema(t)),
    defaultValues: { title: "", shortName: "", coverPage: "" },
  });
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilerMessages, setCompilerMessages] = useState(null);
  const splitContainerRef = useRef(null);
  const { pdfUrl, setPdfFromBase64, clearPdf } =
    usePdfPreview("cover-page.pdf");

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: initialValues?.title || "",
      shortName: initialValues?.shortName || "",
      coverPage: initialValues?.coverPage || "",
    });
    setCollapsedPane(null);
    setSplitPercent(DEFAULT_SPLIT_PERCENT);
    setCompilerMessages(null);
    clearPdf();
  }, [open, initialValues, form, clearPdf]);

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
  const coverPageValue = useWatch({ control, name: "coverPage" }) || "";

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

  const compileCoverPage = async () => {
    const coverPage = getValues("coverPage") || "";

    clearPdf();
    setCompilerMessages(null);
    setIsCompiling(true);

    try {
      const response = await examsApi.compileLatexOnly({
        latexContent: coverPage,
      });
      const compileData = response?.data || response || {};

      const { pdfBase64, filename, contentType, errors } = compileData;

      setPdfFromBase64({
        base64: pdfBase64,
        filename,
        mimeType: contentType || "application/pdf",
      });

      setCompilerMessages({
        clsiStatus: errors?.clsiStatus || null,
        buildId: errors?.buildId || null,
        errorCount: Number(errors?.errorCount ?? errors?.errors?.length ?? 0),
        warningCount: Number(
          errors?.warningCount ?? errors?.warnings?.length ?? 0,
        ),
        errors: errors?.errors || [],
        warnings: errors?.warnings || [],
        timings: errors?.timings || null,
        stats: errors?.stats || null,
        log: errors?.log || "",
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {initialValues ? t("courses.editTitle") : t("courses.addTitle")}
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "background.paper" }}>
        <Box className="flex flex-col gap-6">
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField
              label={t("common.title")}
              fullWidth
              {...register("title")}
              error={!!formState.errors.title}
              helperText={formState.errors.title?.message}
            />

            <TextField
              label={t("common.shortName")}
              fullWidth
              {...register("shortName")}
              error={!!formState.errors.shortName}
              helperText={formState.errors.shortName?.message}
            />
          </Box>

          <Box
            ref={splitContainerRef}
            sx={{
              display: "flex",
              gap: 0,
              height: "56vh",
              minHeight: 460,
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
                  gap: 1,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {t("courses.coverPageLatex")}
                  </Typography>
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

                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <LatexEditor
                    value={coverPageValue}
                    onChange={(value) =>
                      setValue("coverPage", value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    height="100%"
                    placeholder={t("courses.coverPageLatex")}
                  />
                </Box>

                {formState.errors.coverPage?.message ? (
                  <Typography variant="caption" color="error.main">
                    {formState.errors.coverPage.message}
                  </Typography>
                ) : null}
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
                  loadingText={t("courses.compilingPreview")}
                  emptyText={t("courses.emptyPreview")}
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button variant="contained" color="secondary" onClick={onClose}>
          {t("topics.cancelUpper")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit, (errors) => console.log("Form Validation Errors:", errors))}
          disabled={submitting}
        >
          {t("topics.saveUpper")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
