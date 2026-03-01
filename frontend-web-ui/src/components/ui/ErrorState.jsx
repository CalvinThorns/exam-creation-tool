import { Alert } from "@mui/material";

export function ErrorState({ message }) {
  return <Alert severity="error">{message}</Alert>;
}
