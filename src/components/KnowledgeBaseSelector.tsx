'use client';

import React from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';
import type { KnowledgeBase } from '../types';

interface KnowledgeBaseSelectorProps {
  knowledgeBases: KnowledgeBase[];
  selectedId?: string;
  onChange: (kb: KnowledgeBase | undefined) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  knowledgeBases,
  selectedId,
  onChange,
  disabled = false,
  size = 'small',
}) => {
  const handleChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value;
    if (value === '__none__') {
      onChange(undefined);
      return;
    }
    const kb = knowledgeBases.find((k) => k.id === value);
    onChange(kb);
  };

  return (
    <FormControl size={size} sx={{ minWidth: 200 }} disabled={disabled}>
      <InputLabel id="kb-selector-label">Knowledge Base</InputLabel>
      <Select
        labelId="kb-selector-label"
        value={selectedId ?? '__none__'}
        label="Knowledge Base"
        onChange={handleChange}
      >
        <MenuItem value="__none__">
          <Typography variant="body2" color="text.secondary">
            No Knowledge Base (general chat)
          </Typography>
        </MenuItem>
        {knowledgeBases.map((kb) => (
          <MenuItem key={kb.id} value={kb.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon fontSize="small" color="primary" />
              <Box>
                <Typography variant="body2">{kb.name}</Typography>
                {kb.documentCount > 0 && (
                  <Chip
                    label={`${kb.documentCount} docs`}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default KnowledgeBaseSelector;
