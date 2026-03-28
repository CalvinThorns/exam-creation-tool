import { useMemo, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { AppDialog } from "../../components/ui/AppDialog";
import { DataTable } from "../../components/ui/DataTable";
import { useUsers } from "./users.hooks";
import { useAddCollaborator } from "./courses.hooks";

export function AddCollaboratorsDialog({ open, courseId, onClose }) {
  const { t } = useTranslation();
  const { data, isLoading } = useUsers();
  const addCollaboratorM = useAddCollaborator();
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  const rows = useMemo(() => data?.data || [], [data]);

  const columns = useMemo(
    () => [
      { headerName: t("common.email"), field: "email" },
      { headerName: t("common.firstName"), field: "firstName" },
      { headerName: t("common.lastName"), field: "lastName" },
    ],
    [t],
  );

  const handleRowSelection = (e) => {
    const newSelected = new Set(selectedUsers);
    if (e.api.getSelectedRows().length > 0) {
      e.api.getSelectedRows().forEach((row) => {
        newSelected.add(row.id);
      });
    } else {
      newSelected.clear();
    }
    setSelectedUsers(newSelected);
  };

  const handleAddCollaborators = async () => {
    if (selectedUsers.size === 0) return;

    try {
      for (const userId of selectedUsers) {
        await addCollaboratorM.mutateAsync({ courseId, userId });
      }
      setSelectedUsers(new Set());
      onClose();
    } catch (error) {
      console.error("Error adding collaborators:", error);
    }
  };

  const gridOptions = {
    rowSelection: "multiple",
    suppressRowClickSelection: false,
    onSelectionChanged: handleRowSelection,
  };

  const actions = [
    <Button key="cancel" onClick={onClose} variant="outlined">
      {t("common.cancel")}
    </Button>,
    <Button
      key="add"
      onClick={handleAddCollaborators}
      variant="contained"
      disabled={selectedUsers.size === 0 || addCollaboratorM.isPending}
    >
      {t("common.add")}
    </Button>,
  ];

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={t("courses.addCollaborators")}
      maxWidth="md"
      actions={
        <Stack direction="row" spacing={1}>
          {actions}
        </Stack>
      }
    >
      <Box sx={{ height: 400, width: "100%" }}>
        <DataTable
          columnDefs={columns}
          rowData={rows}
          loading={isLoading}
          noRowsTitle={t("users.noRows")}
          noRowsHint={t("users.noRowsHint")}
          noFilteredRowsTitle={t("datatable.noMatchingResults")}
          noFilteredRowsHint={t("datatable.noFilteredHint")}
          gridOptions={gridOptions}
          height="100%"
        />
      </Box>
    </AppDialog>
  );
}
