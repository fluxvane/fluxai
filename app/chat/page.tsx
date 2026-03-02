'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Analytics as AnalyticsIcon,
  SmartToy as SmartToyIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import ChatInterface from '@/components/ChatInterface';
import ConversationHistory from '@/components/ConversationHistory';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

const DRAWER_WIDTH = 320;

export default function ChatPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const { user, logout } = useAuth();

  const handleConversationSelect = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    if (isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(undefined);
  }, []);

  return (
    <AuthGuard>
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <SmartToyIcon color="primary" />
          <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
            NERA AI
          </Typography>
          <Tooltip title="Analytics">
            <IconButton component={Link} href="/analytics" sx={{ color: 'text.secondary' }}>
              <AnalyticsIcon />
            </IconButton>
          </Tooltip>
          {user && (
            <Tooltip title={`Sign out (${user.email})`}>
              <IconButton onClick={logout} sx={{ color: 'text.secondary' }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
            mt: '64px',
            height: 'calc(100% - 64px)',
          },
        }}
      >
        <ConversationHistory
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          activeConversationId={activeConversationId}
        />
      </Drawer>

      {/* Main Chat Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          pt: '64px',
          overflow: 'hidden',
          transition: 'margin 0.2s ease',
          ml: drawerOpen && !isMobile ? `${DRAWER_WIDTH}px` : 0,
        }}
      >
        <ChatInterface conversationId={activeConversationId} />
      </Box>
    </Box>
    </AuthGuard>
  );
}
