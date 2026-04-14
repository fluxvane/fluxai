'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
  Storage as StorageIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Description as DocIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeBaseService } from '@/services/knowledgeBaseService';
import type {
  KnowledgeBase,
  IndexedDocument,
} from '@/types';

export default function KnowledgeBasesPage() {
  const { user, logout } = useAuth();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const loadKnowledgeBases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await knowledgeBaseService.list();
      setKnowledgeBases(data);
    } catch {
      setError('Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  const loadDocuments = useCallback(async (kbId: string) => {
    setDocsLoading(true);
    try {
      const docs = await knowledgeBaseService.getDocuments(kbId);
      setDocuments(docs);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const handleSelectKB = (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    loadDocuments(kb.id);
  };

  return (
    <AuthGuard>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#0f172a' }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <StorageIcon color="primary" />
            <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
              Knowledge Bases
            </Typography>
            <Tooltip title="RAG Chat">
              <IconButton component={Link} href="/rag-chat" sx={{ color: 'text.secondary' }}>
                <StorageIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="General Chat">
              <IconButton component={Link} href="/chat" sx={{ color: 'text.secondary' }}>
                <ChatIcon />
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

        <Box sx={{ pt: '80px', px: 3, pb: 3 }}>
          {/* Header actions */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#f1f5f9' }}>
              Manage Knowledge Bases
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadKnowledgeBases}
                variant="outlined"
                size="small"
                sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}
              >
                Refresh
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                variant="contained"
                size="small"
              >
                New Knowledge Base
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {/* KB cards */}
              <Grid item xs={12} md={selectedKB ? 4 : 12}>
                <Grid container spacing={2}>
                  {knowledgeBases.map((kb) => (
                    <Grid item xs={12} sm={selectedKB ? 12 : 6} lg={selectedKB ? 12 : 4} key={kb.id}>
                      <KBCard
                        kb={kb}
                        selected={selectedKB?.id === kb.id}
                        onSelect={() => handleSelectKB(kb)}
                        onIndex={() => { setSelectedKB(kb); setIndexOpen(true); }}
                        onChat={kb.id}
                      />
                    </Grid>
                  ))}
                  {knowledgeBases.length === 0 && (
                    <Grid item xs={12}>
                      <Card sx={{ bgcolor: '#1e293b', textAlign: 'center', py: 6 }}>
                        <StorageIcon sx={{ fontSize: 48, color: '#475569', mb: 2 }} />
                        <Typography sx={{ color: '#94a3b8' }}>
                          No knowledge bases yet. Create one to get started.
                        </Typography>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Grid>

              {/* Documents panel */}
              {selectedKB && (
                <Grid item xs={12} md={8}>
                  <DocumentsPanel
                    kb={selectedKB}
                    documents={documents}
                    loading={docsLoading}
                    onRefresh={() => loadDocuments(selectedKB.id)}
                    onIndex={() => setIndexOpen(true)}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </Box>

        <CreateKBDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); loadKnowledgeBases(); }}
        />

        {selectedKB && (
          <IndexDocumentDialog
            open={indexOpen}
            kbId={selectedKB.id}
            kbName={selectedKB.name}
            onClose={() => setIndexOpen(false)}
            onIndexed={() => {
              setIndexOpen(false);
              loadDocuments(selectedKB.id);
              loadKnowledgeBases();
            }}
          />
        )}
      </Box>
    </AuthGuard>
  );
}

/* ---------- KB Card ---------- */
function KBCard({
  kb,
  selected,
  onSelect,
  onIndex,
  onChat,
}: {
  kb: KnowledgeBase;
  selected: boolean;
  onSelect: () => void;
  onIndex: () => void;
  onChat: string;
}) {
  return (
    <Card
      sx={{
        bgcolor: selected ? '#1e3a5f' : '#1e293b',
        border: selected ? '1px solid #3b82f6' : '1px solid rgba(148,163,184,0.1)',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'rgba(59,130,246,0.5)' },
      }}
      onClick={onSelect}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>
            {kb.name}
          </Typography>
          <Chip
            label={kb.isActive ? 'Active' : 'Inactive'}
            size="small"
            color={kb.isActive ? 'success' : 'default'}
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
        </Stack>
        {kb.description && (
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, lineHeight: 1.4 }}>
            {kb.description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Chip label={`${kb.documentCount} docs`} size="small" variant="outlined" sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', height: 22, fontSize: '0.7rem' }} />
          <Chip label={`${kb.totalChunks} chunks`} size="small" variant="outlined" sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', height: 22, fontSize: '0.7rem' }} />
          {kb.isDefault && <Chip label="Default" size="small" color="info" sx={{ height: 22, fontSize: '0.7rem' }} />}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5, pt: 0, gap: 1 }}>
        <Button
          size="small"
          startIcon={<UploadIcon />}
          onClick={(e) => { e.stopPropagation(); onIndex(); }}
          sx={{ color: '#3b82f6', textTransform: 'none', fontSize: '0.75rem' }}
        >
          Index Document
        </Button>
        <Button
          size="small"
          startIcon={<ChatIcon />}
          component={Link}
          href={`/rag-chat?kb=${onChat}`}
          onClick={(e) => e.stopPropagation()}
          sx={{ color: '#22c55e', textTransform: 'none', fontSize: '0.75rem' }}
        >
          Chat
        </Button>
      </CardActions>
    </Card>
  );
}

/* ---------- Documents Panel ---------- */
function DocumentsPanel({
  kb,
  documents,
  loading,
  onRefresh,
  onIndex,
}: {
  kb: KnowledgeBase;
  documents: IndexedDocument[];
  loading: boolean;
  onRefresh: () => void;
  onIndex: () => void;
}) {
  const statusLabel = (s: number) =>
    ['Pending', 'Processing', 'Indexed', 'Failed'][s] ?? 'Unknown';
  const statusColor = (s: number): 'default' | 'warning' | 'success' | 'error' =>
    (['default', 'warning', 'success', 'error'] as const)[s] ?? 'default';

  return (
    <Card sx={{ bgcolor: '#1e293b', border: '1px solid rgba(148,163,184,0.1)' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#f1f5f9', fontSize: '1rem' }}>
            Documents in &quot;{kb.name}&quot;
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              sx={{ color: '#94a3b8', textTransform: 'none' }}
            >
              Refresh
            </Button>
            <Button
              size="small"
              startIcon={<UploadIcon />}
              variant="contained"
              onClick={onIndex}
              sx={{ textTransform: 'none' }}
            >
              Add Document
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : documents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DocIcon sx={{ fontSize: 40, color: '#475569', mb: 1 }} />
            <Typography sx={{ color: '#94a3b8' }}>No documents indexed yet</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.15)' }}>Title</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.15)' }}>Type</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.15)' }}>Chunks</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.15)' }}>Status</TableCell>
                  <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.15)' }}>Indexed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell sx={{ color: '#f1f5f9', borderColor: 'rgba(148,163,184,0.1)' }}>
                      {doc.title}
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.1)' }}>
                      {doc.contentType}
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.1)' }}>
                      {doc.totalChunks}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'rgba(148,163,184,0.1)' }}>
                      <Chip
                        label={statusLabel(doc.status)}
                        color={statusColor(doc.status)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.1)', fontSize: '0.8rem' }}>
                      {doc.indexedAt ? new Date(doc.indexedAt).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Create KB Dialog ---------- */
function CreateKBDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await knowledgeBaseService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
      });
      setName(''); setDescription(''); setSystemPrompt('');
      onCreated();
    } catch {
      setError('Failed to create knowledge base');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1e293b', color: '#f1f5f9' } }}>
      <DialogTitle>Create Knowledge Base</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth margin="normal" required
          InputLabelProps={{ sx: { color: '#94a3b8' } }}
          InputProps={{ sx: { color: '#f1f5f9' } }}
        />
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth margin="normal" multiline rows={2}
          InputLabelProps={{ sx: { color: '#94a3b8' } }}
          InputProps={{ sx: { color: '#f1f5f9' } }}
        />
        <TextField label="System Prompt (optional)" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} fullWidth margin="normal" multiline rows={3}
          placeholder="You are a helpful assistant. Use the provided context to answer questions accurately."
          InputLabelProps={{ sx: { color: '#94a3b8' } }}
          InputProps={{ sx: { color: '#f1f5f9' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- Index Document Dialog ---------- */
function IndexDocumentDialog({
  open,
  kbId,
  kbName,
  onClose,
  onIndexed,
}: {
  open: boolean;
  kbId: string;
  kbName: string;
  onClose: () => void;
  onIndexed: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [fileExtensions, setFileExtensions] = useState('.cs,.ts,.tsx,.md');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleDocIndex = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await knowledgeBaseService.indexDocument(kbId, {
        title: title.trim(),
        content: content.trim(),
      });
      setTitle(''); setContent('');
      setResult('Document indexed successfully!');
      setTimeout(onIndexed, 1000);
    } catch {
      setError('Failed to index document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProjectIndex = async () => {
    if (!projectPath.trim()) { setError('Project path is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await knowledgeBaseService.indexProject(kbId, {
        projectPath: projectPath.trim(),
        fileExtensions: fileExtensions.split(',').map((e) => e.trim()).filter(Boolean),
      });
      setResult(`Project indexed: ${res.processedFiles}/${res.totalFiles} files, ${res.totalChunks} chunks`);
      setTimeout(onIndexed, 2000);
    } catch {
      setError('Failed to index project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(''); setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#1e293b', color: '#f1f5f9' } }}>
      <DialogTitle>Index into &quot;{kbName}&quot;</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {result && <Alert severity="success" sx={{ mb: 2 }}>{result}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { color: '#94a3b8' }, '& .Mui-selected': { color: '#3b82f6' } }}>
          <Tab label="Text / Document" />
          <Tab label="Index Project" />
        </Tabs>

        {tab === 0 && (
          <>
            <TextField label="Document Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth margin="normal" required
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              InputProps={{ sx: { color: '#f1f5f9' } }}
            />
            <TextField label="Content" value={content} onChange={(e) => setContent(e.target.value)} fullWidth margin="normal" multiline rows={10} required
              placeholder="Paste document content here..."
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              InputProps={{ sx: { color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          </>
        )}

        {tab === 1 && (
          <>
            <TextField label="Project Path" value={projectPath} onChange={(e) => setProjectPath(e.target.value)} fullWidth margin="normal" required
              placeholder="/path/to/project or git-repo-url"
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              InputProps={{ sx: { color: '#f1f5f9' } }}
            />
            <TextField label="File Extensions (comma-separated)" value={fileExtensions} onChange={(e) => setFileExtensions(e.target.value)} fullWidth margin="normal"
              InputLabelProps={{ sx: { color: '#94a3b8' } }}
              InputProps={{ sx: { color: '#f1f5f9' } }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ color: '#94a3b8' }}>Cancel</Button>
        <Button onClick={tab === 0 ? handleDocIndex : handleProjectIndex} variant="contained" disabled={submitting}>
          {submitting ? <CircularProgress size={20} /> : 'Index'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
