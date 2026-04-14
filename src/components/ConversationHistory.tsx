'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Button,
  IconButton,
  Avatar,
  Chip,
  Tooltip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  List,
  ListItemButton,
  ListItemAvatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useConversations } from '../hooks/useConversations';
import type { Conversation } from '../types';

dayjs.extend(relativeTime);

interface ConversationHistoryProps {
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  activeConversationId?: string;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onConversationSelect,
  onNewConversation,
  activeConversationId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Dropdown menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuConversation, setMenuConversation] = useState<Conversation | null>(null);

  // Confirm dialog state (for clear messages / delete)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    okText: string;
    onConfirm: () => void;
  }>({ open: false, title: '', content: '', okText: '', onConfirm: () => {} });

  const { enqueueSnackbar } = useSnackbar();

  const {
    conversations,
    isLoading,
    hasMore,
    loadMore,
    deleteConversation,
    updateConversation,
    clearMessages,
    exportConversation,
    refresh
  } = useConversations({ autoLoad: true });

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.title.toLowerCase().includes(query) ||
      (conv.description?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      enqueueSnackbar('Conversation deleted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to delete conversation', { variant: 'error' });
    }
  };

  const handleExport = async (conversationId: string, format: 'json' | 'markdown') => {
    try {
      const blob = await exportConversation(conversationId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${conversationId}.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      enqueueSnackbar('Conversation exported successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to export conversation', { variant: 'error' });
    }
  };

  const handleRename = async () => {
    if (!selectedConversation || !renameValue.trim()) return;
    try {
      await updateConversation(selectedConversation.id, { title: renameValue.trim() });
      enqueueSnackbar('Conversation renamed', { variant: 'success' });
      setRenameModalVisible(false);
      setSelectedConversation(null);
      setRenameValue('');
    } catch (error) {
      enqueueSnackbar('Failed to rename conversation', { variant: 'error' });
    }
  };

  const handleClearMessages = async (conversationId: string) => {
    try {
      await clearMessages(conversationId);
      enqueueSnackbar('Messages cleared', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to clear messages', { variant: 'error' });
    }
  };

  const openRenameModal = (conv: Conversation) => {
    setSelectedConversation(conv);
    setRenameValue(conv.title);
    setRenameModalVisible(true);
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conv: Conversation) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuConversation(conv);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuConversation(null);
  };

  const openConfirmDialog = (
    title: string,
    content: string,
    okText: string,
    onConfirm: () => void
  ) => {
    setConfirmDialog({ open: true, title, content, okText, onConfirm });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  const generateTitle = (conv: Conversation): string => {
    const text = conv.title || conv.description || 'New Conversation';
    if (text.length <= 40) return text;
    return text.substring(0, 37) + '...';
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <ChatBubbleOutlineIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              Conversations
            </Typography>
            <Chip label={conversations.length} size="small" />
          </Stack>
        }
        action={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={refresh}>
                <RefreshIcon
                  fontSize="small"
                  sx={isLoading ? { animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } } : undefined}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="New Conversation">
              <IconButton size="small" color="primary" onClick={onNewConversation}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
        sx={{ pb: 0 }}
      />

      <CardContent sx={{ p: 1.5, pt: 1.5, overflow: 'auto', flex: 1 }}>
        {/* Search */}
        <TextField
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5 }}
        />

        {filteredConversations.length === 0 && !isLoading ? (
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                size="small"
                onClick={onNewConversation}
                sx={{ mt: 2 }}
              >
                Start Your First Conversation
              </Button>
            )}
          </Box>
        ) : (
          <>
            {isLoading && conversations.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <List disablePadding>
                {filteredConversations.map((conversation) => (
                  <ListItemButton
                    key={conversation.id}
                    selected={activeConversationId === conversation.id}
                    onClick={() => onConversationSelect(conversation.id)}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      px: 1,
                      py: 1.5,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            activeConversationId === conversation.id
                              ? 'primary.main'
                              : 'grey.300',
                        }}
                      >
                        <SmartToyOutlinedIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                      >
                        {generateTitle(conversation)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.25 }}>

                        <AccessTimeIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {dayjs(conversation.updatedAt).fromNow()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {conversation.messageCount} msgs
                        </Typography>
                      </Stack>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, conversation)}
                      sx={{ ml: 0.5 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                ))}
              </List>
            )}

            {/* Load More */}
            {hasMore && (
              <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                <Button
                  onClick={loadMore}
                  size="small"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={14} /> : undefined}
                >
                  Load More
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (menuConversation) openRenameModal(menuConversation);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuConversation) handleExport(menuConversation.id, 'json');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <FileDownloadOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as JSON</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuConversation) handleExport(menuConversation.id, 'markdown');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <FileDownloadOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as Markdown</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (menuConversation) {
              const convId = menuConversation.id;
              openConfirmDialog(
                'Clear all messages?',
                'This will remove all messages from this conversation.',
                'Clear',
                () => handleClearMessages(convId)
              );
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <ClearAllIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear Messages</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuConversation) {
              const convId = menuConversation.id;
              openConfirmDialog(
                'Delete conversation?',
                'This action cannot be undone.',
                'Delete',
                () => handleDeleteConversation(convId)
              );
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog
        open={renameModalVisible}
        onClose={() => {
          setRenameModalVisible(false);
          setSelectedConversation(null);
          setRenameValue('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter new title..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
            }}
            autoFocus
            fullWidth
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRenameModalVisible(false);
              setSelectedConversation(null);
              setRenameValue('');
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRename}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog (Clear Messages / Delete) */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{confirmDialog.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              confirmDialog.onConfirm();
              closeConfirmDialog();
            }}
          >
            {confirmDialog.okText}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ConversationHistory;
