"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined,
  AnalyticsOutlined,
  ChatOutlined,
  DeleteOutline,
  ImageOutlined,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useSnackbar } from "notistack";
import { useChat, CONVERSATIONS_CHANGED } from "@/hooks/useChat";
import { formatRelativeTime } from "@/lib/format";
import type { ConversationSummary } from "@/types/chat";

const NAV_ITEMS = [
  { label: "Chat", href: "/chat", icon: <ChatOutlined /> },
  { label: "Generate Image", href: "/generate-image", icon: <ImageOutlined /> },
  { label: "Analytics", href: "/analytics", icon: <AnalyticsOutlined /> },
];

const selectedSx = {
  "&.Mui-selected, &.Mui-selected:hover": {
    background: "rgba(118,185,0,0.14)",
  },
};

interface SidebarProps {
  /** Called after any navigation, e.g. to close the mobile drawer. */
  onNavigate: () => void;
}

/** App navigation + conversation history. Fills its container's height. */
export default function Sidebar({ onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { newChat } = useChat();

  const handleNewChat = () => {
    newChat();
    onNavigate();
    router.push("/chat");
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={handleNewChat}
          sx={{ mb: 2 }}
        >
          New chat
        </Button>
        <List dense disablePadding component="div">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={active}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  transition: "background var(--dur-fast) var(--ease-out)",
                  ...selectedSx,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: active ? "primary.light" : "text.secondary",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: active ? 600 : 500 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ mx: 2, borderColor: "var(--border)" }} />

      <ConversationList onNavigate={onNavigate} />
    </Box>
  );
}

function ConversationList({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();
  const { loadConversation, conversationId, newChat } = useChat();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] =
    useState<ConversationSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          conversations: ConversationSummary[];
        };
        setConversations(data.conversations);
      }
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener(CONVERSATIONS_CHANGED, handler);
    return () => window.removeEventListener(CONVERSATIONS_CHANGED, handler);
  }, [load]);

  const handleOpen = async (id: string) => {
    onNavigate();
    if (pathname !== "/chat") router.push("/chat");
    if (!(await loadConversation(id))) {
      enqueueSnackbar("Couldn't open that conversation.", {
        variant: "error",
      });
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    setConversations((prev) => prev.filter((c) => c.id !== target.id));
    if (target.id === conversationId) newChat();
    const res = await fetch(`/api/conversations/${target.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res?.ok) {
      enqueueSnackbar("Couldn't delete the conversation.", {
        variant: "error",
      });
      void load();
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, py: 1.5 }}>
      <Typography
        variant="overline"
        component="h2"
        color="text.secondary"
        sx={{ px: 1, fontWeight: 600, letterSpacing: "0.08em" }}
      >
        Recent
      </Typography>

      {loading ? (
        <Box sx={{ px: 1 }}>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={{ py: 1 }}>
              <Skeleton width="80%" height={18} />
              <Skeleton width="40%" height={14} />
            </Box>
          ))}
        </Box>
      ) : conversations.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 1, py: 1, fontSize: 13 }}
        >
          No conversations yet. Your chats will show up here.
        </Typography>
      ) : (
        <List dense disablePadding sx={{ mt: 0.5 }}>
          <AnimatePresence initial={false}>
            {conversations.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Delete conversation">
                      <IconButton
                        className="flux-conv-delete"
                        size="small"
                        edge="end"
                        onClick={() => setPendingDelete(c)}
                        sx={{
                          color: "text.secondary",
                          "&:hover": { color: "error.main" },
                        }}
                      >
                        <DeleteOutline sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{
                    mb: 0.5,
                    // Reveal delete on hover/focus; always visible on touch.
                    "& .flux-conv-delete": {
                      opacity: 0,
                      transition: "opacity var(--dur-fast)",
                    },
                    "&:hover .flux-conv-delete, &:focus-within .flux-conv-delete":
                      { opacity: 1 },
                    "@media (hover: none)": {
                      "& .flux-conv-delete": { opacity: 0.7 },
                    },
                  }}
                >
                  <ListItemButton
                    selected={pathname === "/chat" && c.id === conversationId}
                    onClick={() => void handleOpen(c.id)}
                    sx={{ borderRadius: 2, pr: 5, ...selectedSx }}
                  >
                    <ListItemText
                      primary={c.title}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: 500,
                        noWrap: true,
                      }}
                      secondary={`${formatRelativeTime(c.updatedAt)} · ${c.messageCount} msg${c.messageCount === 1 ? "" : "s"}`}
                      secondaryTypographyProps={{ fontSize: 11, noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      )}

      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: "var(--surface-solid)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-panel)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete conversation?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            &ldquo;{pendingDelete?.title}&rdquo; and all of its messages will be
            permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void confirmDelete()}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
