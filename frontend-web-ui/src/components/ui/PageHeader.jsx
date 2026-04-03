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
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {typeof title === "string" ? (
            <Typography variant="h6">{title}</Typography>
          ) : (
            title
          )}
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            "& .MuiButton-root": {
              px: 2,
            },
          }}
        >
          {right}
        </Box>
      </Stack>
    </Paper>
  );
}
