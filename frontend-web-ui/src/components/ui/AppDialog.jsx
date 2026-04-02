import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

export function AppDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
  fullWidth = true,
  contentDividers = false,
  contentSx,
  actionsSx,
  titleSx,
  PaperProps,
  disableEscapeKeyDown = true,
  ...dialogProps
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      disableEscapeKeyDown={disableEscapeKeyDown}
      onBackdropClick={() => {}}
      PaperProps={PaperProps}
      {...dialogProps}
    >
      {title ? <DialogTitle sx={titleSx}>{title}</DialogTitle> : null}
      <DialogContent dividers={contentDividers} sx={contentSx}>
        {children}
      </DialogContent>
      {actions ? <DialogActions sx={actionsSx}>{actions}</DialogActions> : null}
    </Dialog>
  );
}
