import { NavLink } from "react-router-dom";
import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  AssignmentOutlined,
  ChevronLeft,
  ChevronRight,
  SchoolOutlined,
  TaskOutlined,
} from "@mui/icons-material";

const items = [
  { label: "Exams", to: "/exams", icon: AssignmentOutlined },
  { label: "Courses", to: "/courses", icon: SchoolOutlined },
  { label: "Tasks", to: "/tasks", icon: TaskOutlined },
];

export function Sidebar({ isCollapsed, onToggle }) {
  return (
    <Box
      sx={{
        height: "100%",
        bgcolor: "#102542",
        color: "#e8efff",
        borderRight: "1px solid rgba(232,239,255,0.12)",
        display: "flex",
        flexDirection: "column",
      }}
      component="nav"
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: isCollapsed ? "center" : "flex-end",
          px: 1,
          py: 1,
        }}
      >
        <IconButton
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          size="small"
          sx={{ color: "#e8efff" }}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>

      <List disablePadding>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Tooltip
                title={it.label}
                placement="right"
                disableHoverListener={!isCollapsed}
              >
                <ListItemButton
                  selected={isActive}
                  sx={{
                    minHeight: 48,
                    px: isCollapsed ? 1.5 : 2,
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    color: "#e8efff",
                    "&.Mui-selected": {
                      bgcolor: "rgba(255,255,255,0.14)",
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: "rgba(255,255,255,0.2)",
                    },
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isCollapsed ? 0 : 1.5,
                      justifyContent: "center",
                      color: "inherit",
                    }}
                  >
                    <it.icon fontSize="small" />
                  </ListItemIcon>
                  {!isCollapsed && <ListItemText primary={it.label} />}
                </ListItemButton>
              </Tooltip>
            )}
          </NavLink>
        ))}
      </List>
    </Box>
  );
}
