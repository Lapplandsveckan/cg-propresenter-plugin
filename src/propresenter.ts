import http from 'http';
import readline from 'readline';
import { noTry } from 'no-try';
import { type Logger } from '@lappis/cg-manager';
import { type PluginConfig } from './config-store';

interface ClientOptions {
    getConfig: () => PluginConfig;
    onText: (text: string) => void;
    onStatusChange: (connected: boolean) => void;
    logger: Logger;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        this.controller = new AbortController();
        this.stream();
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

    private async stream() {
        while (this.enabled) {
            try {
                await this.openStream();
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                this.opts.logger.warn(
                    `ProPresenter: ${(err as Error).message} — retrying in 1 s`,
                );
            } finally {
                this.setConnected(false);
            }
            await sleep(1000);
        }
    }

    private openStream(): Promise<void> {
        const { host, port } = this.opts.getConfig();
        const url = `http://${host}:${port}/v1/status/slide?chunked=true`;

        return new Promise((resolve, reject) => {
            http.get(
                url,
                { signal: this.controller!.signal } as http.RequestOptions,
                res => {
                    if (res.statusCode !== 200) {
                        res.resume();
                        return reject(
                            new Error(`unexpected status ${res.statusCode}`),
                        );
                    }

                    this.setConnected(true);
                    this.opts.logger.info('Connected to ProPresenter');

                    const rl = readline.createInterface({
                        input: res,
                        crlfDelay: Infinity,
                    });

                    rl.on('line', line => {
                        const trimmed = line.trim();
                        if (!trimmed) return;
                        const [, parsed] = noTry(() => JSON.parse(trimmed));
                        if (parsed) this.opts.onText(this.parseText(parsed));
                    });

                    rl.on('close', resolve);
                },
            ).on('error', reject);
        });
    }
}
