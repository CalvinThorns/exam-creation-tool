import { Paper, CircularProgress, Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export function Loader({ label }) {
  const { t } = useTranslation();
  const resolvedLabel = label || t("common.loading");

  return (
    <Paper sx={{ p: 3, borderRadius: 1 }}>
      <Box className="flex items-center gap-3">
        <CircularProgress size={22} />
        <Typography>{resolvedLabel}</Typography>
      </Box>
    </Paper>
  );
}
