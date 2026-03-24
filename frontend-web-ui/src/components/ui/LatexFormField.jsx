import { Typography } from "@mui/material";
import { LatexEditor } from "./LatexEditor";

export function LatexFormField({
  label,
  value,
  onChange,
  placeholder,
  height = 300,
  errorText,
  labelSx,
  errorSx,
  showLabel = true,
}) {
  return (
    <>
      {showLabel && label ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block", ...labelSx }}
        >
          {label}
        </Typography>
      ) : null}

      <LatexEditor
        value={value}
        onChange={onChange}
        height={height}
        placeholder={placeholder}
      />

      {errorText ? (
        <Typography
          variant="caption"
          color="error.main"
          sx={{ mt: 0.75, display: "block", ...errorSx }}
        >
          {errorText}
        </Typography>
      ) : null}
    </>
  );
}
