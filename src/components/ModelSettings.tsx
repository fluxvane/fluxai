'use client';

/**
 * NERA AI Dashboard - Model Settings Component
 * Configure temperature, max tokens, and other model parameters
 */

import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Settings from '@mui/icons-material/Settings';
import Undo from '@mui/icons-material/Undo';
import Info from '@mui/icons-material/Info';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Science from '@mui/icons-material/Science';
import Bolt from '@mui/icons-material/Bolt';
import Tag from '@mui/icons-material/Tag';
import type { Model } from '../types';

// ── Types ──────────────────────────────────────────────────────────────

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  stream: boolean;
}

interface ModelSettingsProps {
  model?: Model;
  settings: ModelSettings;
  onChange: (settings: ModelSettings) => void;
  compact?: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: ModelSettings = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: [],
  stream: true,
};

// ── Helpers ────────────────────────────────────────────────────────────

const temperatureMarks = [
  { value: 0, label: 'Precise' },
  { value: 1, label: 'Balanced' },
  { value: 2, label: 'Creative' },
];

// ── Component ──────────────────────────────────────────────────────────

const ModelSettingsComponent: React.FC<ModelSettingsProps> = ({
  model,
  settings,
  onChange,
  compact = false,
}) => {
  const updateSetting = useCallback(
    <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => {
      onChange({ ...settings, [key]: value });
    },
    [settings, onChange],
  );

  const resetToDefaults = useCallback(() => {
    onChange(DEFAULT_SETTINGS);
  }, [onChange]);

  const maxOutputTokens = model?.maxOutputTokens || 4096;

  // ── Compact (inline) mode ──────────────────────────────────────────

  if (compact) {
    return (
      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
        {/* Temperature */}
        <Tooltip title="Temperature: Controls randomness (0 = deterministic, 1 = creative)">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Science fontSize="small" />
            <TextField
              type="number"
              size="small"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              value={settings.temperature}
              onChange={(e) =>
                updateSetting('temperature', parseFloat(e.target.value) || 0.7)
              }
              sx={{ width: 72 }}
            />
          </Stack>
        </Tooltip>

        {/* Max Tokens */}
        <Tooltip title="Max tokens in response">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tag fontSize="small" />
            <TextField
              type="number"
              size="small"
              inputProps={{ min: 1, max: maxOutputTokens, step: 256 }}
              value={settings.maxTokens}
              onChange={(e) =>
                updateSetting('maxTokens', parseInt(e.target.value, 10) || 2048)
              }
              sx={{ width: 90 }}
            />
          </Stack>
        </Tooltip>

        {/* Stream toggle */}
        <Tooltip title="Stream responses">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Bolt fontSize="small" />
            <Switch
              size="small"
              checked={settings.stream}
              onChange={(_e, checked) => updateSetting('stream', checked)}
            />
          </Stack>
        </Tooltip>
      </Stack>
    );
  }

  // ── Full settings panel ────────────────────────────────────────────

  return (
    <Card variant="outlined">
      <CardHeader
        avatar={<Settings fontSize="small" />}
        title="Model Settings"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
        action={
          <Tooltip title="Reset to defaults">
            <Button
              size="small"
              startIcon={<Undo />}
              onClick={resetToDefaults}
            >
              Reset
            </Button>
          </Tooltip>
        }
        sx={{ pb: 0 }}
      />

      <CardContent>
        {/* ── Temperature ──────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Science fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Temperature
            </Typography>
            <Tooltip title="Controls randomness. Lower values make responses more focused and deterministic. Higher values make output more random and creative.">
              <Info fontSize="small" sx={{ color: 'text.secondary' }} />
            </Tooltip>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature}
                onChange={(_e, v) =>
                  updateSetting('temperature', v as number)
                }
                marks={temperatureMarks}
                valueLabelDisplay="auto"
              />
            </Box>
            <TextField
              type="number"
              size="small"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              value={settings.temperature}
              onChange={(e) =>
                updateSetting('temperature', parseFloat(e.target.value) || 0.7)
              }
              sx={{ width: 72 }}
            />
          </Box>
        </Box>

        {/* ── Max Tokens ───────────────────────────────────────────── */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Tag fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Max Tokens
            </Typography>
            <Tooltip title="Maximum number of tokens in the response. Higher values allow longer responses but cost more.">
              <Info fontSize="small" sx={{ color: 'text.secondary' }} />
            </Tooltip>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Slider
                min={256}
                max={maxOutputTokens}
                step={256}
                value={settings.maxTokens}
                onChange={(_e, v) =>
                  updateSetting('maxTokens', v as number)
                }
                valueLabelDisplay="auto"
              />
            </Box>
            <TextField
              type="number"
              size="small"
              inputProps={{ min: 256, max: maxOutputTokens, step: 256 }}
              value={settings.maxTokens}
              onChange={(e) =>
                updateSetting('maxTokens', parseInt(e.target.value, 10) || 2048)
              }
              sx={{ width: 90 }}
            />
          </Box>
        </Box>

        {/* ── Stream Response ──────────────────────────────────────── */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Bolt fontSize="small" />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.stream}
                  onChange={(_e, checked) => updateSetting('stream', checked)}
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  Stream Response
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary">
              {settings.stream
                ? "Tokens appear as they're generated"
                : 'Wait for complete response'}
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* ── Advanced Settings (Accordion) ────────────────────────── */}
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" fontWeight={600}>
              Advanced Settings
            </Typography>
          </AccordionSummary>

          <AccordionDetails>
            {/* ── Top P ──────────────────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  Top P (Nucleus Sampling)
                </Typography>
                <Tooltip title="An alternative to temperature. Only considers tokens with top_p probability mass.">
                  <Info fontSize="small" sx={{ color: 'text.secondary' }} />
                </Tooltip>
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.topP}
                    onChange={(_e, v) =>
                      updateSetting('topP', v as number)
                    }
                    valueLabelDisplay="auto"
                  />
                </Box>
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ min: 0, max: 1, step: 0.05 }}
                  value={settings.topP}
                  onChange={(e) =>
                    updateSetting('topP', parseFloat(e.target.value) || 1)
                  }
                  sx={{ width: 72 }}
                />
              </Box>
            </Box>

            {/* ── Frequency Penalty ─────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  Frequency Penalty
                </Typography>
                <Tooltip title="Reduces repetition by penalizing tokens based on their frequency in the text so far.">
                  <Info fontSize="small" sx={{ color: 'text.secondary' }} />
                </Tooltip>
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Slider
                    min={-2}
                    max={2}
                    step={0.1}
                    value={settings.frequencyPenalty}
                    onChange={(_e, v) =>
                      updateSetting('frequencyPenalty', v as number)
                    }
                    valueLabelDisplay="auto"
                  />
                </Box>
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ min: -2, max: 2, step: 0.1 }}
                  value={settings.frequencyPenalty}
                  onChange={(e) =>
                    updateSetting(
                      'frequencyPenalty',
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  sx={{ width: 72 }}
                />
              </Box>
            </Box>

            {/* ── Presence Penalty ──────────────────────────────── */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  Presence Penalty
                </Typography>
                <Tooltip title="Encourages new topics by penalizing tokens that have already appeared.">
                  <Info fontSize="small" sx={{ color: 'text.secondary' }} />
                </Tooltip>
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Slider
                    min={-2}
                    max={2}
                    step={0.1}
                    value={settings.presencePenalty}
                    onChange={(_e, v) =>
                      updateSetting('presencePenalty', v as number)
                    }
                    valueLabelDisplay="auto"
                  />
                </Box>
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ min: -2, max: 2, step: 0.1 }}
                  value={settings.presencePenalty}
                  onChange={(e) =>
                    updateSetting(
                      'presencePenalty',
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  sx={{ width: 72 }}
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ModelSettingsComponent;
