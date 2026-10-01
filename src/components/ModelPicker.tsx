"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Popover,
  TextField,
  Typography,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  SearchOutlined,
  KeyboardArrowDownOutlined,
  CheckOutlined,
} from "@mui/icons-material";
import { useModels, type ModelItem } from "@/hooks/useModels";

interface ModelPickerProps {
  value: string;
  onChange: (next: string) => void;
  /** Optional filter to restrict which models are shown. */
  filter?: (m: ModelItem) => boolean;
  placeholder?: string;
  /** Stretch the trigger to its container's width (e.g. form layouts). */
  fullWidth?: boolean;
}

export default function ModelPicker({
  value,
  onChange,
  filter,
  placeholder = "Select model",
  fullWidth = false,
}: ModelPickerProps) {
  const { models, loading, error } = useModels();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const open = Boolean(anchorEl);

  const grouped = useMemo(() => {
    const base = filter ? models.filter(filter) : models;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? base.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            (m.provider ?? "").toLowerCase().includes(q),
        )
      : base;
    const groups: Record<string, ModelItem[]> = {};
    for (const m of filtered) {
      const key = m.provider ?? m.id.split("/")[0] ?? "other";
      (groups[key] ||= []).push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [models, filter, query]);

  const close = () => {
    setAnchorEl(null);
    setQuery("");
  };

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${value || placeholder}`}
        startIcon={
          loading ? (
            <CircularProgress size={12} sx={{ color: "text.secondary" }} />
          ) : (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: error ? "warning.main" : "success.main",
                boxShadow: error
                  ? "0 0 8px rgba(245,158,11,0.6)"
                  : "0 0 8px rgba(34,197,94,0.6)",
              }}
            />
          )
        }
        endIcon={
          <KeyboardArrowDownOutlined sx={{ fontSize: 16, opacity: 0.6 }} />
        }
        sx={{
          color: "text.primary",
          bgcolor: "rgba(161,161,170,0.08)",
          border: "1px solid rgba(161,161,170,0.12)",
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          minHeight: 36,
          fontSize: 13,
          fontWeight: 500,
          textTransform: "none",
          maxWidth: fullWidth ? "none" : { xs: 150, sm: 260 },
          width: fullWidth ? "100%" : undefined,
          justifyContent: "flex-start",
          "& .MuiButton-endIcon": { ml: "auto" },
          "&:hover": { bgcolor: "rgba(161,161,170,0.14)" },
        }}
      >
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: fullWidth ? "none" : { xs: 100, sm: 200 },
            fontFamily: "monospace",
          }}
        >
          {value || placeholder}
        </Box>
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: { xs: "calc(100vw - 32px)", sm: 380 },
              maxWidth: 380,
              maxHeight: 540,
              background: "var(--surface-solid)",
              backdropFilter: "blur(24px)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              borderRadius: 2.5,
              overflow: "hidden",
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: "1px solid rgba(161,161,170,0.08)" }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search models…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter picks the first match, so search → Enter is enough.
              const first = grouped[0]?.[1][0];
              if (e.key === "Enter" && first) {
                e.preventDefault();
                onChange(first.id);
                close();
              }
            }}
            inputProps={{ "aria-label": "Search models" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
              sx: { fontSize: 14, bgcolor: "rgba(161,161,170,0.06)" },
            }}
          />
        </Box>

        <Box
          role="listbox"
          aria-label="Models"
          sx={{ overflowY: "auto", maxHeight: 460 }}
        >
          {loading && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {!loading && grouped.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography
                variant="body2"
                color={error ? "warning.main" : "text.secondary"}
                sx={{ fontSize: 13 }}
              >
                {error
                  ? `Couldn't load models from your proxy. ${error}`
                  : query.trim()
                    ? `No models match \u201c${query.trim()}\u201d`
                    : "Your proxy didn't return any models."}
              </Typography>
            </Box>
          )}
          {!loading &&
            grouped.map(([provider, items]) => (
              <Box key={provider}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    position: "sticky",
                    top: 0,
                    background: "var(--surface-solid)",
                    zIndex: 1,
                    backdropFilter: "blur(8px)",
                    borderBottom: "1px solid rgba(161,161,170,0.05)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "text.secondary",
                    }}
                  >
                    {provider}{" "}
                    <Box component="span" sx={{ opacity: 0.5 }}>
                      · {items.length}
                    </Box>
                  </Typography>
                </Box>
                {items.map((m) => {
                  const selected = m.id === value;
                  return (
                    <ButtonBase
                      key={m.id}
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(m.id);
                        close();
                      }}
                      sx={{
                        width: "100%",
                        textAlign: "left",
                        px: 2,
                        py: 0.85,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        background: selected
                          ? "rgba(118,185,0,0.12)"
                          : "transparent",
                        borderLeft: "2px solid",
                        borderColor: selected ? "primary.light" : "transparent",
                        "&:hover, &.Mui-focusVisible": {
                          background: selected
                            ? "rgba(118,185,0,0.15)"
                            : "rgba(163,172,160,0.08)",
                        },
                        transition: "background 0.1s",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontFamily: '"JetBrains Mono","SF Mono",monospace',
                          color: "text.primary",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {m.id}
                      </Typography>
                      {selected && (
                        <CheckOutlined
                          sx={{
                            fontSize: 16,
                            color: "primary.light",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </ButtonBase>
                  );
                })}
              </Box>
            ))}
        </Box>
      </Popover>
    </>
  );
}
