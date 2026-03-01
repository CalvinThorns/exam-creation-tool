import { AppBar, Toolbar, Typography } from "@mui/material";

export function TopBar() {
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: "#d9d9d9", borderBottom: "1px solid #c8c8c8" }}
    >
      <Toolbar sx={{ justifyContent: "center", height: 72 }}>
        <Typography variant="h3" sx={{ fontWeight: 600, letterSpacing: 1 }}>
          AutoGenEx
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
