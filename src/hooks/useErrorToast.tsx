"use client";

import React, { useCallback, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

/**
 * Minimal error toast on plain MUI Snackbar, for failures that have no inline
 * place to surface (e.g. a sidebar action). Render `toast` once in the
 * component that calls `showError`.
 */
export function useErrorToast() {
  // Keep the last message while closing so the text doesn't vanish mid-fade.
  const [state, setState] = useState({ open: false, message: "" });
  const close = useCallback(
    () => setState((prev) => ({ ...prev, open: false })),
    [],
  );
  const showError = useCallback(
    (message: string) => setState({ open: true, message }),
    [],
  );

  const toast = (
    <Snackbar
      open={state.open}
      autoHideDuration={4000}
      onClose={(_, reason) => {
        if (reason !== "clickaway") close();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        severity="error"
        variant="filled"
        onClose={close}
        sx={{ width: "100%" }}
      >
        {state.message}
      </Alert>
    </Snackbar>
  );

  return { showError, toast };
}
