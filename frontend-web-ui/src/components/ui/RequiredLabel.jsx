import { Box } from "@mui/material";

export function RequiredLabel({ label }) {
  return (
    <>
      {label}
      <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>
        *
      </Box>
    </>
  );
}
