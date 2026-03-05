import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      light: "#3b82f6", // bright blue for hovers
      main: "#142247", // primary brand blue
      dark: "#1e40af", // darker blue for headers
    },
    secondary: {
      light: "#38bdf8",
      main: "#0ea5e9",
      dark: "#0369a1",
    },
    background: {
      default: "#e6eaf2", // light gray with a hint of blue
      paper: "#ffffff", // white panels
    },
    text: {
      primary: "#0f172a", // dark slate
      secondary: "#4b5563", // muted gray
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: ["Inter", "system-ui", "Arial", "sans-serif"].join(","),
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: "primary",
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.primary.dark,
        }),
      },
    },
  },
});
