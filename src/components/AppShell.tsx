"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  AutoAwesome,
  ChatOutlined,
  AnalyticsOutlined,
  SettingsOutlined,
  LogoutOutlined,
  Menu as MenuIcon,
  AddOutlined,
  DeleteOutline,
  ImageOutlined,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import SettingsDialog from "./SettingsDialog";
import AuroraBackground from "./aurora/AuroraBackground";
import DisplayHeading from "./aurora/DisplayHeading";

const NAV_ITEMS = [
  { label: "Chat", href: "/chat", icon: <ChatOutlined /> },
  { label: "Generate Image", href: "/generate-image", icon: <ImageOutlined /> },
  { label: "Analytics", href: "/analytics", icon: <AnalyticsOutlined /> },
];

const CONVERSATIONS_CHANGED = "flux_ai:conversations-changed";

interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
  messageCount: number;
}

interface AppShellProps {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function AppShell({ children, rightSlot }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hasConfig, isLoaded, logout } = useAuth();
  const { newChat } = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Route guard: bounce to login/config when prerequisites are missing.
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/login");
    else if (!hasConfig) router.replace("/config");
  }, [isLoaded, user, hasConfig, router]);

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
        <CircularProgress />
      </Box>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  const handleLogout = async () => {
    setMenuAnchor(null);
    await logout();
    router.replace("/login");
  };

  const handleNewChat = () => {
    newChat();
    setDrawerOpen(false);
    router.push("/chat");
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
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "var(--surface)",
          backdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ color: "text.primary" }}
          >
            <MenuIcon />
          </IconButton>

          <Stack
            direction="row"
            spacing={1.2}
            alignItems="center"
            component={Link}
            href="/chat"
            sx={{ textDecoration: "none", color: "inherit" }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(139,92,246,0.4)",
              }}
            >
              <AutoAwesome sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <DisplayHeading
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
              sx={{ color: "text.primary" }}
            >
              <SettingsOutlined />
            </IconButton>
          </Tooltip>

          <Tooltip title={user.name}>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ p: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 14,
                  fontWeight: 700,
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
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
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 240,
            background: "rgba(24,24,27,0.96)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(161,161,170,0.12)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontWeight: 700,
                background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
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
                sx={{
                  display: "block",
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ borderColor: "rgba(161,161,170,0.08)" }} />
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

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 290,
            background: "var(--surface-solid)",
            backdropFilter: "blur(20px)",
            borderRight: "1px solid var(--border)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={handleNewChat}
            sx={{ mb: 2 }}
          >
            New chat
          </Button>
          <List dense>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={active}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    transition: "background var(--dur-fast) var(--ease-out)",
                    "&.Mui-selected": {
                      background: "rgba(139,92,246,0.12)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: active ? "primary.light" : "text.secondary",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 600 : 500 }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Divider sx={{ my: 2, borderColor: "rgba(161,161,170,0.08)" }} />

          <ConversationList onSelect={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
}

function ConversationList({ onSelect }: { onSelect: () => void }) {
  const router = useRouter();
  const { loadConversation, conversationId, newChat } = useChat();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          conversations: ConversationSummary[];
        };
        setConversations(data.conversations);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener(CONVERSATIONS_CHANGED, handler);
    return () => window.removeEventListener(CONVERSATIONS_CHANGED, handler);
  }, [load]);

  const handleOpen = async (id: string) => {
    await loadConversation(id);
    onSelect();
    router.push("/chat");
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(
      () => {},
    );
    if (id === conversationId) newChat();
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", py: 2 }}
      >
        No conversations yet
      </Typography>
    );
  }

  return (
    <>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 1, fontWeight: 600, letterSpacing: "0.08em" }}
      >
        Recent
      </Typography>
      <List dense sx={{ mt: 0.5 }}>
        <AnimatePresence initial={false}>
          {conversations.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <ListItemButton
                selected={c.id === conversationId}
                onClick={() => void handleOpen(c.id)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  pr: 1,
                  "&.Mui-selected": { background: "rgba(139,92,246,0.12)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
                  <ChatOutlined fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={c.title}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 500,
                    noWrap: true,
                    sx: { overflow: "hidden", textOverflow: "ellipsis" },
                  }}
                  secondary={`${c.messageCount} msgs · ${new Date(c.updatedAt).toLocaleDateString()}`}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={(e) => void handleDelete(c.id, e)}
                    sx={{
                      color: "text.secondary",
                      opacity: 0.6,
                      "&:hover": { opacity: 1, color: "error.main" },
                    }}
                  >
                    <DeleteOutline sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </List>
    </>
  );
}
