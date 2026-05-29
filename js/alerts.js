// ग्लोबल कस्टम अलर्ट ऑब्जेक्ट
window.CustomAlert = {
    // प्रकार: 'success' (हरा), 'error' (लाल), 'confirm' (सवाल)
    show: function(message, type = 'success', onConfirm = null) {
        // अगर पहले से कोई अलर्ट खुला है तो उसे हटाओ
        const existingAlert = document.getElementById('custom-alert-overlay');
        if (existingAlert) existingAlert.remove();

        // थीम कलर्स और आइकन्स तय करना
        let color = '#27ae60'; // Success
        let icon = '✅';
        if (type === 'error') {
            color = '#c0392b';
            icon = '❌';
        } else if (type === 'confirm') {
            color = '#f39c12';
            icon = '⚠️';
        }

        // अलर्ट का HTML ढांचा तैयार करना
        const overlay = document.createElement('div');
        overlay.id = 'custom-alert-overlay';
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
            z-index: 100000; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.2s ease-in-out;
        `;

        overlay.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; width: 85%; max-width: 360px; 
                        text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-top: 5px solid ${color};
                        transform: scale(0.8); transition: transform 0.2s ease-in-out;">
                <div style="font-size: 2.5rem; margin-bottom: 12px;">${icon}</div>
                <p style="margin: 0 0 20px 0; font-family: sans-serif; font-size: 0.95rem; font-weight: 600; color: #333; line-height: 1.4;">${message}</p>
                <div id="alert-buttons-container" style="display: flex; gap: 10px; justify-content: center;">
                    ${type === 'confirm' 
                        ? `<button id="btn-alert-cancel" style="padding: 8px 16px; background: #f4f6f8; border: 1px solid #ddd; color: #555; cursor: pointer; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">Cancel</button>
                           <button id="btn-alert-ok" style="padding: 8px 20px; background: ${color}; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: 700; font-size: 0.85rem;">OK</button>`
                        : `<button id="btn-alert-ok" style="padding: 8px 24px; background: ${color}; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: 700; font-size: 0.85rem; width: 100px;">OK</button>`
                    }
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // एनिमेशन इफेक्ट के लिए छोटा सा डिले
        setTimeout(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('div').style.transform = 'scale(1)';
        }, 10);

        // क्लोज करने का फंक्शन
        const closeAlert = () => {
            overlay.style.opacity = '0';
            overlay.querySelector('div').style.transform = 'scale(0.8)';
            setTimeout(() => overlay.remove(), 200);
        };

        // बटन इवेंट्स अटैच करना
        overlay.querySelector('#btn-alert-ok').addEventListener('click', () => {
            closeAlert();
            if (onConfirm) onConfirm(); // अगर कोई फंक्शन पास किया है तो उसे चलाओ
        });

        if (type === 'confirm' && overlay.querySelector('#btn-alert-cancel')) {
            overlay.querySelector('#btn-alert-cancel').addEventListener('click', () => {
                closeAlert();
            });
        }
    }
};
