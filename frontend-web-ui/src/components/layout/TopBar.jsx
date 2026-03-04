import { AppBar, Toolbar, Typography } from "@mui/material";

export function TopBar() {
  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: "center", minHeight: 72 }}>
        <Typography variant="h5">AutoGenEx</Typography>
      </Toolbar>
    </AppBar>
  );
}
