import { type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type BarsOverlayEffect } from './effects/overlay/bars';
import { type PropresenterOverlayEffect } from './effects/overlay/propresenter';
import type PropresenterPlugin from './index';

export default class OverlayManager {
    private api: PluginAPI;
    private logger: Logger;

    private bars: BarsOverlayEffect = null;
    private barsActive = false;

    private effect: PropresenterOverlayEffect = null;
    private overlayOn = false;
    private currentText = '';

    constructor(instance: PropresenterPlugin) {
        this.api = instance['api'];
        this.logger = instance['logger'];
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

        this.bars = this.api.createEffect(
            'overlay-bars',
            '1:bars',
            {},
        ) as BarsOverlayEffect;

        this.effect = this.api.createEffect(
            'overlay-propresenter',
            '1:overlay',
            { text: this.currentText, bars: this.barsActive },
        ) as PropresenterOverlayEffect;

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
