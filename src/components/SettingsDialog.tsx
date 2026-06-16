"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  HubOutlined,
  KeyOutlined,
  TuneOutlined,
  CheckCircleRounded,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { user, config, updateConfig } = useAuth();
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("chat");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && config) {
      setEndpoint(config.endpoint);
      setDefaultModel(config.defaultModel || "chat");
      setApiKey("");
      setError(null);
      setSaved(false);
    }
  }, [open, config]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const result = await updateConfig({
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim() || undefined,
        defaultModel: defaultModel.trim() || "chat",
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save.");
        return;
      }
      setSaved(true);
      setTimeout(() => onClose(), 700);
    } finally {
      setBusy(false);
    }
  };

  const initial = user?.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: "var(--surface-solid)",
          backdropFilter: "blur(24px)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-panel)",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 22,
        }}
      >
        Settings
      </DialogTitle>
      <form onSubmit={handleSave}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            {user && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(161,161,170,0.05)",
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
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
              </Box>
            )}

            <Divider sx={{ borderColor: "rgba(161,161,170,0.08)" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: 11, letterSpacing: "0.08em" }}
              >
                PROXY CONFIGURATION
              </Typography>
            </Divider>

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}
            {saved && (
              <Alert
                icon={<CheckCircleRounded fontSize="inherit" />}
                severity="success"
                sx={{ borderRadius: 2 }}
              >
                Saved and verified.
              </Alert>
            )}

            <TextField
              label="AI Endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HubOutlined
                      sx={{ color: "text.secondary", fontSize: 20 }}
                    />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              autoComplete="off"
              type={showKey ? "text" : "password"}
              placeholder="Leave blank to keep current key"
              helperText="Only needed if you want to change the stored key."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyOutlined
                      sx={{ color: "text.secondary", fontSize: 20 }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowKey((s) => !s)}
                      edge="end"
                      size="small"
                    >
                      {showKey ? (
                        <VisibilityOff sx={{ fontSize: 18 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Default Model"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              fullWidth
              helperText="Used for new chats."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TuneOutlined
                      sx={{ color: "text.secondary", fontSize: 20 }}
                    />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? (
              <CircularProgress size={18} sx={{ color: "white" }} />
            ) : (
              "Save & verify"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
