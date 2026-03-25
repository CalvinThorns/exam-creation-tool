import { Button } from "@mui/material";

export function DialogSubmitActions({
  cancelLabel,
  submitLabel,
  onCancel,
  onSubmit,
  submitting = false,
  cancelColor = "secondary",
  cancelVariant = "contained",
  submitVariant = "contained",
}) {
  return (
    <>
      <Button variant={cancelVariant} color={cancelColor} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant={submitVariant} onClick={onSubmit} disabled={submitting}>
        {submitLabel}
      </Button>
    </>
  );
}
