import { NavLink } from "react-router-dom";
import { Box, List, ListItemButton, ListItemText } from "@mui/material";

const items = [
  { label: "Exams", to: "/exams" },
  { label: "Courses", to: "/courses" },
  { label: "Tasks", to: "/tasks" },
];

export function Sidebar() {
  return (
    <Box sx={{ height: "100%" }} component="nav">
      <List disablePadding>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <ListItemButton selected={isActive}>
                <ListItemText primary={it.label} />
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>
    </Box>
  );
}
