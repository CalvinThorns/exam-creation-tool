import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { useColorMode } from "../../app/useColorMode";

export function CustomizeDialog({ open, onClose, onEditBaseLatex }) {
  const { mode, setMode } = useColorMode();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Customize</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel id="theme-mode-select-label">Mode</InputLabel>
            <Select
              labelId="theme-mode-select-label"
              id="theme-mode-select"
              value={mode}
              label="Mode"
              onChange={(event) => setMode(event.target.value)}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={onEditBaseLatex}>
            Edit base LaTeX file
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
