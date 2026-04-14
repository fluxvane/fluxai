'use client';

import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import type { RetrievedSource } from '../types';

interface SourcesCitationProps {
  sources: RetrievedSource[];
}

const SourcesCitation: React.FC<SourcesCitationProps> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources.length) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <DescriptionIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary">
          {sources.length} source{sources.length > 1 ? 's' : ''} referenced
        </Typography>
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <ExpandLess fontSize="small" />
          ) : (
            <ExpandMore fontSize="small" />
          )}
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ mt: 1, pl: 1 }}>
          {sources.map((source, i) => (
            <Box
              key={`${source.documentId}-${i}`}
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="caption" fontWeight={600}>
                  {source.documentTitle}
                </Typography>
                <Chip
                  label={`${(source.similarity * 100).toFixed(0)}% match`}
                  size="small"
                  color={
                    source.similarity > 0.85
                      ? 'success'
                      : source.similarity > 0.7
                        ? 'warning'
                        : 'default'
                  }
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 80,
                  overflow: 'hidden',
                }}
              >
                {source.content.length > 200
                  ? source.content.slice(0, 200) + '...'
                  : source.content}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

export default SourcesCitation;
