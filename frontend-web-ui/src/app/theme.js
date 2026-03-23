import { createTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

export function createAppTheme(mode = "light") {
  const isDarkMode = mode === "dark";
  const primaryMain = isDarkMode ? "#93c5fd" : "#142247";
  const primaryDark = isDarkMode ? "#60a5fa" : "#1e40af";
  const primaryLight = isDarkMode ? "#bfdbfe" : "#3b82f6";
  const backgroundDefault = isDarkMode ? "#0b1220" : "#e6eaf2";
  const backgroundPaper = isDarkMode ? "#111827" : "#ffffff";
  const textPrimary = isDarkMode ? "#e2e8f0" : "#0f172a";
  const textSecondary = isDarkMode ? "#94a3b8" : "#4b5563";
  const dividerColor = isDarkMode
    ? alpha("#cbd5e1", 0.24)
    : alpha("#1e293b", 0.16);
  const inputBackground = isDarkMode
    ? alpha("#0b1220", 0.62)
    : alpha("#ffffff", 0.95);
  const inputBorder = isDarkMode
    ? alpha("#bfdbfe", 0.32)
    : alpha("#1e293b", 0.22);
  const inputHoverBorder = isDarkMode
    ? alpha("#bfdbfe", 0.62)
    : alpha("#1e293b", 0.45);
  const inputFocusBorder = isDarkMode ? "#93c5fd" : "#142247";

  return createTheme({
    palette: {
      mode,
      primary: {
        light: primaryLight,
        main: primaryMain,
        dark: primaryDark,
        contrastText: isDarkMode ? "#0b1220" : "#ffffff",
      },
      secondary: {
        light: isDarkMode ? "#a5f3fc" : "#38bdf8",
        main: isDarkMode ? "#67e8f9" : "#0ea5e9",
        dark: isDarkMode ? "#22d3ee" : "#0369a1",
        contrastText: isDarkMode ? "#042f3a" : "#ffffff",
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: dividerColor,
      action: {
        hover: isDarkMode ? alpha("#bfdbfe", 0.12) : alpha("#1e293b", 0.06),
        selected: isDarkMode ? alpha("#bfdbfe", 0.2) : alpha("#1e293b", 0.1),
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
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
          },
          containedPrimary: ({ theme }) => ({
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }),
          outlinedPrimary: ({ theme }) => ({
            borderColor:
              theme.palette.mode === "dark"
                ? alpha(theme.palette.primary.light, 0.68)
                : alpha(theme.palette.primary.main, 0.52),
            color: theme.palette.mode === "dark" ? "#bfdbfe" : "#1e40af",
            "&:hover": {
              borderColor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.light, 0.95)
                  : alpha(theme.palette.primary.dark, 0.72),
              backgroundColor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.light, 0.14)
                  : alpha(theme.palette.primary.main, 0.08),
            },
          }),
          textPrimary: ({ theme }) => ({
            color: theme.palette.mode === "dark" ? "#bfdbfe" : "#1e40af",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.light, 0.14)
                  : alpha(theme.palette.primary.main, 0.08),
            },
          }),
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: inputBackground,
            color: theme.palette.text.primary,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: inputBorder,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: inputHoverBorder,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: inputFocusBorder,
              borderWidth: 2,
            },
            "&.Mui-disabled": {
              opacity: 0.72,
            },
          }),
          input: ({ theme }) => ({
            color: theme.palette.text.primary,
            "&::placeholder": {
              color: alpha(theme.palette.text.secondary, 0.85),
              opacity: 1,
            },
          }),
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: alpha(theme.palette.text.secondary, 0.92),
            "&.Mui-focused": {
              color: theme.palette.primary.main,
            },
          }),
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: ({ theme }) => ({
            color: theme.palette.text.secondary,
          }),
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
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }),
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
}
