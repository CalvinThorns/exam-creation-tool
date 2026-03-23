import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

function buildGroupedMessages(compilerMessages) {
  const errors = compilerMessages?.errors || [];
  const warnings = compilerMessages?.warnings || [];

  const normalizedMessages = [
    ...errors.map((item, index) => ({
      key: `error-${index}`,
      severity: "error",
      title: item?.message || "Compiler error",
      subtitle:
        typeof item?.line === "number" ? `Line ${item.line}` : "Compile step",
      details: item?.snippet || null,
    })),
    ...warnings.map((item, index) => ({
      key: `warning-${index}`,
      severity: "warning",
      title: item?.message || "Compiler warning",
      subtitle: [item?.where, item?.source].filter(Boolean).join(" • "),
      details: item?.snippet || null,
    })),
  ];

  return Object.values(
    normalizedMessages.reduce((acc, item) => {
      const identity = [item.severity, item.title, item.subtitle, item.details]
        .filter(Boolean)
        .join("||");

      if (!acc[identity]) {
        acc[identity] = {
          ...item,
          count: 1,
        };
      } else {
        acc[identity].count += 1;
      }

      return acc;
    }, {}),
  );
}

export function CompilerMessagesPanel({
  compilerMessages,
  title = "Compiler",
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [activeMessageKey, setActiveMessageKey] = useState(null);
  const [showFullLog, setShowFullLog] = useState(false);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const errorCount = Number(
    compilerMessages?.errorCount ?? compilerMessages?.errors?.length ?? 0,
  );
  const warningCount = Number(
    compilerMessages?.warningCount ?? compilerMessages?.warnings?.length ?? 0,
  );

  const hasCompilerMessages =
    Boolean(compilerMessages) &&
    (errorCount > 0 || warningCount > 0 || Boolean(compilerMessages?.log));

  const groupedMessages = useMemo(
    () => buildGroupedMessages(compilerMessages),
    [compilerMessages],
  );

  const filteredMessages = groupedMessages.filter((message) => {
    if (filter === "all") return true;
    return message.severity === filter;
  });

  const toggleMessage = (key) => {
    setActiveMessageKey((prev) => (prev === key ? null : key));
  };

  const renderMessagesBody = ({
    inDialog = false,
    includeLog = true,
    listMaxHeight,
  } = {}) => (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ px: 1.25, py: 1, flexWrap: "wrap" }}
      >
        <Chip
          clickable
          label="All"
          color={filter === "all" ? "primary" : "default"}
          variant={filter === "all" ? "filled" : "outlined"}
          onClick={() => setFilter("all")}
          size="small"
        />
        <Chip
          clickable
          label="Errors"
          color={filter === "error" ? "error" : "default"}
          variant={filter === "error" ? "filled" : "outlined"}
          onClick={() => setFilter("error")}
          size="small"
        />
        <Chip
          clickable
          label="Warnings"
          color={filter === "warning" ? "warning" : "default"}
          variant={filter === "warning" ? "filled" : "outlined"}
          onClick={() => setFilter("warning")}
          size="small"
        />
      </Stack>

      <Box
        sx={{
          maxHeight: listMaxHeight ?? (inDialog ? "none" : 280),
          overflowY: "auto",
          px: 1,
          pb: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        {filteredMessages.length === 0 ? (
          <Alert severity="info" sx={{ mt: 0.5 }}>
            No messages for this filter.
          </Alert>
        ) : (
          filteredMessages.map((message) => {
            const isActive = activeMessageKey === message.key;
            const isError = message.severity === "error";
            const severityColor = isError
              ? theme.palette.error.main
              : theme.palette.warning.main;

            return (
              <Paper
                key={message.key}
                variant="outlined"
                sx={{
                  borderLeft: `4px solid ${severityColor}`,
                  bgcolor: isError
                    ? alpha(theme.palette.error.main, 0.1)
                    : alpha(theme.palette.warning.main, 0.16),
                  px: 1,
                  py: 0.9,
                }}
              >
                <Stack spacing={0.7}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip
                        size="small"
                        label={isError ? "Error" : "Warning"}
                        color={isError ? "error" : "warning"}
                        sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                      />
                      {message.count > 1 ? (
                        <Chip
                          size="small"
                          label={`Repeated ×${message.count}`}
                          variant="outlined"
                          sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                        />
                      ) : null}
                    </Stack>

                    {message.details ? (
                      <Button
                        size="small"
                        onClick={() => toggleMessage(message.key)}
                        sx={{ textTransform: "none", minWidth: 0, px: 0.75 }}
                      >
                        {isActive ? "Hide details" : "Show details"}
                      </Button>
                    ) : null}
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.35,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {message.title}
                  </Typography>

                  {message.subtitle ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                    >
                      {message.subtitle}
                    </Typography>
                  ) : null}

                  <Collapse in={isActive} timeout="auto" unmountOnExit>
                    <Typography
                      component="pre"
                      variant="caption"
                      sx={{
                        m: 0,
                        mt: 0.5,
                        p: 0.9,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.common.black, 0.04),
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                        color: "text.primary",
                        maxHeight: 180,
                        overflow: "auto",
                      }}
                    >
                      {message.details}
                    </Typography>
                  </Collapse>
                </Stack>
              </Paper>
            );
          })
        )}

        {includeLog && compilerMessages?.log ? (
          <Box sx={{ pt: 0.5 }}>
            <Button
              size="small"
              onClick={() => setShowFullLog((prev) => !prev)}
              sx={{ textTransform: "none" }}
            >
              {showFullLog
                ? "Hide full compiler log"
                : "Show full compiler log"}
            </Button>
            <Collapse in={showFullLog} timeout="auto" unmountOnExit>
              <Alert severity="info" sx={{ mt: 0.75 }}>
                <Typography
                  component="pre"
                  variant="caption"
                  sx={{
                    m: 0,
                    mt: 0.5,
                    maxHeight: inDialog ? 360 : 240,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                  }}
                >
                  {compilerMessages.log}
                </Typography>
              </Alert>
            </Collapse>
          </Box>
        ) : null}
      </Box>
    </>
  );

  if (!hasCompilerMessages) {
    return null;
  }

  return (
    <Box
      sx={{
        flexShrink: 0,
        mb: 1.5,
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
      }}
    >
      <Stack direction="row" alignItems="stretch" spacing={0.5} sx={{ p: 0.5 }}>
        <Button
          fullWidth
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            justifyContent: "space-between",
            textTransform: "none",
            py: 0.75,
            px: 1,
            borderRadius: 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <DescriptionIcon
              fontSize="small"
              sx={{ color: "text.secondary" }}
            />
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {title}
            </Typography>
            <Chip
              size="small"
              color={errorCount > 0 ? "error" : "default"}
              icon={<ErrorOutlineIcon style={{ fontSize: 14 }} />}
              label={`${errorCount} error${errorCount === 1 ? "" : "s"}`}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              color={warningCount > 0 ? "warning" : "default"}
              icon={<WarningAmberIcon style={{ fontSize: 14 }} />}
              label={`${warningCount} warning${warningCount === 1 ? "" : "s"}`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </Button>

        <IconButton
          size="small"
          onClick={() => setDialogOpen(true)}
          aria-label="Open compiler messages dialog"
          sx={{
            width: 32,
            height: 32,
            alignSelf: "center",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <OpenInFullIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        {renderMessagesBody()}
      </Collapse>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            height: "85vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <DescriptionIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
              <Typography variant="h6" component="span">
                {title}
              </Typography>
              <Chip
                size="small"
                color={errorCount > 0 ? "error" : "default"}
                label={`${errorCount} error${errorCount === 1 ? "" : "s"}`}
              />
              <Chip
                size="small"
                color={warningCount > 0 ? "warning" : "default"}
                label={`${warningCount} warning${warningCount === 1 ? "" : "s"}`}
              />
            </Stack>

            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0.75 }}>
          <Box
            sx={{
              height: "100%",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1,
              minHeight: 0,
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ px: 1.25, py: 1, fontWeight: 700 }}
              >
                Errors & warnings
              </Typography>
              <Divider />
              <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                {renderMessagesBody({
                  inDialog: true,
                  includeLog: false,
                  listMaxHeight: "100%",
                })}
              </Box>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ px: 1.25, py: 1, fontWeight: 700 }}
              >
                Full output log
              </Typography>
              <Divider />
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1 }}>
                <Typography
                  component="pre"
                  variant="caption"
                  sx={{
                    m: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                  }}
                >
                  {compilerMessages?.log || "No compiler log available."}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
