'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  Avatar,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Box,
  Stack,
  type SelectChangeEvent,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  ContentCopy,
  Stop,
  Delete,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ReactMarkdown from 'react-markdown';
import { useRagChat, type RagMessage } from '../hooks/useRagChat';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { useModels } from '../hooks/useModels';
import KnowledgeBaseSelector from './KnowledgeBaseSelector';
import SourcesCitation from './SourcesCitation';

interface RagChatInterfaceProps {
  initialKnowledgeBaseId?: string;
}

const RagChatInterface: React.FC<RagChatInterfaceProps> = ({
  initialKnowledgeBaseId,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  const { knowledgeBases, selectedKB, selectKB } = useKnowledgeBases();
  const { models: apiModels, isLoading: modelsLoading } = useModels({
    autoLoad: true,
  });

  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    setKnowledgeBaseId,
  } = useRagChat({
    knowledgeBaseId: initialKnowledgeBaseId ?? selectedKB?.id,
    modelId: selectedModel,
    temperature: 0.7,
    onError: (err) => {
      enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
    },
  });

  // Sync KB selection
  useEffect(() => {
    setKnowledgeBaseId(selectedKB?.id);
  }, [selectedKB, setKnowledgeBaseId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const models =
    apiModels.length > 0
      ? apiModels.map((m) => ({
          value: m.id,
          label: `${m.displayName || m.id} (${m.provider})`,
        }))
      : [
          { value: 'gpt-4', label: 'GPT-4 (OpenAI)' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { value: 'gemini-pro', label: 'Gemini Pro (Google)' },
        ];

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    const msg = inputValue.trim();
    setInputValue('');
    await sendMessage(msg);
  }, [inputValue, isLoading, isStreaming, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    enqueueSnackbar('Copied to clipboard', { variant: 'success' });
  };

  const displayMessages = messages.filter((m) => m.role !== 'system');

  return (
    <Card
      sx={{
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0f172a',
        color: '#f1f5f9',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(148,163,184,0.15)',
          bgcolor: '#1e293b',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SmartToy sx={{ color: '#94a3b8' }} />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, color: '#f1f5f9' }}
          >
            RAG Chat
          </Typography>
          {selectedKB && (
            <Chip
              icon={<StorageIcon />}
              label={selectedKB.name}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <KnowledgeBaseSelector
            knowledgeBases={knowledgeBases}
            selectedId={selectedKB?.id}
            onChange={selectKB}
            disabled={isStreaming}
            size="small"
          />
          <Select
            value={selectedModel}
            onChange={(e: SelectChangeEvent) => setSelectedModel(e.target.value)}
            size="small"
            disabled={isStreaming || modelsLoading}
            sx={{
              width: 200,
              color: '#f1f5f9',
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148,163,184,0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(148,163,184,0.5)',
              },
              '.MuiSvgIcon-root': { color: '#94a3b8' },
              fontSize: '0.875rem',
            }}
            MenuProps={{
              PaperProps: {
                sx: { bgcolor: '#1e293b', color: '#f1f5f9' },
              },
            }}
          >
            {models.map((m) => (
              <MenuItem key={m.value} value={m.value} sx={{ fontSize: '0.875rem' }}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title="Clear conversation">
            <span>
              <IconButton
                onClick={clearMessages}
                disabled={messages.length === 0}
                size="small"
                sx={{ color: '#94a3b8' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#0f172a' }}>
        {displayMessages.length === 0 && !isStreaming && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
            }}
          >
            <StorageIcon sx={{ fontSize: 48, mb: 2, color: '#475569' }} />
            <Typography variant="h6" sx={{ color: '#94a3b8', mb: 0.5 }}>
              {selectedKB
                ? `Chat with "${selectedKB.name}"`
                : 'Select a Knowledge Base to start RAG chat'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {selectedKB
                ? `${selectedKB.documentCount} documents indexed • Ask questions about your data`
                : 'Or use general chat without a knowledge base'}
            </Typography>
          </Box>
        )}

        {displayMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCopy={handleCopy}
          />
        ))}

        {/* Streaming */}
        {isStreaming && streamingContent && (
          <Box sx={{ display: 'flex', mb: 2, alignItems: 'flex-start' }}>
            <Avatar sx={{ mx: 1, width: 32, height: 32, bgcolor: '#22c55e' }}>
              <SmartToy sx={{ fontSize: 18 }} />
            </Avatar>
            <Box
              sx={{
                maxWidth: '70%',
                px: 2,
                py: 1.5,
                borderRadius: 3,
                bgcolor: '#1e293b',
                border: '1px solid rgba(148,163,184,0.15)',
                color: '#f1f5f9',
                '& .markdown-body': {
                  color: 'inherit',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  '& p': { m: 0 },
                },
              }}
            >
              <Box className="markdown-body">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </Box>
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  color: '#3b82f6',
                  animation: 'blink 1s step-end infinite',
                  '@keyframes blink': { '50%': { opacity: 0 } },
                }}
              >
                ▊
              </Box>
            </Box>
          </Box>
        )}

        {isLoading && !isStreaming && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={20} sx={{ color: '#3b82f6' }} />
            <Typography variant="body2" sx={{ ml: 1, color: '#94a3b8' }}>
              Searching knowledge base...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          borderTop: '1px solid rgba(148,163,184,0.15)',
          p: 2,
          bgcolor: '#1e293b',
        }}
      >
        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mb: 1 }}
          >
            {error.message}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              selectedKB
                ? `Ask about ${selectedKB.name}...`
                : 'Type your message...'
            }
            multiline
            minRows={2}
            maxRows={6}
            disabled={isLoading}
            fullWidth
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                bgcolor: '#0f172a',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: 'rgba(148,163,184,0.2)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(148,163,184,0.4)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3b82f6',
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#64748b',
                opacity: 1,
              },
            }}
          />
          {isStreaming ? (
            <Button
              variant="contained"
              color="error"
              onClick={stopStreaming}
              startIcon={<Stop />}
              sx={{ minWidth: 100, height: 40, textTransform: 'none' }}
            >
              Stop
            </Button>
          ) : (
            <IconButton
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              sx={{
                bgcolor: '#3b82f6',
                color: '#fff',
                width: 40,
                height: 40,
                '&:hover': { bgcolor: '#2563eb' },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(59,130,246,0.3)',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              ) : (
                <Send />
              )}
            </IconButton>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', mt: 1, display: 'block' }}>
          Enter to send, Shift+Enter for new line
          {selectedKB && ` • RAG: ${selectedKB.name}`}
        </Typography>
      </Box>
    </Card>
  );
};

/* ---------- Sub-component: single message bubble ---------- */
const MessageBubble: React.FC<{
  message: RagMessage;
  onCopy: (content: string) => void;
}> = ({ message: msg, onCopy }) => (
  <Box
    sx={{
      display: 'flex',
      mb: 2,
      alignItems: 'flex-start',
      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
    }}
  >
    <Avatar
      sx={{
        mx: 1,
        width: 32,
        height: 32,
        bgcolor: msg.role === 'user' ? '#3b82f6' : '#22c55e',
      }}
    >
      {msg.role === 'user' ? (
        <Person sx={{ fontSize: 18 }} />
      ) : (
        <SmartToy sx={{ fontSize: 18 }} />
      )}
    </Avatar>

    <Box
      sx={{
        maxWidth: '70%',
        px: 2,
        py: 1.5,
        borderRadius: 3,
        bgcolor: msg.role === 'user' ? '#3b82f6' : '#1e293b',
        color: msg.role === 'user' ? '#fff' : '#f1f5f9',
        border:
          msg.role === 'assistant'
            ? '1px solid rgba(148,163,184,0.15)'
            : 'none',
        '& .markdown-body': {
          color: 'inherit',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
          '& pre': {
            bgcolor: 'rgba(0,0,0,0.3)',
            borderRadius: 1,
            p: 1.5,
            overflow: 'auto',
          },
          '& code': {
            fontFamily: '"Fira Code","JetBrains Mono",monospace',
            fontSize: '0.8rem',
          },
          '& a': { color: '#60a5fa' },
        },
      }}
    >
      <Box>
        {msg.role === 'assistant' ? (
          <Box className="markdown-body">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {msg.content}
          </Typography>
        )}
      </Box>

      {/* RAG Sources */}
      {msg.sources && msg.sources.length > 0 && (
        <SourcesCitation sources={msg.sources} />
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 0.5,
          fontSize: '12px',
          opacity: 0.7,
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          {msg.model && (
            <Chip
              label={msg.model}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                color: 'inherit',
                borderColor: 'rgba(148,163,184,0.3)',
              }}
            />
          )}
          {msg.tokens && (
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {msg.tokens} tokens
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            {msg.timestamp.toLocaleTimeString()}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onCopy(msg.content)}
            sx={{
              color: msg.role === 'user' ? '#fff' : '#94a3b8',
              opacity: 0.7,
              p: 0.5,
            }}
          >
            <ContentCopy sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  </Box>
);

export default RagChatInterface;
