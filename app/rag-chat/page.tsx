'use client';

import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Logout as LogoutIcon,
  Storage as StorageIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import RagChatInterface from '@/components/RagChatInterface';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

export default function RagChatPage() {
  const { user, logout } = useAuth();

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* AppBar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <StorageIcon color="primary" />
            <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
              RAG Chat
            </Typography>
            <Tooltip title="General Chat">
              <IconButton component={Link} href="/chat" sx={{ color: 'text.secondary' }}>
                <ChatIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Knowledge Bases">
              <IconButton component={Link} href="/knowledge-bases" sx={{ color: 'text.secondary' }}>
                <StorageIcon />
              </IconButton>
            </Tooltip>
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

        {/* Main */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            pt: '64px',
            p: 2,
            overflow: 'hidden',
          }}
        >
          <RagChatInterface />
        </Box>
      </Box>
    </AuthGuard>
  );
}
