import React from 'react';
import { Bus } from '@phosphor-icons/react';

const LoadingView = () => {
    return (
        <div id="view-loading" className="view active">
            <div className="loader-container">
                <Bus className="loader-icon ph-fill" size={64} style={{ color: 'var(--color-teal)' }} />
                <h1>Next Stop</h1>
                <p>Connecting to secure server...</p>
            </div>
        </div>
    );
};

export default LoadingView;
