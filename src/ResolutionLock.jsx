import React, { useState, useEffect } from 'react';

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

export const ResolutionLock = ({ children }) => {
    const[scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const scaleX = window.innerWidth / TARGET_WIDTH;
            const scaleY = window.innerHeight / TARGET_HEIGHT;
            setScale(Math.min(scaleX, scaleY));
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    },[]);

    return (
        <div
            id="resolution-lock-container"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#3d362f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                zIndex: 999999,
                margin: 0,
                padding: 0,
            }}
        >
            <div
                id="resolution-lock-stage"
                style={{
                    width: `${TARGET_WIDTH}px`,
                    height: `${TARGET_HEIGHT}px`,
                    minWidth: `${TARGET_WIDTH}px`,
                    minHeight: `${TARGET_HEIGHT}px`,
                    maxWidth: `${TARGET_WIDTH}px`,
                    maxHeight: `${TARGET_HEIGHT}px`,
                    flexShrink: 0,
                    position: 'relative',
                    backgroundColor: '#f2ede4',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center'
                }}
            >
                {children}
            </div>
        </div>
    );
};