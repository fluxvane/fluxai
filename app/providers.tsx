'use client';

import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, alpha } from '@mui/material';
import 'highlight.js/styles/github-dark.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/hooks/useChat';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    secondary: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
    },
    background: {
      default: '#09090b',
      paper: '#18181b',
    },
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
    },
    divider: 'rgba(161, 161, 170, 0.08)',
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#3b82f6' },
  },
  typography: {
    fontFamily: 'var(--font-inter), "Inter", "SF Pro Display", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,0.18), transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.10), transparent 60%), #09090b',
          minHeight: '100vh',
        },
        '*': { boxSizing: 'border-box' },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: alpha('#a1a1aa', 0.2),
          borderRadius: 8,
        },
        '::-webkit-scrollbar-thumb:hover': { background: alpha('#a1a1aa', 0.35) },
        '@keyframes flux-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        '@keyframes flux-pulse': {
          '0%, 100%': { opacity: 0.4 },
          '50%': { opacity: 1 },
        },
        '@keyframes flux-blink': {
          '0%, 50%': { opacity: 1 },
          '50.01%, 100%': { opacity: 0 },
        },
        '@keyframes flux-fade-up': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        // Tighten markdown rendering inside chat bubbles.
        '.flux-markdown p': { margin: '0 0 0.75em' },
        '.flux-markdown p:last-child': { marginBottom: 0 },
        '.flux-markdown pre': {
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 12,
          padding: '14px 16px',
          overflow: 'auto',
          border: '1px solid rgba(161,161,170,0.12)',
          margin: '0 0 0.75em',
        },
        '.flux-markdown code': {
          fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
          fontSize: '0.88em',
        },
        '.flux-markdown :not(pre) > code': {
          background: 'rgba(161,161,170,0.14)',
          padding: '0.15em 0.4em',
          borderRadius: 6,
        },
        '.flux-markdown a': { color: '#a78bfa' },
        '.flux-markdown ul, .flux-markdown ol': { margin: '0 0 0.75em', paddingLeft: '1.4em' },
        '.flux-markdown li': { marginBottom: '0.25em' },
        '.flux-markdown table': { borderCollapse: 'collapse', margin: '0 0 0.75em', width: '100%' },
        '.flux-markdown th, .flux-markdown td': {
          border: '1px solid rgba(161,161,170,0.18)',
          padding: '6px 10px',
          textAlign: 'left',
        },
        '.flux-markdown blockquote': {
          borderLeft: '3px solid rgba(139,92,246,0.5)',
          margin: '0 0 0.75em',
          paddingLeft: '1em',
          color: '#a1a1aa',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          padding: '10px 20px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
            boxShadow: '0 6px 20px rgba(139,92,246,0.45)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'medium', variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          background: alpha('#ffffff', 0.03),
          backdropFilter: 'blur(10px)',
          '& fieldset': { borderColor: alpha('#a1a1aa', 0.15) },
          '&:hover fieldset': { borderColor: alpha('#a1a1aa', 0.3) },
          '&.Mui-focused fieldset': {
            borderColor: '#8b5cf6',
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 8 },
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={3000}
          >
            <ChatProvider>{children}</ChatProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
