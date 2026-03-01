import { Paper, Typography } from "@mui/material";

export function EmptyState({ title = "No data", hint }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 1 }}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {hint ? <Typography sx={{ opacity: 0.8 }}>{hint}</Typography> : null}
    </Paper>
  );
}
