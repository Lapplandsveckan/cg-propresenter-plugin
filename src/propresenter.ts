import { noTry, noTryAsync } from 'no-try';
import { type Logger } from '@lappis/cg-manager';
import { type PluginConfig } from './config-store';

interface ClientOptions {
    getConfig: () => PluginConfig;
    onText: (text: string) => void;
    onStatusChange: (connected: boolean) => void;
    logger: Logger;
}

export class ProPresenterClient {
    private opts: ClientOptions;
    private enabled = false;
    private connected = false;
    private controller: AbortController | null = null;

    public constructor(opts: ClientOptions) {
        this.opts = opts;
    }

    public isConnected() {
        return this.connected;
    }

    public enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.connect();
    }

    public disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.controller?.abort();
        this.controller = null;
        this.setConnected(false);
    }

    public dispose() {
        this.disable();
    }

    private setConnected(connected: boolean) {
        if (this.connected === connected) return;
        this.connected = connected;
        this.opts.onStatusChange(connected);
    }

    // Extract slide text from a ProPresenter status/slide payload.
    // ProPresenter sends: { current: { text: "..." }, ... }
    private parseText(data: unknown): string {
        if (!data || typeof data !== 'object') return '';
        return typeof (data as any)?.current?.text === 'string'
            ? (data as any).current.text
            : '';
    }

    private async connect() {
        const { host, port } = this.opts.getConfig();
        const url = `http://${host}:${port}/v1/status/slide?chunked=true`;

        this.controller = new AbortController();
        const { signal } = this.controller;

        const [fetchErr, res] = await noTryAsync(() => fetch(url, { signal }));

        if (fetchErr || !res?.ok) {
            if (!this.enabled) return;
            this.setConnected(false);
            this.opts.logger.warn(
                `ProPresenter connection failed — retrying in 1 s`,
            );
            setTimeout(() => {
                if (this.enabled) this.connect();
            }, 1000);
            return;
        }

        this.setConnected(true);
        this.opts.logger.info('Connected to ProPresenter');

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const [readErr, chunk] = await noTryAsync(() => reader.read());

            if (readErr || chunk?.done) {
                if (!this.enabled) return;
                this.setConnected(false);
                this.opts.logger.warn(
                    'ProPresenter stream ended — reconnecting in 1 s…',
                );
                setTimeout(() => {
                    if (this.enabled) this.connect();
                }, 1000);
                return;
            }

            buffer += decoder.decode(chunk!.value, { stream: true });

            // ProPresenter sends one JSON object per line.
            const lines = buffer.split('\n');
            buffer = lines.pop()!; // keep the last (possibly incomplete) chunk

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const [, parsed] = noTry(() => JSON.parse(trimmed));
                if (parsed) this.opts.onText(this.parseText(parsed));
            }
        }
    }
}
