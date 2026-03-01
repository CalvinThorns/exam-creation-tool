import { Paper, CircularProgress, Box, Typography } from "@mui/material";

export function Loader({ label = "Loading..." }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 1 }}>
      <Box className="flex items-center gap-3">
        <CircularProgress size={22} />
        <Typography>{label}</Typography>
      </Box>
    </Paper>
  );
}
