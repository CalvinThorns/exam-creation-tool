import { useCallback, useMemo, useState } from "react";

export function useDialogState(initialData = null) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(initialData);

  const openDialog = useCallback(
    (nextData = initialData) => {
      setData(nextData);
      setOpen(true);
    },
    [initialData],
  );

  const closeDialog = useCallback(() => {
    setOpen(false);
    setData(initialData);
  }, [initialData]);

  return useMemo(
    () => ({
      open,
      data,
      openDialog,
      closeDialog,
      setData,
      setOpen,
    }),
    [closeDialog, data, open, openDialog],
  );
}
