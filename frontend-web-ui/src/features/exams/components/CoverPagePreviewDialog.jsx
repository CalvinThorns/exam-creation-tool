import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import SaveIcon from "@mui/icons-material/Save";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { LatexEditor } from "../../../components/ui/LatexEditor";
import { PdfPreviewPanel } from "../../../components/ui/PdfPreviewPanel";
import { useTranslation } from "react-i18next";

const DEFAULT_SPLIT_PERCENT = 50;
const COLLAPSE_THRESHOLD_PERCENT = 10;

export function CoverPagePreviewDialog({
  open,
  onClose,
  coverPageValue,
  onCoverPageChange,
  onCompile,
  isCompiling,
  pdfUrl,
  compilerMessages,
  onSave,
  disableActions,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [collapsedPane, setCollapsedPane] = useState(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef(null);

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

  const leftPanelWidth =
    collapsedPane === "right" ? "100%" : `${splitPercent}%`;
  const rightPanelWidth =
    collapsedPane === "left" ? "100%" : `${100 - splitPercent}%`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>{t("coverPageDialog.title")}</DialogTitle>

      <DialogContent dividers>
        <Box
          ref={splitContainerRef}
          sx={{
            display: "flex",
            gap: 0,
            height: "70vh",
            minHeight: 520,
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
              <Tooltip title={t("coverPageDialog.expandEditor")}>
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
                  onClick={onCompile}
                  disabled={isCompiling || disableActions}
                >
                  {isCompiling
                    ? t("common.compiling")
                    : t("common.compilePreview")}
                </Button>
              </Stack>

              <Box sx={{ flex: 1, minHeight: 0 }}>
                <LatexEditor
                  value={coverPageValue}
                  onChange={onCoverPageChange}
                  height="100%"
                  placeholder={t("coverPageDialog.placeholder")}
                />
              </Box>
            </Box>
          )}

          {collapsedPane === null && (
            <Box
              onMouseDown={startSplitDrag}
              role="separator"
              aria-orientation="vertical"
              aria-label={t("coverPageDialog.resizeAria")}
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
                <Tooltip title={t("coverPageDialog.closeCover")}>
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
                hideDownload
                isLoading={isCompiling}
                compilerMessages={compilerMessages}
                loadingText={t("coverPageDialog.compilingPreview")}
                emptyText={t("coverPageDialog.emptyPreview")}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose}>{t("common.close")}</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={disableActions}
        >
          {t("coverPageDialog.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
