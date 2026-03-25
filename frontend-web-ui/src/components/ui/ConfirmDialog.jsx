import { Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AppDialog } from "./AppDialog";

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
    <AppDialog
      open={open}
      onClose={onCancel}
      title={title || t("confirmDialog.confirm")}
      maxWidth="xs"
      actions={
        <>
          <Button color="secondary" variant="contained" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button color="error" variant="contained" onClick={onConfirm}>
            {resolvedConfirmText}
          </Button>
        </>
      }
    >
      <Typography>{message}</Typography>
    </AppDialog>
  );
}
