"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  HubOutlined,
  KeyOutlined,
  TuneOutlined,
  ArrowForward,
  CheckCircleOutlineRounded,
  LogoutOutlined,
} from "@mui/icons-material";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import GlassPanel from "@/components/aurora/GlassPanel";
import DisplayHeading from "@/components/aurora/DisplayHeading";
import {
  fadeUp,
  staggerContainer,
  respectMotion,
} from "@/components/aurora/motion";

const QUICK_MODELS = ["chat", "speed", "coding", "hermes", "review"];

export default function ConfigPage() {
  const router = useRouter();
  const { user, isLoaded, config, saveConfig, logout } = useAuth();
  const reduce = useReducedMotion();
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("chat");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) router.replace("/login");
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (config) {
      setEndpoint(config.endpoint);
      setDefaultModel(config.defaultModel || "chat");
    }
  }, [config]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!endpoint.trim() || !apiKey.trim()) {
      setError("Endpoint and API key are required.");
      return;
    }
    setBusy(true);
    try {
      const result = await saveConfig(endpoint, apiKey, defaultModel || "chat");
      if (!result.ok) {
        setError(result.error ?? "Could not validate your configuration.");
        return;
      }
      router.replace("/chat");
    } finally {
      setBusy(false);
    }
  };

  if (isLoaded && !user) return null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <motion.div
        variants={respectMotion(fadeUp, !!reduce)}
        initial="hidden"
        animate="show"
        style={{ width: "100%", maxWidth: 480 }}
      >
        <Stack
          spacing={2}
          alignItems="center"
          sx={{ mb: 3, textAlign: "center" }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(118, 185, 0, 0.4)",
            }}
          >
            <TuneOutlined sx={{ color: "#0c1006", fontSize: 26 }} />
          </Box>
          <Box>
            <DisplayHeading variant="h4" sx={{ mb: 0.5 }}>
              Connect your proxy
            </DisplayHeading>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 14 }}
            >
              {user ? `Almost there, ${user.name.split(" ")[0]}. ` : ""}
              We&apos;ll verify the endpoint before continuing.
            </Typography>
          </Box>
        </Stack>

        <GlassPanel sx={{ p: 4, maxWidth: 520, mx: "auto" }}>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <motion.div
              variants={respectMotion(staggerContainer, !!reduce)}
              initial="hidden"
              animate="show"
            >
              <Stack spacing={2}>
                <motion.div variants={respectMotion(fadeUp, !!reduce)}>
                  <TextField
                    label="AI Endpoint"
                    placeholder="https://your-proxy.example.com/v1"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    fullWidth
                    required
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HubOutlined
                            sx={{ color: "text.secondary", fontSize: 18 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>

                <motion.div variants={respectMotion(fadeUp, !!reduce)}>
                  <TextField
                    label="API Key"
                    placeholder="sk-…"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    fullWidth
                    required
                    autoComplete="off"
                    type={showKey ? "text" : "password"}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlined
                            sx={{ color: "text.secondary", fontSize: 18 }}
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
                </motion.div>

                <motion.div variants={respectMotion(fadeUp, !!reduce)}>
                  <Box>
                    <TextField
                      label="Default model"
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      fullWidth
                      helperText="Used for new chats. You can switch models anytime."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TuneOutlined
                              sx={{ color: "text.secondary", fontSize: 18 }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ mt: 1.25, flexWrap: "wrap", gap: 0.75 }}
                    >
                      {QUICK_MODELS.map((m) => (
                        <Chip
                          key={m}
                          label={m}
                          size="small"
                          onClick={() => setDefaultModel(m)}
                          sx={{
                            cursor: "pointer",
                            bgcolor:
                              defaultModel === m
                                ? "rgba(118,185,0,0.18)"
                                : "rgba(163,172,160,0.08)",
                            color:
                              defaultModel === m
                                ? "primary.light"
                                : "text.secondary",
                            border:
                              defaultModel === m
                                ? "1px solid rgba(118,185,0,0.4)"
                                : "1px solid transparent",
                            fontFamily: "monospace",
                            fontSize: 12,
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </motion.div>

                <motion.div variants={respectMotion(fadeUp, !!reduce)}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={busy}
                    endIcon={!busy ? <ArrowForward /> : undefined}
                    sx={{ mt: 0.5, py: 1.25, fontSize: 14.5 }}
                  >
                    {busy ? (
                      <CircularProgress size={18} sx={{ color: "white" }} />
                    ) : (
                      "Verify & continue"
                    )}
                  </Button>
                </motion.div>
              </Stack>
            </motion.div>
          </form>

          <Divider sx={{ my: 2, borderColor: "rgba(161,161,170,0.1)" }} />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CheckCircleOutlineRounded
                sx={{ fontSize: 15, color: "success.main" }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: 12 }}
              >
                Your key is stored server-side, never exposed to the browser.
              </Typography>
            </Stack>
            <Button
              size="small"
              color="inherit"
              startIcon={<LogoutOutlined sx={{ fontSize: 16 }} />}
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              sx={{ color: "text.secondary", fontSize: 12 }}
            >
              Sign out
            </Button>
          </Stack>
        </GlassPanel>
      </motion.div>
    </Box>
  );
}
