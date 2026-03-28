import { NavLink, useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  AccountCircleOutlined,
  AssignmentOutlined,
  ChevronLeft,
  ChevronRight,
  LogoutOutlined,
  SchoolOutlined,
  TaskOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { SidebarCustomize } from "./SidebarCustomize";
import {
  clearAuthSession,
  getAuthDisplayName,
} from "../../features/auth/authSession";

export function Sidebar({ isCollapsed, onToggle }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const displayName = getAuthDisplayName() || t("sidebar.user");

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

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

      <Box sx={{ mt: "auto" }}>
        <SidebarCustomize isCollapsed={isCollapsed} />

        <Tooltip
          title={isCollapsed ? displayName : ""}
          placement="right"
          disableHoverListener={!isCollapsed}
        >
          <Box
            sx={{
              minHeight: 84,
              px: isCollapsed ? 1 : 1.5,
              py: 1,
              borderTop: `1px solid ${alpha(sidebarText, 0.16)}`,
              bgcolor: alpha(sidebarText, 0.08),
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: isCollapsed ? "100%" : "10%",
                minWidth: isCollapsed ? 0 : 24,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <AccountCircleOutlined fontSize="medium" />
            </Box>

            {!isCollapsed && (
              <Box
                sx={{
                  width: "90%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ lineHeight: 1.3 }}
                  noWrap
                >
                  {displayName}
                </Typography>

                <Button
                  onClick={handleLogout}
                  variant="text"
                  color="inherit"
                  size="small"
                  endIcon={<LogoutOutlined fontSize="small" />}
                  sx={{
                    px: 0,
                    minWidth: 0,
                    justifyContent: "flex-start",
                    textTransform: "none",
                    alignSelf: "flex-start",
                    color: sidebarText,
                    opacity: 0.92,
                    "&:hover": {
                      bgcolor: "transparent",
                      opacity: 1,
                    },
                  }}
                >
                  {t("sidebar.logout")}
                </Button>
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
