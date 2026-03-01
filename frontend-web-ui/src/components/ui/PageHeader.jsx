import { Paper, Stack, Typography, Box } from "@mui/material";

export function PageHeader({ title, right }) {
  return (
    <Paper sx={{ bgcolor: "#d9d9d9", p: 2, borderRadius: 1, mb: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
      >
        <Typography
          sx={{ fontSize: 20, fontWeight: 800, whiteSpace: "nowrap" }}
        >
          {title}
        </Typography>

        <Box sx={{ flexShrink: 0 }}>{right}</Box>
      </Stack>
    </Paper>
  );
}
