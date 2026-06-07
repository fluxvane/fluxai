'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material'
import {
  Send,
  SmartToy,
  Person,
  ContentCopy,
  Settings,
  Stop,
  Refresh,
  Delete,
} from '@mui/icons-material'
import { useSnackbar } from 'notistack'
import ReactMarkdown from 'react-markdown'
import { chatService, type StreamCallbacks } from '../services/chatService'
import { useModels } from '../hooks/useModels'
import type { ChatMessage as APIChatMessage } from '../types'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
  streaming?: boolean
}

interface ChatInterfaceProps {
  apiKey?: string
  systemPrompt?: string
  conversationId?: string
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  apiKey,
  systemPrompt,
  conversationId: _conversationId,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [totalTokens, setTotalTokens] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { enqueueSnackbar } = useSnackbar()

  // Fetch available models from API
  const { models: apiModels, isLoading: modelsLoading } = useModels({ autoLoad: true })

  // Build model options from API or fallback
  const models = apiModels.length > 0
    ? apiModels.map(m => ({
        value: m.id,
        label: `${m.displayName || m.id} (${m.provider})`,
      }))
    : [
        { value: 'gpt-4', label: 'GPT-4 (OpenAI)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (OpenAI)' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus (Anthropic)' },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Anthropic)' },
        { value: 'gemini-pro', label: 'Gemini Pro (Google)' },
      ]

  // Initialize with system prompt if provided
  useEffect(() => {
    if (systemPrompt && messages.length === 0) {
      setMessages([{
        id: 'system-0',
        role: 'system',
        content: systemPrompt,
        timestamp: new Date(),
      }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when systemPrompt changes
  }, [systemPrompt])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, currentStreamingMessage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Convert local messages to API format
  const toAPIChatMessages = useCallback((msgs: Message[]): APIChatMessage[] => {
    return msgs.map(m => ({
      role: m.role,
      content: m.content,
    }))
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setCurrentStreamingMessage('')

    // Prepare messages for API
    const allMessages = [...messages, userMessage]
    const apiMessages = toAPIChatMessages(allMessages)

    // Create abort controller for this request
    abortControllerRef.current = chatService.createAbortController()

    const callbacks: StreamCallbacks = {
      onStart: () => {
        setIsLoading(false)
        setIsStreaming(true)
      },
      onToken: (token) => {
        setCurrentStreamingMessage(prev => prev + token)
      },
      onComplete: (fullContent, response) => {
        setIsStreaming(false)
        setCurrentStreamingMessage('')

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
          model: selectedModel,
          tokens: response?.usage?.total_tokens,
        }
        setMessages(prev => [...prev, assistantMessage])

        if (response?.usage?.total_tokens) {
          setTotalTokens(prev => prev + response.usage.total_tokens)
        }
      },
      onError: (error) => {
        setIsLoading(false)
        setIsStreaming(false)
        setCurrentStreamingMessage('')

        if (error.name === 'AbortError') {
          enqueueSnackbar('Response generation stopped', { variant: 'info' })
        } else {
          enqueueSnackbar(`Failed to get response: ${error.message}`, { variant: 'error' })
        }
      },
    }

    try {
      await chatService.streamWithAbort(
        apiMessages,
        { model: selectedModel },
        callbacks,
        abortControllerRef.current,
      )
    } catch (error) {
      // Error already handled in callbacks
    }
  }

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Add partial response if any
    if (currentStreamingMessage.trim()) {
      const partialMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: currentStreamingMessage + ' [stopped]',
        timestamp: new Date(),
        model: selectedModel,
      }
      setMessages(prev => [...prev, partialMessage])
    }

    setIsStreaming(false)
    setCurrentStreamingMessage('')
  }, [currentStreamingMessage, selectedModel])

  const handleClearMessages = useCallback(() => {
    setMessages(systemPrompt ? [{
      id: 'system-0',
      role: 'system',
      content: systemPrompt,
      timestamp: new Date(),
    }] : [])
    setTotalTokens(0)
    setCurrentStreamingMessage('')
  }, [systemPrompt])

  const handleRegenerateLastResponse = useCallback(async () => {
    // Find and remove last assistant message
    const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserMsgIndex === -1) return

    const actualIndex = messages.length - 1 - lastUserMsgIndex
    const lastUserContent = messages[actualIndex].content

    // Remove messages after last user message
    setMessages(prev => prev.slice(0, actualIndex))

    // Resend
    setInputValue(lastUserContent)
    setTimeout(() => handleSendMessage(), 100)
  }, [messages])

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    enqueueSnackbar('Message copied to clipboard', { variant: 'success' })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Filter out system messages for display
  const displayMessages = messages.filter(m => m.role !== 'system')

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
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SmartToy sx={{ color: '#94a3b8' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
            AI Chat Interface
          </Typography>
          <Chip label={selectedModel} size="small" color="primary" variant="outlined" />
          {totalTokens > 0 && (
            <Chip
              label={`${totalTokens.toLocaleString()} tokens`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Select
            value={selectedModel}
            onChange={(e: SelectChangeEvent) => setSelectedModel(e.target.value)}
            size="small"
            disabled={isStreaming || modelsLoading}
            sx={{
              width: 220,
              color: '#f1f5f9',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.5)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
              '.MuiSvgIcon-root': { color: '#94a3b8' },
              fontSize: '0.875rem',
            }}
            MenuProps={{
              PaperProps: {
                sx: { bgcolor: '#1e293b', color: '#f1f5f9' },
              },
            }}
          >
            {models.map(m => (
              <MenuItem key={m.value} value={m.value} sx={{ fontSize: '0.875rem' }}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
          <Tooltip title="Clear conversation">
            <span>
              <IconButton
                onClick={handleClearMessages}
                disabled={messages.length === 0}
                size="small"
                sx={{ color: '#94a3b8' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" sx={{ color: '#94a3b8' }}>
            <Settings fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: '#0f172a',
        }}
      >
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
            <SmartToy sx={{ fontSize: 48, mb: 2, color: '#475569' }} />
            <Typography variant="h6" sx={{ color: '#94a3b8', mb: 0.5 }}>
              Start a conversation
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Select a model and type your message below
            </Typography>
          </Box>
        )}

        {displayMessages.map((msg) => (
          <Box
            key={msg.id}
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
              {msg.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
            </Avatar>

            <Box
              sx={{
                maxWidth: '70%',
                px: 2,
                py: 1.5,
                borderRadius: 3,
                bgcolor: msg.role === 'user' ? '#3b82f6' : '#1e293b',
                color: msg.role === 'user' ? '#fff' : '#f1f5f9',
                border: msg.role === 'assistant' ? '1px solid rgba(148,163,184,0.15)' : 'none',
                position: 'relative',
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
                    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                    fontSize: '0.8rem',
                  },
                  '& a': { color: '#60a5fa' },
                },
              }}
            >
              <Box sx={{ mb: 1 }}>
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

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
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
                      sx={{ height: 20, fontSize: '0.7rem', color: 'inherit', borderColor: 'rgba(148,163,184,0.3)' }}
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
                    onClick={() => handleCopyMessage(msg.content)}
                    sx={{
                      color: msg.role === 'user' ? '#fff' : '#94a3b8',
                      opacity: 0.7,
                      p: 0.5,
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 14 }} />
                  </IconButton>
                  {msg.role === 'assistant' && (
                    <Tooltip title="Regenerate response">
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleRegenerateLastResponse}
                          disabled={isLoading || isStreaming}
                          sx={{ color: '#94a3b8', opacity: 0.7, p: 0.5 }}
                        >
                          <Refresh sx={{ fontSize: 14 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            </Box>
          </Box>
        ))}

        {/* Streaming message */}
        {isStreaming && currentStreamingMessage && (
          <Box sx={{ display: 'flex', mb: 2, alignItems: 'flex-start' }}>
            <Avatar
              sx={{ mx: 1, width: 32, height: 32, bgcolor: '#22c55e' }}
            >
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
                <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
              </Box>
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  color: '#3b82f6',
                  animation: 'blink 1s step-end infinite',
                  '@keyframes blink': {
                    '50%': { opacity: 0 },
                  },
                }}
              >
                ▊
              </Box>
            </Box>
          </Box>
        )}

        {/* Loading indicator — rotating status messages, Gemini-style.
            Stays on the first message ~1.5s, then cycles every 2.4s. */}
        {isLoading && !isStreaming && <RotatingStatus />}

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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
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
                '& fieldset': { borderColor: 'rgba(148,163,184,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(148,163,184,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1 },
            }}
          />
          {isStreaming ? (
            <Button
              variant="contained"
              color="error"
              onClick={handleStopStreaming}
              startIcon={<Stop />}
              sx={{ minWidth: 100, height: 40, textTransform: 'none' }}
            >
              Stop
            </Button>
          ) : (
            <IconButton
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              sx={{
                bgcolor: '#3b82f6',
                color: '#fff',
                width: 40,
                height: 40,
                '&:hover': { bgcolor: '#2563eb' },
                '&.Mui-disabled': { bgcolor: 'rgba(59,130,246,0.3)', color: 'rgba(255,255,255,0.3)' },
              }}
            >
              {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Send />}
            </IconButton>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {apiKey ? (
              <Chip label="API Key: Connected" size="small" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
            ) : (
              <Chip label="API Key: Not configured" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
            )}
          </Stack>
        </Box>
      </Box>
    </Card>
  )
}

/** Gemini-style rotating status shown while a response is preparing.
 *  Holds the first message ~1.5s, then cycles every 2.4s through the array. */
const ROTATING_STATUS_MESSAGES = [
  'Thinking…',
  'Reading the room…',
  'Weighing the options…',
  'Drafting a response…',
  'Polishing the answer…',
]

function useRotatingStatus(active: boolean, messages: string[], intervalMs = 2400) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!active) { setIdx(0); return }
    const t1 = setTimeout(() => setIdx(1), 1500)
    const iv = setInterval(() => setIdx((i) => (i + 1) % messages.length), intervalMs)
    return () => { clearTimeout(t1); clearInterval(iv) }
  }, [active, messages.length, intervalMs])
  return messages[idx]
}

function RotatingStatus() {
  const status = useRotatingStatus(true, ROTATING_STATUS_MESSAGES)
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, gap: 1.5 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            component={motion.span}
            animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.16 }}
            sx={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #22d3ee)' }}
          />
        ))}
      </Stack>
      <Box sx={{ position: 'relative', overflow: 'hidden', height: 20, minWidth: 100 }}>
        <AnimatePresence mode="wait" initial={false}>
          <Box
            key={status}
            component={motion.div}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            sx={{ position: 'absolute', top: 1, left: 0 }}
          >
            <Typography
              variant="body2"
              sx={{
                background: 'linear-gradient(90deg, #64748b 0%, #e2e8f0 50%, #64748b 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                animation: 'shimmer 2.2s linear infinite',
                '@keyframes shimmer': { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
              }}
            >
              {status}
            </Typography>
          </Box>
        </AnimatePresence>
      </Box>
    </Box>
  )
}

export default ChatInterface
