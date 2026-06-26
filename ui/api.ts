import { useEffect, useState } from 'react';
import { useSocket } from '@web-lib';

const ROOT = '/api/plugin/propresenter';

export interface PluginConfig {
    host: string;
    port: number;
    enabled: boolean;
}

export interface PluginStatus {
    connected: boolean;
    overlayOn: boolean;
    barsActive: boolean;
    currentText: string;
}

export const getConfig = (conn: any): Promise<PluginConfig> =>
    conn.rawRequest(`${ROOT}/config`, 'GET', {}).then(r => r.data);

export const updateConfig = (
    conn: any,
    patch: Partial<PluginConfig>,
): Promise<PluginConfig> =>
    conn.rawRequest(`${ROOT}/config`, 'UPDATE', patch).then(r => r.data);

export const getStatus = (conn: any): Promise<PluginStatus> =>
    conn.rawRequest(`${ROOT}/status`, 'GET', {}).then(r => r.data);

export const doToggleOverlay = (conn: any): Promise<{ on: boolean }> =>
    conn.rawRequest(`${ROOT}/overlay`, 'ACTION', {}).then(r => r.data);

export function useConfig(): [
    PluginConfig | null,
    (patch: Partial<PluginConfig>) => Promise<void>,
] {
    const conn = useSocket();
    const [config, setConfig] = useState<PluginConfig | null>(null);

    useEffect(() => {
        getConfig(conn).then(setConfig).catch(console.error);
    }, []);

    const update = async (patch: Partial<PluginConfig>) => {
        const next = await updateConfig(conn, patch);
        setConfig(next);
    };

    return [config, update];
}

export function useStatus(): PluginStatus | null {
    const conn = useSocket();
    const [status, setStatus] = useState<PluginStatus | null>(null);

    useEffect(() => {
        getStatus(conn).then(setStatus).catch(console.error);

        const listener = {
            path: 'plugin/propresenter/status',
            method: 'UPDATE',
            handler: req => setStatus(req.data ?? null),
        };

        conn.routes.register(listener);
        return () => conn.routes.unregister(listener);
    }, []);

    return status;
}
