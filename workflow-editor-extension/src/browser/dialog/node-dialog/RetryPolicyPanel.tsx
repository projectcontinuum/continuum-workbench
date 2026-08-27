import * as React from 'react';
import {
  Box, Button, Typography,
  ToggleButtonGroup, ToggleButton, InputAdornment, Slider, Autocomplete, Tooltip, FormControl, Select, MenuItem, TextField
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { IRetryOptions } from '@continuum/core';

const WORKFLOW_DEFAULT_RETRY = {
  maximumAttempts: 500,
  backoffCoefficient: 2.0,
  initialIntervalSeconds: 1,
  maximumIntervalSeconds: 100,
} as const;

const DURATION_UNITS = [
  { key: 'seconds', label: 'sec', seconds: 1 },
  { key: 'minutes', label: 'min', seconds: 60 },
  { key: 'hours', label: 'hr', seconds: 3600 },
  { key: 'days', label: 'day', seconds: 86400 },
  { key: 'weeks', label: 'wk', seconds: 604800 },
  { key: 'years', label: 'yr', seconds: 31536000 },
] as const;

function pickBestUnit(totalSeconds: number) {
  for (let i = DURATION_UNITS.length - 1; i > 0; i--) {
    if (totalSeconds % DURATION_UNITS[i].seconds === 0) return DURATION_UNITS[i];
  }
  return DURATION_UNITS[0];
}

interface DurationInputProps {
  label: string;
  valueSeconds: number;
  disabled?: boolean;
  onChange: (totalSeconds: number) => void;
}

function DurationInput({ label, valueSeconds, disabled, onChange }: DurationInputProps) {
  const [unit, setUnit] = React.useState(() => pickBestUnit(valueSeconds));

  React.useEffect(() => { setUnit(pickBestUnit(valueSeconds)); }, [valueSeconds]);

  const displayValue = valueSeconds / unit.seconds;

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <TextField
        type="number"
        label={label}
        value={displayValue}
        disabled={disabled}
        sx={{ flex: 1 }}
        onChange={(e) => onChange(Number(e.target.value) * unit.seconds)}
      />
      <FormControl size="small" sx={{ minWidth: 90 }} disabled={disabled}>
        <Select
          value={unit.key}
          onChange={(e) => {
            const next = DURATION_UNITS.find(u => u.key === e.target.value)!;
            setUnit(next);
            onChange(displayValue * next.seconds);
          }}
        >
          {DURATION_UNITS.map(u => <MenuItem key={u.key} value={u.key}>{u.label}</MenuItem>)}
        </Select>
      </FormControl>
    </Box>
  );
}

type RetryField = 'maximumAttempts' | 'backoffCoefficient' | 'initialIntervalSeconds' | 'maximumIntervalSeconds';

export interface RetryPolicyPanelProps {
    retryOptions: IRetryOptions;
    onChange: (retryOptions: IRetryOptions) => void;
    readOnly?: boolean;
}

/**
 * Uncontrolled per-field default/custom toggle state that mirrors `retryOptions`
 * only at mount time — callers must remount (e.g. via a `key` tied to the node id)
 * when switching to a different node's retry options.
 */
export default function RetryPolicyPanel({ retryOptions, onChange, readOnly = false }: RetryPolicyPanelProps) {
    const [overrides, setOverrides] = React.useState<Record<RetryField, boolean>>(() => ({
        maximumAttempts: retryOptions.maximumAttempts !== undefined,
        backoffCoefficient: retryOptions.backoffCoefficient !== undefined,
        initialIntervalSeconds: retryOptions.initialIntervalSeconds !== undefined,
        maximumIntervalSeconds: retryOptions.maximumIntervalSeconds !== undefined,
    }));

    const setFieldOverride = React.useCallback((field: RetryField, isCustom: boolean) => {
        setOverrides(o => ({ ...o, [field]: isCustom }));
        onChange({
            ...retryOptions,
            [field]: isCustom ? WORKFLOW_DEFAULT_RETRY[field] : undefined
        });
    }, [retryOptions, onChange]);

    const resetToDefaults = React.useCallback(() => {
        setOverrides({
            maximumAttempts: false,
            backoffCoefficient: false,
            initialIntervalSeconds: false,
            maximumIntervalSeconds: false,
        });
        onChange({ ...retryOptions, maximumAttempts: undefined, backoffCoefficient: undefined, initialIntervalSeconds: undefined, maximumIntervalSeconds: undefined });
    }, [retryOptions, onChange]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, width: '100%', boxSizing: 'border-box' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={resetToDefaults} disabled={readOnly}>
                    Reset to workflow defaults
                </Button>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Attempts &amp; Backoff
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Maximum Attempts</Typography>
                                <Tooltip title="How many times a failed node retries before the workflow gives up. 0 means unlimited attempts.">
                                    <InfoOutlinedIcon fontSize="small" color="action" />
                                </Tooltip>
                            </Box>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={overrides.maximumAttempts ? 'custom' : 'default'}
                                disabled={readOnly}
                                onChange={(_, v) => v && setFieldOverride('maximumAttempts', v === 'custom')}
                            >
                                <ToggleButton value="default" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Default</ToggleButton>
                                <ToggleButton value="custom" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <TextField
                            type="number"
                            fullWidth
                            disabled={readOnly || !overrides.maximumAttempts}
                            value={overrides.maximumAttempts ? (retryOptions.maximumAttempts ?? '') : WORKFLOW_DEFAULT_RETRY.maximumAttempts}
                            onChange={(e) => onChange({ ...retryOptions, maximumAttempts: e.target.value === '' ? undefined : Number(e.target.value) })}
                            InputProps={{ endAdornment: <InputAdornment position="end">attempts</InputAdornment> }}
                        />
                    </Box>

                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Backoff Coefficient</Typography>
                                <Tooltip title="Multiplier applied to the retry interval after each attempt. Higher values back off faster.">
                                    <InfoOutlinedIcon fontSize="small" color="action" />
                                </Tooltip>
                            </Box>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={overrides.backoffCoefficient ? 'custom' : 'default'}
                                disabled={readOnly}
                                onChange={(_, v) => v && setFieldOverride('backoffCoefficient', v === 'custom')}
                            >
                                <ToggleButton value="default" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Default</ToggleButton>
                                <ToggleButton value="custom" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <TextField
                            type="number"
                            fullWidth
                            disabled={readOnly || !overrides.backoffCoefficient}
                            value={overrides.backoffCoefficient ? (retryOptions.backoffCoefficient ?? '') : WORKFLOW_DEFAULT_RETRY.backoffCoefficient}
                            onChange={(e) => onChange({ ...retryOptions, backoffCoefficient: e.target.value === '' ? undefined : Number(e.target.value) })}
                            InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                        />
                        <Slider
                            size="small"
                            min={1.0}
                            max={5.0}
                            step={0.1}
                            disabled={readOnly || !overrides.backoffCoefficient}
                            value={overrides.backoffCoefficient ? (retryOptions.backoffCoefficient ?? WORKFLOW_DEFAULT_RETRY.backoffCoefficient) : WORKFLOW_DEFAULT_RETRY.backoffCoefficient}
                            onChange={(_, v) => onChange({ ...retryOptions, backoffCoefficient: v as number })}
                            sx={{ mt: 1 }}
                        />
                    </Box>

                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Initial Interval</Typography>
                                <Tooltip title="How long to wait before the first retry attempt.">
                                    <InfoOutlinedIcon fontSize="small" color="action" />
                                </Tooltip>
                            </Box>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={overrides.initialIntervalSeconds ? 'custom' : 'default'}
                                disabled={readOnly}
                                onChange={(_, v) => v && setFieldOverride('initialIntervalSeconds', v === 'custom')}
                            >
                                <ToggleButton value="default" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Default</ToggleButton>
                                <ToggleButton value="custom" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <DurationInput
                            label="Initial Interval"
                            disabled={readOnly || !overrides.initialIntervalSeconds}
                            valueSeconds={overrides.initialIntervalSeconds ? (retryOptions.initialIntervalSeconds ?? WORKFLOW_DEFAULT_RETRY.initialIntervalSeconds) : WORKFLOW_DEFAULT_RETRY.initialIntervalSeconds}
                            onChange={(seconds) => onChange({ ...retryOptions, initialIntervalSeconds: seconds })}
                        />
                    </Box>

                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Maximum Interval</Typography>
                                <Tooltip title="The retry interval is capped at this value, no matter how many attempts have passed.">
                                    <InfoOutlinedIcon fontSize="small" color="action" />
                                </Tooltip>
                            </Box>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={overrides.maximumIntervalSeconds ? 'custom' : 'default'}
                                disabled={readOnly}
                                onChange={(_, v) => v && setFieldOverride('maximumIntervalSeconds', v === 'custom')}
                            >
                                <ToggleButton value="default" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Default</ToggleButton>
                                <ToggleButton value="custom" sx={{ fontSize: '11px', padding: '2px 6px', textTransform: 'none' }}>Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <DurationInput
                            label="Maximum Interval"
                            disabled={readOnly || !overrides.maximumIntervalSeconds}
                            valueSeconds={overrides.maximumIntervalSeconds ? (retryOptions.maximumIntervalSeconds ?? WORKFLOW_DEFAULT_RETRY.maximumIntervalSeconds) : WORKFLOW_DEFAULT_RETRY.maximumIntervalSeconds}
                            onChange={(seconds) => onChange({ ...retryOptions, maximumIntervalSeconds: seconds })}
                        />
                    </Box>

                </Box>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
                    Non-Retryable Errors
                </Typography>
                <Autocomplete
                    multiple
                    freeSolo
                    size="small"
                    options={[] as string[]}
                    value={retryOptions.doNotRetry || []}
                    disabled={readOnly}
                    onChange={(_, values) => onChange({ ...retryOptions, doNotRetry: values.length ? values : undefined })}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Non-retryable error types"
                            placeholder="Type an error type and press Enter"
                            helperText="Nodes throwing one of these error types fail immediately instead of retrying."
                        />
                    )}
                />
            </Box>
        </Box>
    );
}
