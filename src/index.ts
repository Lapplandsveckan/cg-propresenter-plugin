import path from 'path';
import {
    CasparPlugin,
    UI_INJECTION_ZONE,
    type RundownActionMetadata,
} from '@lappis/cg-manager';
import { type RundownItem } from '@lappis/cg-manager/dist/types/rundown';
import { Templates } from './templates';
import {
    BarsOverlayEffect,
    type BarsOverlayEffectOptions,
} from './effects/overlay/bars';
import {
    PropresenterOverlayEffect,
    type PropresenterOverlayEffectOptions,
} from './effects/overlay/propresenter';
import OverlayManager from './overlay';
import { ConfigStore } from './config-store';
import { ProPresenterClient } from './propresenter';

export default class PropresenterPlugin extends CasparPlugin {
    public templates: Templates;
    public overlay: OverlayManager;
    private config: ConfigStore;
    private proClient: ProPresenterClient;
    private reconnectHandler: () => void;

    public getLogger() {
        return this.logger;
    }

    public static get pluginName() {
        return 'propresenter';
    }

    public static get minChannels() {
        return 1;
    }

    private getInjectionZone(zone: UI_INJECTION_ZONE, key: string) {
        return `${zone}.${key}` as UI_INJECTION_ZONE;
    }

    private getStatus() {
        return {
            ...this.overlay.getStatus(),
            connected: this.proClient?.isConnected() ?? false,
        };
    }

    protected onEnable() {
        this.templates = new Templates(() => this.overlay.initialize());
        this.config = new ConfigStore(this);
        this.overlay = new OverlayManager(this);

        this.proClient = new ProPresenterClient({
            getConfig: () => this.config.get(),
            onText: text => {
                this.overlay.setText(text);
                this.api.broadcast('status', 'UPDATE', this.getStatus());
            },
            onStatusChange: () => {
                this.api.broadcast('status', 'UPDATE', this.getStatus());
            },
            logger: this.logger,
        });

        this.registerEffectGroups();
        this.registerEffects();
        this.registerRoutes();

        this.api.registerUI(
            UI_INJECTION_ZONE.PLUGIN_PAGE,
            path.join(__dirname, 'ui', 'control'),
        );

        this.registerRundownActions();

        this.reconnectHandler = () => {
            this.logger.info(
                'Server reconnected — restoring effect groups and persistent effects',
            );
            this.registerEffectGroups();
            this.overlay.initialize();
        };
        this.api.onReconnect(this.reconnectHandler);

        this.config.ready.then(() => {
            if (this.config.get().enabled) this.proClient.enable();
        });
    }

    protected onDisable() {
        if (this.reconnectHandler) {
            this.api.offReconnect(this.reconnectHandler);
            this.reconnectHandler = null;
        }

        this.proClient?.dispose();
        this.proClient = null;

        this.overlay.dispose();
        this.overlay = null;

        this.templates.dispose();
        this.templates = null;
    }

    private registerEffects() {
        this.api.registerEffect(
            'overlay-bars',
            (group, options) =>
                new BarsOverlayEffect(
                    group,
                    options as BarsOverlayEffectOptions,
                    this.templates.getFilePath('overlay/bars'),
                ),
        );

        this.api.registerEffect(
            'overlay-propresenter',
            (group, options) =>
                new PropresenterOverlayEffect(
                    group,
                    options as PropresenterOverlayEffectOptions,
                    this.templates.getFilePath('overlay/propresenter'),
                ),
        );
    }

    private registerRundownActions() {
        const registerRundownAction = (
            key: string,
            action: (rundown: RundownItem) => void,
            metadata?: RundownActionMetadata,
        ) => {
            this.api.registerUI(
                this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_ITEM, key),
                path.join(__dirname, 'ui', key, 'Item'),
            );
            this.api.registerUI(
                this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_EDITOR, key),
                path.join(__dirname, 'ui', key, 'Editor'),
            );
            this.api.registerRundownAction(key, action, metadata);
        };

        registerRundownAction('bars', async () => {
            this.overlay.toggleBars();
        });
    }

    private registerEffectGroups() {
        this.api.getEffectGroup('1:bars');
        this.api.getEffectGroup('1:overlay');
    }

    private registerRoutes() {
        this.api.registerRoute(
            'config',
            async () => {
                await this.config.ready;
                return this.config.get();
            },
            'GET',
        );

        this.api.registerRoute(
            'config',
            async req => {
                await this.config.ready;
                const prev = this.config.get();
                const next = await this.config.replace(req.data);
                const { host, port, enabled } = next;

                if (
                    prev.host !== host ||
                    prev.port !== port ||
                    prev.enabled !== enabled
                ) {
                    this.proClient?.disable();
                    if (enabled) this.proClient?.enable();
                }

                this.api.broadcast('status', 'UPDATE', this.getStatus());
                return next;
            },
            'UPDATE',
        );

        this.api.registerRoute('status', async () => this.getStatus(), 'GET');

        this.api.registerRoute(
            'overlay',
            async () => ({ on: this.overlay.isOverlayOn() }),
            'GET',
        );

        this.api.registerRoute(
            'overlay',
            async () => {
                this.overlay.toggleOverlay();
                this.api.broadcast('status', 'UPDATE', this.getStatus());
                return { on: this.overlay.isOverlayOn() };
            },
            'ACTION',
        );
    }
}
