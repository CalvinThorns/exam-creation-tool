import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";

export function CustomizeDialog({ open, onClose, onEditBaseLatex }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Customize</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
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
