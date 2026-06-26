import { useEffect, useState } from 'react';
import styles from './style.module.css';
import { register } from '../../../lib/overlay/propresenter/cg';
import { handleState } from '../../../lib/overlay/propresenter/animation';
import { getStylesProxy } from '../../../lib/animation';
import { CG } from '../../../components/CG';

interface PropresenterAnimationProps {
    state: number;
    text: string;
    bars: boolean;
}

export const PropresenterAnimation: React.FC<PropresenterAnimationProps> = ({
    state,
    text,
    bars,
}) => (
    <CG
        state={state}
        handle={handleState}
        labels={['start', 'end']}
        styles={getStylesProxy(styles)}
    >
        <div
            className={`${styles.container} ${bars ? styles['container--compact'] : ''}`}
        >
            <p className={styles.text}>{text}</p>
        </div>
    </CG>
);

const Page = () => {
    const [operatorState, setOperatorState] = useState(0);
    const [text, setText] = useState('');
    const [bars, setBars] = useState(false);

    useEffect(() => register(setOperatorState, setText, setBars), []);

    // Show only when operator has enabled AND there is text.
    const cgState = operatorState === 1 && text.trim().length > 0 ? 1 : 0;

    return <PropresenterAnimation state={cgState} text={text} bars={bars} />;
};

export default Page;
