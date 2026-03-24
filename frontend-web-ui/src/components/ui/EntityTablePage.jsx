import { Box, Button, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { PageHeader } from "./PageHeader";
import { ErrorState } from "./ErrorState";
import { DataTable } from "./DataTable";

export function EntityTablePage({
  title,
  addLabel,
  onAdd,
  error,
  dataTableProps,
  addButtonProps,
  children,
}) {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "95vh", pb: 1 }}
    >
      <PageHeader
        title={title}
        right={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
            {...addButtonProps}
          >
            {addLabel}
          </Button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      {!error ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Paper sx={{ overflow: "hidden", p: 1, height: "100%" }}>
            <DataTable {...dataTableProps} />
          </Paper>
        </Box>
      ) : null}

      {children}
    </Box>
  );
}
