import React from 'react';
import { ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Box,
  FormHelperText,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  IconButton,
  InputAdornment,
  OutlinedInput,
} from '@mui/material';
import { isControl, rankWith } from '@jsonforms/core';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { credentialsService, CredentialResponse } from '../../service/CredentialsService';

interface CredentialRendererProps extends ControlProps {
  options?: {
    format?: string;
    credentialType?: string;
  };
}

const CredentialRenderer: React.FC<CredentialRendererProps> = (props) => {
  const {
    data,
    handleChange,
    label,
    errors,
    options = {},
    visible,
    path,
  } = props;

  const credentialType = options.credentialType || '';
  const format = options.format || '';

  const [credentials, setCredentials] = React.useState<CredentialResponse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch credentials based on type
  const fetchCredentials = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fetchedCredentials: CredentialResponse[];

      if (credentialType) {
        // Fetch credentials filtered by type
        fetchedCredentials = await credentialsService.listByType(credentialType);
      } else {
        // Fetch all credentials
        fetchedCredentials = await credentialsService.list();
      }

      setCredentials(fetchedCredentials);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [credentialType]);

  // Fetch credentials on mount and when credentialType changes
  React.useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    handleChange(path, event.target.value);
  };

  const handleRefresh = () => {
    fetchCredentials();
  };

  const handleAddNew = () => {
    // TODO: Open credential creation dialog/modal
    console.log('Add new credential clicked, type:', credentialType);
  };

  if (format !== 'credential') {
    return null;
  }

  if (!visible) {
    return null;
  }

  const hasError = Boolean(errors && errors.length > 0);
  const errorMessage = hasError ? errors : undefined;

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl fullWidth error={hasError || !!error} size="small">
          <InputLabel id={`credential-select-label-${path}`}>
            {loading ? 'Loading...' : 'Select Credential'}
          </InputLabel>
          <Select
            labelId={`credential-select-label-${path}`}
            id={`credential-select-${path}`}
            value={data || ''}
            label={loading ? 'Loading...' : 'Select Credential'}
            onChange={handleSelectChange}
            disabled={loading}
            input={
              <OutlinedInput
                label={loading ? 'Loading...' : 'Select Credential'}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleRefresh}
                      disabled={loading}
                      sx={{ mr: 1 }}
                      title="Refresh credentials"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                }
              />
            }
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {credentials.map((cred) => (
              <MenuItem key={cred.name} value={cred.name}>
                {cred.name} {cred.description && `- ${cred.description}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
        >
          New
        </Button>
      </Box>
      {error && (
        <FormHelperText error={true} sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}
      {errorMessage && (
        <FormHelperText error={true} sx={{ mt: 1 }}>
          {errorMessage}
        </FormHelperText>
      )}
    </Box>
  );
};

const CredentialControl = withJsonFormsControlProps(CredentialRenderer);

// Tester to determine when to use this renderer
export const credentialTester = rankWith(
  10,
  (uischema: any) => {
    return (
      isControl(uischema) &&
      uischema.options?.format === 'credential'
    );
  }
);

export { CredentialControl };
export default CredentialControl;


