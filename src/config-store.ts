import * as fs from 'fs/promises';
import * as path from 'path';
import { noTry, noTryAsync } from 'no-try';
import type PropresenterPlugin from './index';

const CONFIG_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'propresenter',
    'config.json',
);

export interface PluginConfig {
    host: string;
    port: number;
    enabled: boolean;
}

const DEFAULTS: PluginConfig = {
    host: '127.0.0.1',
    port: 50001,
    enabled: false,
};

export class ConfigStore {
    private plugin: PropresenterPlugin;
    private config: PluginConfig = { ...DEFAULTS };
    public ready: Promise<void>;

    public constructor(plugin: PropresenterPlugin) {
        this.plugin = plugin;
        this.ready = this.load();
    }

    private async load() {
        const [readErr, raw] = await noTryAsync(() =>
            fs.readFile(CONFIG_PATH, 'utf8'),
        );
        if (readErr) {
            if ((readErr as any)?.code !== 'ENOENT')
                this.plugin
                    .getLogger()
                    .warn(
                        `Failed to read propresenter config: ${(readErr as any).message}`,
                    );
            return;
        }
        const [, parsed] = noTry(() => JSON.parse(raw!));
        if (parsed && typeof parsed === 'object') {
            this.config = { ...DEFAULTS, ...parsed };
        }
    }

    public get(): PluginConfig {
        return { ...this.config };
    }

    public async replace(next: unknown): Promise<PluginConfig> {
        const patch = (
            next && typeof next === 'object' ? next : {}
        ) as Partial<PluginConfig>;

        this.config = {
            host:
                typeof patch.host === 'string' ? patch.host : this.config.host,
            port:
                typeof patch.port === 'number' ? patch.port : this.config.port,
            enabled:
                typeof patch.enabled === 'boolean'
                    ? patch.enabled
                    : this.config.enabled,
        };

        await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(
            CONFIG_PATH,
            JSON.stringify(this.config, null, 2),
            'utf8',
        );

        return this.get();
    }
}
