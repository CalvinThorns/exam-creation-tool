import { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

export function PdfPreviewPanel({
  title = "Preview",
  pdfUrl,
  onDownload,
  isLoading = false,
  loadingText = "Compiling PDF…",
  emptyText = "Compile to see the PDF preview",
  downloadLabel = "Download",
  statusContent = null,
  iframeTitle = "PDF Preview",
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
            {title}
          </Typography>
          {statusContent}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={!pdfUrl || isLoading}
            onClick={onDownload}
          >
            {downloadLabel}
          </Button>
          <Tooltip title={expanded ? "Collapse" : "Expand"}>
            <IconButton
              size="small"
              onClick={() => setExpanded((prev) => !prev)}
            >
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
        {isLoading ? (
          <Stack alignItems="center" spacing={2}>
            <CircularProgress
              size={48}
              thickness={3}
              sx={{ color: "primary.main" }}
            />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {loadingText}
            </Typography>
          </Stack>
        ) : pdfUrl ? (
          <iframe
            title={iframeTitle}
            src={pdfUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <Stack alignItems="center" spacing={1} sx={{ opacity: 0.45 }}>
            <PictureAsPdfIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
