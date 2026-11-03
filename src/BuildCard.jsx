import React, {forwardRef} from 'react';

 export const BuildCard = forwardRef(({slot}, ref) => {
    return (
        <div
            ref={ref}
            className="build-container"
            //Backup styling for PNG
            style={{
                backgroundColor: '#1e1e2e',
                color: '#ffffff',
                padding: '24px',
                borderRadius: '12px',
                display: 'inline-block',
                minWidth: '300px',
            }}
        >
            <h2 style={{ marginTop: '0', marginBottom: '16px' }}>Build</h2>

            <div
                className="slots-wrapper"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
                <div className="slot-box">{slot('Banner')}</div>
                <div className="slot-box">{slot('Weapon')}</div>
                <div className="slot-box">{slot('Tailsman')}</div>
                <div className="slot-box">{slot('Shield')}</div>
                <div className="slot-box">{slot('Armor')}</div>
            </div>
        </div>
    );
});

export default BuildCard;