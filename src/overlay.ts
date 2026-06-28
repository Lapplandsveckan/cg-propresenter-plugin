import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type BarsOverlayEffect } from './effects/overlay/bars';
import { type PropresenterOverlayEffect } from './effects/overlay/propresenter';
import { SidePair } from './effects/side-pair';
import type PropresenterPlugin from './index';

export const CHANNELS = { LEFT: 1, RIGHT: 2 } as const;
export const MAIN_SIDES = [CHANNELS.LEFT, CHANNELS.RIGHT] as const;
export const GROUPS = { BARS: 'bars', OVERLAY: 'overlay' } as const;
export const getGroup = (channel: number, group: string) =>
    `${channel}:${group}`;

export default class OverlayManager {
    private api: PluginAPI;
    private logger: Logger;

    private bars: SidePair<BarsOverlayEffect> = null;
    private barsActive = false;

    private effect: SidePair<PropresenterOverlayEffect> = null;
    private overlayOn = false;
    private currentText = '';

    constructor(instance: PropresenterPlugin) {
        this.api = instance['api'];
        this.logger = instance['logger'];
    }

    private makeSidePair<T extends Effect>(
        effectName: string,
        group: string,
        optsFor: (channel: number) => object,
    ): SidePair<T> {
        return new SidePair<T>(
            this.api.createEffect(
                effectName,
                getGroup(CHANNELS.LEFT, group),
                optsFor(CHANNELS.LEFT),
            ) as T,
            this.api.createEffect(
                effectName,
                getGroup(CHANNELS.RIGHT, group),
                optsFor(CHANNELS.RIGHT),
            ) as T,
            this.logger,
        );
    }

    public initialize() {
        // Dispose any existing effects (e.g. on server reconnect) before re-creating.
        if (this.bars) {
            this.bars.dispose();
            this.bars = null;
        }
        if (this.effect) {
            this.effect.dispose();
            this.effect = null;
        }

        this.bars = this.makeSidePair<BarsOverlayEffect>(
            'overlay-bars',
            GROUPS.BARS,
            () => ({}),
        );

        this.effect = this.makeSidePair<PropresenterOverlayEffect>(
            'overlay-propresenter',
            GROUPS.OVERLAY,
            () => ({ text: this.currentText, bars: this.barsActive }),
        );

        // Re-apply pre-reconnect state.
        if (this.barsActive) this.bars.activate();
        if (this.overlayOn) this.effect.activate();
    }

    public dispose() {
        if (this.bars) {
            this.bars.dispose();
            this.bars = null;
        }
        if (this.effect) {
            this.effect.dispose();
            this.effect = null;
        }
    }

    public toggleBars() {
        this.barsActive = !this.barsActive;
        if (this.barsActive) {
            this.bars?.activate();
        } else {
            this.bars?.deactivate();
        }
        this.effect?.update({ bars: this.barsActive });
    }

    public setText(text: string) {
        this.currentText = text;
        this.effect?.update({ text });
    }

    public toggleOverlay() {
        this.setOverlay(!this.overlayOn);
    }

    public setOverlay(on: boolean) {
        this.overlayOn = on;
        if (on) {
            this.effect?.activate();
        } else {
            this.effect?.deactivate();
        }
    }

    public isOverlayOn() {
        return this.overlayOn;
    }

    public getStatus() {
        return {
            overlayOn: this.overlayOn,
            barsActive: this.barsActive,
            currentText: this.currentText,
        };
    }
}
