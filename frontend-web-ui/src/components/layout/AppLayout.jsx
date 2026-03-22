import { Outlet } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Box className="min-h-screen">
      {/* <TopBar /> */}

      <Box
        className="grid min-h-screen w-full"
        sx={{
          gridTemplateColumns: isSidebarCollapsed
            ? "72px minmax(0,1fr)"
            : "180px minmax(0,1fr)",
          transition: "grid-template-columns 0.2s ease-in-out",
        }}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((value) => !value)}
        />

        <Box className="w-full min-w-0 p-4">
          <Container maxWidth={false} disableGutters>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
