"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  Stack,
  Drawer,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AutoAwesome,
  SettingsOutlined,
  LogoutOutlined,
  Menu as MenuIcon,
  MenuOpenOutlined,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import SettingsDialog from "./SettingsDialog";
import Sidebar from "./Sidebar";
import AuroraBackground from "./aurora/AuroraBackground";
import DisplayHeading from "./aurora/DisplayHeading";

const SIDEBAR_WIDTH = 280;
const SIDEBAR_PREF_KEY = "flux_ai:sidebar-open";

interface AppShellProps {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function AppShell({ children, rightSlot }: AppShellProps) {
  const router = useRouter();
  const theme = useTheme();
  // The shell only renders after the client-side auth check, so reading the
  // media query synchronously (noSsr) avoids a mobile-layout flash on desktop.
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const { user, hasConfig, isLoaded, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Route guard: bounce to login/config when prerequisites are missing.
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/login");
    else if (!hasConfig) router.replace("/config");
  }, [isLoaded, user, hasConfig, router]);

  // Restore the desktop sidebar preference.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_PREF_KEY);
      if (stored !== null) setDesktopOpen(stored === "1");
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);

  if (!isLoaded || !user || !hasConfig) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";
  const sidebarVisible = isDesktop ? desktopOpen : mobileOpen;
  const toggleLabel = isDesktop
    ? desktopOpen
      ? "Hide sidebar"
      : "Show sidebar"
    : "Open menu";

  const toggleSidebar = () => {
    if (!isDesktop) {
      setMobileOpen(true);
      return;
    }
    const next = !desktopOpen;
    setDesktopOpen(next);
    try {
      window.localStorage.setItem(SIDEBAR_PREF_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const handleLogout = async () => {
    setMenuAnchor(null);
    await logout();
    router.replace("/login");
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <AuroraBackground />
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "var(--surface)",
          backdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 1.5 } }}>
          <Tooltip title={toggleLabel}>
            <IconButton
              onClick={toggleSidebar}
              aria-expanded={sidebarVisible}
              sx={{ color: "text.primary" }}
            >
              {isDesktop && desktopOpen ? <MenuOpenOutlined /> : <MenuIcon />}
            </IconButton>
          </Tooltip>

          <Stack
            direction="row"
            spacing={1.2}
            alignItems="center"
            component={Link}
            href="/chat"
            aria-label="Flux AI home"
            sx={{ textDecoration: "none", color: "inherit", borderRadius: 1 }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "10px",
                background: "var(--gradient-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(118,185,0,0.4)",
              }}
            >
              <AutoAwesome sx={{ color: "#0c1006", fontSize: 18 }} />
            </Box>
            <DisplayHeading
              component="span"
              sx={{
                fontSize: 20,
                display: { xs: "none", sm: "block" },
              }}
            >
              Flux AI
            </DisplayHeading>
          </Stack>

          <Box sx={{ flex: 1 }} />

          {rightSlot}

          <Tooltip title="Settings">
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{
                color: "text.primary",
                // On phones Settings lives in the account menu to save room.
                display: { xs: "none", sm: "inline-flex" },
              }}
            >
              <SettingsOutlined />
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={!!menuAnchor}
              sx={{ p: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0c1006",
                  background: "var(--gradient-brand)",
                }}
              >
                {initial}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{ sx: { mt: 1, minWidth: 240, maxWidth: 300 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontWeight: 700,
                color: "#0c1006",
                background: "var(--gradient-brand)",
              }}
            >
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {user.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: "block" }}
              >
                {user.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ borderColor: "var(--border)" }} />
        <MenuItem
          onClick={() => {
            setSettingsOpen(true);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <SettingsOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        {isDesktop ? (
          <Box
            component="nav"
            aria-label="Sidebar"
            sx={{
              width: desktopOpen ? SIDEBAR_WIDTH : 0,
              flexShrink: 0,
              overflow: "hidden",
              borderRight: "1px solid",
              borderColor: desktopOpen ? "var(--border)" : "transparent",
              bgcolor: "rgba(11,15,10,0.55)",
              backdropFilter: "blur(20px)",
              transition:
                "width var(--dur-base) var(--ease-out), border-color var(--dur-base)",
            }}
          >
            {/* Fixed inner width so content doesn't reflow while collapsing;
                inert keeps the hidden links out of the tab order. */}
            <Box
              inert={!desktopOpen}
              sx={{ width: SIDEBAR_WIDTH, height: "100%" }}
            >
              <Sidebar onNavigate={() => {}} />
            </Box>
          </Box>
        ) : (
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            PaperProps={{
              component: "nav",
              "aria-label": "Sidebar",
              sx: {
                width: SIDEBAR_WIDTH,
                maxWidth: "85vw",
                background: "var(--surface-solid)",
                borderRight: "1px solid var(--border)",
              },
            }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            // Pages without their own scroller (analytics, generate-image)
            // scroll here. Chat fills this exactly (its message list scrolls
            // internally + pinned composer), so this never double-scrolls.
            overflowY: "auto",
          }}
        >
          {children}
        </Box>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
}
