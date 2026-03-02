'use client';

/**
 * NERA AI Dashboard - Model Info Component
 * Displays model capabilities and details
 * Migrated from antd to MUI
 */

import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FunctionsIcon from '@mui/icons-material/Functions';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import StarIcon from '@mui/icons-material/Star';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CodeIcon from '@mui/icons-material/Code';
import type { Model } from '../types';

interface ModelInfoProps {
  model: Model;
  compact?: boolean;
  showPricing?: boolean;
}

// Provider color mapping
const providerColors: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#c96442',
  Google: '#4285f4',
  Azure: '#0078d4',
  AWS: '#ff9900',
  Cohere: '#39594d',
};

/** Reusable statistic block (replaces antd Statistic) */
const StatBlock: React.FC<{
  label: string;
  value: React.ReactNode;
  suffix?: string;
}> = ({ label, value, suffix }) => (
  <Box>
    <Typography variant="h5" sx={{ fontSize: 16, fontWeight: 600 }}>
      {value}
      {suffix && (
        <Typography component="span" variant="body2" sx={{ ml: 0.25 }}>
          {suffix}
        </Typography>
      )}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

const ModelInfo: React.FC<ModelInfoProps> = ({
  model,
  compact = false,
  showPricing = true,
}) => {
  const capabilities = model.capabilities || {};
  const providerColor = providerColors[model.provider] || '#666';

  // Capability badges
  const renderCapabilities = () => (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {capabilities.streaming && (
        <Tooltip title="Supports streaming responses">
          <Chip
            icon={<BoltIcon />}
            label="Streaming"
            size="small"
            sx={{ bgcolor: '#fffbe6', color: '#ad8b00', '& .MuiChip-icon': { color: '#ad8b00' } }}
          />
        </Tooltip>
      )}
      {capabilities.vision && (
        <Tooltip title="Can analyze images and visual content">
          <Chip
            icon={<VisibilityIcon />}
            label="Vision"
            size="small"
            color="primary"
            variant="outlined"
          />
        </Tooltip>
      )}
      {capabilities.functionCalling && (
        <Tooltip title="Supports function/tool calling">
          <Chip
            icon={<FunctionsIcon />}
            label="Functions"
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Tooltip>
      )}
      {capabilities.codeInterpreter && (
        <Tooltip title="Can execute and analyze code">
          <Chip
            icon={<CodeIcon />}
            label="Code Interpreter"
            size="small"
            color="info"
            variant="outlined"
          />
        </Tooltip>
      )}
      {capabilities.recommended && (
        <Tooltip title="Recommended for best performance">
          <Chip
            icon={<StarIcon />}
            label="Recommended"
            size="small"
            color="warning"
            variant="outlined"
          />
        </Tooltip>
      )}
    </Stack>
  );

  // Compact view
  if (compact) {
    return (
      <Stack spacing={1} sx={{ width: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SmartToyOutlinedIcon fontSize="small" />
          <Typography fontWeight={600}>
            {model.displayName || model.id}
          </Typography>
          <Chip
            label={model.provider}
            size="small"
            sx={{
              bgcolor: providerColor,
              color: '#fff',
              fontWeight: 500,
            }}
          />
        </Stack>

        {renderCapabilities()}

        {model.contextWindow && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
            Context: {(model.contextWindow / 1000).toFixed(0)}K tokens
          </Typography>
        )}
      </Stack>
    );
  }

  // Full view
  return (
    <Card variant="outlined" sx={{ overflow: 'visible' }}>
      <CardHeader
        avatar={
          <SmartToyOutlinedIcon sx={{ color: providerColor }} />
        }
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={600}>
              {model.displayName || model.id}
            </Typography>
            <Chip
              label={model.provider}
              size="small"
              sx={{
                bgcolor: providerColor,
                color: '#fff',
                fontWeight: 500,
              }}
            />
          </Stack>
        }
        sx={{ pb: 0 }}
      />

      <CardContent>
        {/* Description */}
        {model.description && (
          <>
            <Typography variant="body2" color="text.secondary">
              {model.description}
            </Typography>
            <Divider sx={{ my: 1.5 }} />
          </>
        )}

        {/* Capabilities */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}
          >
            <InfoOutlinedIcon fontSize="small" /> Capabilities
          </Typography>
          {renderCapabilities()}
        </Box>

        {/* Stats — 2-column grid replacing antd Row/Col + Statistic */}
        <Grid container spacing={2}>
          {model.contextWindow && (
            <Grid item xs={4}>
              <StatBlock
                label="Context Window"
                value={(model.contextWindow / 1000).toFixed(0)}
                suffix="K"
              />
            </Grid>
          )}
          {model.maxOutputTokens && (
            <Grid item xs={4}>
              <StatBlock
                label="Max Output"
                value={(model.maxOutputTokens / 1000).toFixed(0)}
                suffix="K"
              />
            </Grid>
          )}
          {model.latency && (
            <Grid item xs={4}>
              <StatBlock
                label="Avg Latency"
                value={model.latency}
                suffix="ms"
              />
            </Grid>
          )}
        </Grid>

        {/* Pricing */}
        {showPricing && model.pricing && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}
              >
                <AttachMoneyIcon fontSize="small" /> Pricing (per 1M tokens)
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" component="span">
                    Input:{' '}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} component="span">
                    ${model.pricing.inputPer1M?.toFixed(2) || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" component="span">
                    Output:{' '}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} component="span">
                    ${model.pricing.outputPer1M?.toFixed(2) || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelInfo;
