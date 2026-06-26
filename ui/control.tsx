import React, { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import {
    doToggleOverlay,
    useConfig,
    useStatus,
    type PluginConfig,
} from './api';

const ControlPanel: React.FC = () => {
    const { t } = useTranslation('cg-propresenter-plugin');
    const conn = useSocket();
    const [config, updateConfig] = useConfig();
    const status = useStatus();

    // Local draft state for host / port fields (save on blur)
    const [host, setHost] = useState<string | null>(null);
    const [port, setPort] = useState<string | null>(null);

    const currentHost = host ?? config?.host ?? '';
    const currentPort = port ?? String(config?.port ?? '');

    const save = (patch: Partial<PluginConfig>) =>
        updateConfig(patch).catch(console.error);

    const handleHostBlur = () => {
        if (host !== null && host !== config?.host) {
            save({ host }).then(() => setHost(null));
        }
    };

    const handlePortBlur = () => {
        const num = parseInt(currentPort, 10);
        if (!isNaN(num) && num !== config?.port) {
            save({ port: num }).then(() => setPort(null));
        }
    };

    const handleEnabledChange = (enabled: boolean) => save({ enabled });

    const handleToggleOverlay = () =>
        doToggleOverlay(conn).catch(console.error);

    if (!config) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    pt: 6,
                }}
            >
                <CircularProgress size={32} />
            </Box>
        );
    }

    return (
        <Stack spacing={3} sx={{ maxWidth: 480, p: 3 }}>
            <Typography variant="h5">{t('control.heading')}</Typography>

            {/* Connection config */}
            <Stack spacing={2}>
                <Typography variant="overline" color="text.secondary">
                    {t('control.connectionSection')}
                </Typography>

                <Stack direction="row" spacing={2}>
                    <TextField
                        label={t('control.host')}
                        value={currentHost}
                        onChange={e => setHost(e.target['value'])}
                        onBlur={handleHostBlur}
                        size="small"
                        sx={{ flex: 2 }}
                    />
                    <TextField
                        label={t('control.port')}
                        value={currentPort}
                        onChange={e => setPort(e.target['value'])}
                        onBlur={handlePortBlur}
                        size="small"
                        inputProps={{ inputMode: 'numeric' }}
                        sx={{ flex: 1 }}
                    />
                </Stack>

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography variant="body2">
                        {t('control.enabled')}
                    </Typography>
                    <Switch
                        checked={config.enabled}
                        onChange={e => handleEnabledChange(e.target['checked'])}
                    />
                </Stack>
            </Stack>

            <Divider />

            {/* Live status */}
            <Stack spacing={1.5}>
                <Typography variant="overline" color="text.secondary">
                    {t('control.statusSection')}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                    {status?.connected ? (
                        <CheckCircleIcon
                            sx={{ fontSize: 18, color: 'success.main' }}
                        />
                    ) : (
                        <ErrorIcon
                            sx={{ fontSize: 18, color: 'text.disabled' }}
                        />
                    )}
                    <Typography variant="body2" color="text.secondary">
                        {status?.connected
                            ? t('control.connected')
                            : t('control.disconnected')}
                    </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ pt: 0.3 }}
                    >
                        {t('control.currentText')}:
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontStyle: status?.currentText
                                ? 'normal'
                                : 'italic',
                            color: status?.currentText
                                ? 'text.primary'
                                : 'text.disabled',
                        }}
                    >
                        {status?.currentText || t('control.noText')}
                    </Typography>
                </Stack>
            </Stack>

            <Divider />

            {/* Overlay toggle */}
            <Stack spacing={1.5}>
                <Typography variant="overline" color="text.secondary">
                    {t('control.overlaySection')}
                </Typography>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                        icon={
                            status?.overlayOn ? (
                                <VisibilityIcon />
                            ) : (
                                <VisibilityOffIcon />
                            )
                        }
                        label={
                            status?.overlayOn
                                ? t('control.overlayOn')
                                : t('control.overlayOff')
                        }
                        color={status?.overlayOn ? 'primary' : 'default'}
                        size="small"
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleToggleOverlay}
                    >
                        {t('control.toggleOverlay')}
                    </Button>
                </Stack>
            </Stack>
        </Stack>
    );
};

export default ControlPanel;
