import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#111111" },
    secondary: { main: "#666666" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: ["Inter", "system-ui", "Arial", "sans-serif"].join(","),
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});
