import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

export function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText,
}) {
  const { t } = useTranslation();
  const resolvedConfirmText = confirmText || t("common.delete");

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title || t("confirmDialog.confirm")}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" variant="contained" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {resolvedConfirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
