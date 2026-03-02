'use client';

/**
 * NERA AI Dashboard - Model Selector Component
 * Dynamic model dropdown with grouping and search (MUI)
 */

import React, { useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import StarIcon from '@mui/icons-material/Star';
import { useModels } from '../hooks/useModels';
import type { Model } from '../types';

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string, model?: Model) => void;
  disabled?: boolean;
  placeholder?: string;
  showCapabilities?: boolean;
  size?: 'small' | 'medium';
  style?: React.CSSProperties;
}

// Provider color mapping
const providerColors: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#c96442',
  Google: '#4285f4',
  Azure: '#0078d4',
  AWS: '#ff9900',
  Cohere: '#39594d',
  Other: '#666666',
};

const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select a model',
  showCapabilities = true,
  size = 'medium',
  style,
}) => {
  const { groupedModels, isLoading, getModelById } = useModels({ autoLoad: true });

  // Build flat options sorted by provider for Autocomplete grouping
  const options = useMemo(() => {
    const sorted = Object.entries(groupedModels).flatMap(([provider, providerModels]) =>
      providerModels.map((m) => ({ ...m, _provider: provider }))
    );
    // Autocomplete groups consecutive items, so sort by provider
    sorted.sort((a, b) => a._provider.localeCompare(b._provider));
    return sorted;
  }, [groupedModels]);

  type ModelOption = (typeof options)[number];

  const handleChange = (_event: React.SyntheticEvent, option: ModelOption | null) => {
    if (option) {
      const model = getModelById(option.id);
      onChange?.(option.id, model);
    }
  };

  // Capability badges
  const renderCapabilities = (model: Model) => {
    if (!showCapabilities) return null;
    return (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto', flexShrink: 0 }}>
        {model.capabilities?.vision && (
          <Tooltip title="Supports vision/images" arrow>
            <Chip label="👁" size="small" color="primary" variant="outlined" sx={{ fontSize: 10, height: 20, '& .MuiChip-label': { px: 0.5 } }} />
          </Tooltip>
        )}
        {model.capabilities?.functionCalling && (
          <Tooltip title="Function calling" arrow>
            <Chip label="⚡" size="small" color="secondary" variant="outlined" sx={{ fontSize: 10, height: 20, '& .MuiChip-label': { px: 0.5 } }} />
          </Tooltip>
        )}
        {model.capabilities?.streaming && (
          <Tooltip title="Streaming" arrow>
            <BoltIcon sx={{ color: '#faad14', fontSize: 16 }} />
          </Tooltip>
        )}
        {model.capabilities?.recommended && (
          <Tooltip title="Recommended" arrow>
            <StarIcon sx={{ color: '#faad14', fontSize: 16 }} />
          </Tooltip>
        )}
      </Stack>
    );
  };

  return (
    <Autocomplete<ModelOption, false, false, false>
      value={options.find((o) => o.id === value) ?? null}
      onChange={handleChange}
      disabled={disabled || isLoading}
      options={options}
      loading={isLoading}
      groupBy={(option) => option._provider}
      getOptionLabel={(option) => option.displayName || option.id}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      noOptionsText={
        isLoading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" py={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Loading models…</Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            No models found
          </Typography>
        )
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          size={size}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <SmartToyOutlinedIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderGroup={(params) => (
        <li key={params.key}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 1.5, py: 0.75, position: 'sticky', top: -8, bgcolor: 'background.paper', zIndex: 1 }}
          >
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: providerColors[params.group] || providerColors.Other,
                flexShrink: 0,
              }}
            />
            <Typography variant="subtitle2" fontWeight={700}>
              {params.group}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({groupedModels[params.group]?.length ?? 0})
            </Typography>
          </Stack>
          <Divider />
          <ul style={{ padding: 0 }}>{params.children}</ul>
        </li>
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        return (
          <li key={key} {...rest}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
              <SmartToyOutlinedIcon sx={{ fontSize: 18, color: 'action.active' }} />
              <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                {option.displayName || option.id}
              </Typography>
              {renderCapabilities(option)}
            </Stack>
          </li>
        );
      }}
      sx={{ minWidth: 220, ...style }}
    />
  );
};

export default ModelSelector;
