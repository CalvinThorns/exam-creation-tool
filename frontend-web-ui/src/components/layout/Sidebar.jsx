import { NavLink } from "react-router-dom";
import {
  alpha,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  AssignmentOutlined,
  ChevronLeft,
  ChevronRight,
  SchoolOutlined,
  TaskOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { SidebarCustomize } from "./SidebarCustomize";

export function Sidebar({ isCollapsed, onToggle }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const sidebarBackground =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.background.paper, 0.92)
      : theme.palette.primary.main;
  const sidebarText = theme.palette.getContrastText(sidebarBackground);
  const items = [
    {
      label: t("sidebar.exams"),
      to: "/exams/list",
      icon: AssignmentOutlined,
    },
    {
      label: t("sidebar.courses"),
      to: "/courses/list",
      icon: SchoolOutlined,
    },
    { label: t("sidebar.tasks"), to: "/tasks/list", icon: TaskOutlined },
  ];

  return (
    <Box
      sx={{
        height: "100%",
        bgcolor: sidebarBackground,
        color: sidebarText,
        borderRight: `1px solid ${alpha(sidebarText, 0.12)}`,
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
          aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          onClick={onToggle}
          size="small"
          sx={{ color: "inherit" }}
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
                    color: "inherit",
                    "&.Mui-selected": {
                      bgcolor: alpha(sidebarText, 0.16),
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: alpha(sidebarText, 0.22),
                    },
                    "&:hover": {
                      bgcolor: alpha(sidebarText, 0.12),
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

      <SidebarCustomize isCollapsed={isCollapsed} />
    </Box>
  );
}
