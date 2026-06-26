import { offCGEvent, onCGEvent } from '../../cg';

// state
// 0: hidden (operator off or no text)
// 1: shown

type NumberHandler = (value: number) => void;
type StringHandler = (value: string) => void;
type BoolHandler = (value: boolean) => void;

export function register(
    setState: NumberHandler,
    setText: StringHandler,
    setBars: BoolHandler,
) {
    const states = [() => setState(0), () => setState(1)];

    const update = params => {
        if (typeof params?.text === 'string') setText(params.text);
        if (typeof params?.bars === 'boolean') setBars(params.bars);
    };

    onCGEvent('update', update);
    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    return () => {
        offCGEvent('update', update);
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}

export {};
