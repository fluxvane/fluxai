"use client";

import React, { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  AutoAwesome,
  DownloadOutlined,
  ImageOutlined,
  ErrorOutline,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import ModelPicker from "@/components/ModelPicker";

interface GeneratedImage {
  id: string;
  prompt: string;
  model: string;
  size: string | null;
  src: string | null;
  createdAt: string;
}

const SIZES = ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"];

async function fetchGallery(): Promise<GeneratedImage[]> {
  const res = await fetch("/api/images", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load gallery");
  const data = (await res.json()) as { images: GeneratedImage[] };
  return data.images;
}

export default function GenerateImagePage() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [n, setN] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data: gallery = [] } = useQuery({
    queryKey: ["images"],
    queryFn: fetchGallery,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, size, n }),
      });
      const data = (await res.json()) as {
        images?: GeneratedImage[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      return data.images ?? [];
    },
    onMutate: () => setError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["images"] }),
    onError: (e: Error) => setError(e.message),
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      setError("Enter a prompt.");
      return;
    }
    if (!model) {
      setError("Pick an image model.");
      return;
    }
    mutation.mutate();
  };

  return (
    <AppShell>
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 5 },
          width: "100%",
        }}
      >
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            color="primary.light"
            sx={{ letterSpacing: "0.12em", fontWeight: 600 }}
          >
            Generate
          </Typography>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ letterSpacing: "-0.02em" }}
          >
            Image studio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Describe what you want and pick a model. Images are saved to your
            gallery.
          </Typography>
        </Stack>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            mb: 4,
            border: "1px solid rgba(161,161,170,0.12)",
            background: "rgba(24,24,27,0.6)",
            backdropFilter: "blur(20px)",
          }}
        >
          <TextField
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene mountain lake at dawn, volumetric light, ultra detailed…"
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            sx={{ mb: 2 }}
          />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "center" }}
            sx={{ flexWrap: "wrap", gap: 1.5 }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5 }}
              >
                Model
              </Typography>
              <ModelPicker
                value={model}
                onChange={setModel}
                placeholder="Select image model"
              />
            </Box>
            <TextField
              select
              label="Size"
              size="small"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              {SIZES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Count"
              size="small"
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              sx={{ minWidth: 100 }}
            >
              {[1, 2, 3, 4].map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={mutation.isPending}
              startIcon={
                mutation.isPending ? (
                  <CircularProgress size={16} sx={{ color: "white" }} />
                ) : (
                  <AutoAwesome />
                )
              }
              sx={{ minWidth: 150 }}
            >
              {mutation.isPending ? "Generating…" : "Generate"}
            </Button>
          </Stack>

          {error && (
            <Alert
              severity="error"
              icon={<ErrorOutline />}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}
        </Box>

        {mutation.isPending && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              mb: 4,
            }}
          >
            {Array.from({ length: n }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  aspectRatio: "1",
                  borderRadius: 2.5,
                  border: "1px solid rgba(161,161,170,0.1)",
                  background:
                    "linear-gradient(90deg, rgba(161,161,170,0.05) 25%, rgba(161,161,170,0.12) 50%, rgba(161,161,170,0.05) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "flux-shimmer 1.4s linear infinite",
                }}
              />
            ))}
          </Box>
        )}

        <Gallery images={gallery} />
      </Box>
    </AppShell>
  );
}

function Gallery({ images }: { images: GeneratedImage[] }) {
  if (images.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
        <ImageOutlined sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
        <Typography variant="body2">
          No images yet. Generate your first one above.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Gallery
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <AnimatePresence initial={false}>
          {images.map((img) => (
            <motion.div
              key={img.id}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 2.5,
                  overflow: "hidden",
                  border: "1px solid rgba(161,161,170,0.12)",
                  background: "rgba(24,24,27,0.6)",
                  "&:hover .flux-overlay": { opacity: 1 },
                }}
              >
                {img.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.src}
                    alt={img.prompt}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      aspectRatio: "1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "text.secondary",
                    }}
                  >
                    <ImageOutlined />
                  </Box>
                )}
                <Box
                  className="flux-overlay"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    background:
                      "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%)",
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="flex-end"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "white",
                        fontSize: 11,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {img.prompt}
                    </Typography>
                    {img.src && (
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          component="a"
                          href={img.src}
                          download={`flux-${img.id}.png`}
                          target="_blank"
                          sx={{
                            color: "white",
                            bgcolor: "rgba(0,0,0,0.4)",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
                          }}
                        >
                          <DownloadOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Chip
                    label={img.model}
                    size="small"
                    sx={{
                      mt: 1,
                      height: 20,
                      fontSize: 10,
                      alignSelf: "flex-start",
                      fontFamily: "monospace",
                      bgcolor: "rgba(139,92,246,0.3)",
                      color: "white",
                    }}
                  />
                </Box>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </>
  );
}
