import { NavLink } from "react-router-dom";
import { Box, List, ListItemButton, ListItemText } from "@mui/material";

const items = [
  { label: "Exams", to: "/exams" },
  { label: "Courses", to: "/courses" },
  { label: "Tasks", to: "/tasks" },
];

export function Sidebar() {
  return (
    <Box
      sx={{
        bgcolor: "#9f9f9f",
        height: "100%",
        borderRight: "1px solid #8a8a8a",
      }}
    >
      <List disablePadding>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <ListItemButton
                sx={{
                  py: 2,
                  borderBottom: "1px solid rgba(255,255,255,0.25)",
                  bgcolor: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                  textAlign: "left",
                }}
              >
                <ListItemText
                  primary={it.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    color: "#111",
                  }}
                />
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>
    </Box>
  );
}
