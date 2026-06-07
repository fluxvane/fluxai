'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar, Toolbar, Box, Typography, IconButton, Avatar, Tooltip, Stack, Drawer,
  List, ListItemButton, ListItemIcon, ListItemText, Divider, Menu, MenuItem, Button,
} from '@mui/material';
import {
  AutoAwesome, ChatOutlined, AnalyticsOutlined, SettingsOutlined, LogoutOutlined,
  Menu as MenuIcon, AddOutlined, DeleteOutline,
} from '@mui/icons-material';
import { useSettings } from '@/contexts/SettingsContext';
import { useChat } from '@/hooks/useChat';
import SettingsDialog from './SettingsDialog';

const NAV_ITEMS = [
  { label: 'Chat', href: '/chat', icon: <ChatOutlined /> },
  { label: 'Analytics', href: '/analytics', icon: <AnalyticsOutlined /> },
];

interface AppShellProps {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function AppShell({ children, rightSlot }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, clear, hasSettings } = useSettings();
  const { messages, clear: clearChat } = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  React.useEffect(() => {
    if (hasSettings) {
      const stored = localStorage.getItem('flux_ai_conversations');
      if (stored) {
        try {
          const list = JSON.parse(stored) as Array<{ id: string; title: string; updatedAt: string; messages: typeof messages }>;
          // Hydrate is best-effort, no need to do anything here
          void list;
        } catch {}
      }
    }
  }, [hasSettings]);

  if (!hasSettings || !settings) {
    return null;
  }

  const handleNewChat = () => {
    if (messages.length > 0) {
      persistConversation(messages, settings.name);
    }
    clearChat();
  };

  const persistConversation = (msgs: typeof messages, userName: string) => {
    if (msgs.length === 0) return;
    const firstUser = msgs.find((m) => m.role === 'user')?.content ?? 'New chat';
    const title = firstUser.slice(0, 60).replace(/\n/g, ' ');
    const list = readConversations();
    const entry = {
      id: `conv-${Date.now()}`,
      title,
      updatedAt: new Date().toISOString(),
      userName,
      messages: msgs,
    };
    list.unshift(entry);
    localStorage.setItem('flux_ai_conversations', JSON.stringify(list.slice(0, 50)));
  };

  const handleLogout = () => {
    if (messages.length > 0) persistConversation(messages, settings.name);
    clear();
    clearChat();
    setMenuAnchor(null);
    router.replace('/login');
  };

  const initial = settings.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(9, 9, 11, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(161, 161, 170, 0.08)',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ color: 'text.primary', display: { xs: 'inline-flex', md: 'inline-flex' } }}
          >
            <MenuIcon />
          </IconButton>

          <Stack
            direction="row"
            spacing={1.2}
            alignItems="center"
            component={Link}
            href="/chat"
            sx={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(139,92,246,0.4)',
              }}
            >
              <AutoAwesome sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
              Flux AI
            </Typography>
          </Stack>

          <Box sx={{ flex: 1 }} />

          {rightSlot}

          <Tooltip title="Settings">
            <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: 'text.primary' }}>
              <SettingsOutlined />
            </IconButton>
          </Tooltip>

          <Tooltip title={settings.name}>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
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
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            background: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(161, 161, 170, 0.12)',
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
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              }}
            >
              {initial}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>{settings.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {settings.endpoint}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ borderColor: 'rgba(161, 161, 170, 0.08)' }} />
        <MenuItem onClick={() => { setSettingsOpen(true); setMenuAnchor(null); }}>
          <ListItemIcon><SettingsOutlined fontSize="small" /></ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutOutlined fontSize="small" /></ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: 'rgba(24, 24, 27, 0.92)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(161, 161, 170, 0.08)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => { handleNewChat(); setDrawerOpen(false); }}
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
                    '&.Mui-selected': {
                      background: 'rgba(139, 92, 246, 0.12)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.light' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 600 : 500 }} />
                </ListItemButton>
              );
            })}
          </List>

          <Divider sx={{ my: 2, borderColor: 'rgba(161, 161, 170, 0.08)' }} />

          <ConversationList onSelect={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}

interface ConversationEntry {
  id: string;
  title: string;
  updatedAt: string;
  userName: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string; model?: string }>;
}

function readConversations(): ConversationEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('flux_ai_conversations');
    return raw ? (JSON.parse(raw) as ConversationEntry[]) : [];
  } catch {
    return [];
  }
}

function ConversationList({ onSelect }: { onSelect: () => void }) {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const { setMessages: setChatMessages } = useChat();
  const router = useRouter();

  React.useEffect(() => {
    setConversations(readConversations());
    const handler = () => setConversations(readConversations());
    window.addEventListener('storage', handler);
    window.addEventListener('flux_ai:conversations-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('flux_ai:conversations-changed', handler);
    };
  }, []);

  const handleOpen = (entry: ConversationEntry) => {
    setChatMessages(entry.messages as never);
    onSelect();
    router.push('/chat');
  };

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const next = conversations.filter((c) => c.id !== id);
    localStorage.setItem('flux_ai_conversations', JSON.stringify(next));
    setConversations(next);
    window.dispatchEvent(new Event('flux_ai:conversations-changed'));
  };

  if (conversations.length === 0) {
    return (
      <Box sx={{ px: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
          No saved conversations yet
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontWeight: 600, letterSpacing: '0.08em' }}>
        Recent
      </Typography>
      <List dense sx={{ mt: 0.5 }}>
        {conversations.map((c) => (
          <ListItemButton
            key={c.id}
            onClick={() => handleOpen(c)}
            sx={{ borderRadius: 2, mb: 0.5, pr: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
              <ChatOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={c.title}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 500,
                noWrap: true,
                sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
              }}
              secondary={new Date(c.updatedAt).toLocaleDateString()}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={(e) => handleDelete(c.id, e)}
                sx={{ color: 'text.secondary', opacity: 0.6, '&:hover': { opacity: 1, color: 'error.main' } }}
              >
                <DeleteOutline sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </ListItemButton>
        ))}
      </List>
    </>
  );
}
