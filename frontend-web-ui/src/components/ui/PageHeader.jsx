import { Paper, Stack, Typography, Box } from "@mui/material";

export function PageHeader({ title, right }) {
  return (
    <Paper sx={{ py: 1, px: 2, mb: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
      >
        <Typography variant="h6">{title}</Typography>

        <Box sx={{ flexShrink: 0 }}>{right}</Box>
      </Stack>
    </Paper>
  );
}
