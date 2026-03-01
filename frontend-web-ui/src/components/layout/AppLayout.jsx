import { Outlet } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f0f0", width: "100vw" }}>
      {/* <TopBar /> */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "150px 1fr",
          // minHeight: "calc(100vh - 72px)",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <Sidebar />

        <Box sx={{ p: 3, width: "100%", minWidth: 0 }}>
          <Container maxWidth={false} disableGutters sx={{ width: "100%" }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
