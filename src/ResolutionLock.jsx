import React, { useState, useEffect } from 'react';

const MIN_CONTENT_WIDTH = 1120;
const MIN_CONTENT_HEIGHT = 920;

export default function ResolutionLock({ children }) {
    const [stageStyle, setStageStyle] = useState({
        width: '100vw',
        height: '100vh',
        transform: 'scale(1)',
    });

    useEffect(() => {
        const updateStage = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            if (vw >= MIN_CONTENT_WIDTH && vh >= MIN_CONTENT_HEIGHT) {
                setStageStyle({
                    width: `${vw}px`,
                    height: `${vh}px`,
                    transform: 'scale(1)',
                });
                return;
            }

            const scaleX = vw / MIN_CONTENT_WIDTH;
            const scaleY = vh / MIN_CONTENT_HEIGHT;
            const scale = Math.min(scaleX, scaleY);

            setStageStyle({
                width: `${MIN_CONTENT_WIDTH}px`,
                height: `${MIN_CONTENT_HEIGHT}px`,
                transform: `scale(${scale})`,
            });
        };

        updateStage();
        window.addEventListener('resize', updateStage);

        return () => {
            window.removeEventListener('resize', updateStage);
        };
    }, []);

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                backgroundColor: 'transparent',
            }}
        >
            <div
              id = "resolution-lock-stage"
              style={{
                width: stageStyle.width,
                height: stageStyle.height,
                transform: stageStyle.transform,
                transformOrigin: 'center center',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
                {children}
            </div>
        </div>
    );
}