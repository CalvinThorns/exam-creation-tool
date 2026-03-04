import { Outlet } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <Box className="min-h-screen">
      {/* <TopBar /> */}

      <Box className="grid min-h-screen w-full" sx={{ gridTemplateColumns: "150px minmax(0,1fr)" }}>
        <Sidebar />

        <Box className="w-full min-w-0 p-6">
          <Container maxWidth={false} disableGutters>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
