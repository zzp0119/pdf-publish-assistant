import React, { useEffect, useState } from 'react';

const EnvDebug: React.FC = () => {
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    // 读取所有环境变量
    const allEnv = import.meta.env;
    setEnvVars(allEnv);

    console.log('=== Environment Variables Debug ===');
    console.log('All VITE_* variables:');

    Object.keys(allEnv).forEach(key => {
      if (key.startsWith('VITE_')) {
        console.log(`${key}:`, allEnv[key]);
      }
    });
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '20px' }}>
      <h2>Environment Variables Debug</h2>
      <div style={{ background: 'white', padding: '15px', borderRadius: '5px' }}>
        <p><strong>VITE_API_URL:</strong> {envVars.VITE_API_URL || 'NOT SET'}</p>
        <p><strong>VITE_DOMAIN:</strong> {envVars.VITE_DOMAIN || 'NOT SET'}</p>
        <p><strong>VITE_ADMIN_PASSWORD:</strong> {envVars.VITE_ADMIN_PASSWORD || 'NOT SET'}</p>
      </div>

      {envVars.VITE_DOMAIN && envVars.VITE_DOMAIN.includes('localhost') ? (
        <div style={{ background: '#ffebee', padding: '15px', marginTop: '10px', borderRadius: '5px' }}>
          <p style={{ color: '#c62828' }}><strong>⚠️ WARNING:</strong></p>
          <p>VITE_DOMAIN is still set to localhost!</p>
          <p>This means the .env file is not being loaded correctly.</p>
          <p><strong>Solution:</strong></p>
          <ol>
            <li>Stop admin service (Ctrl + C in Admin Frontend window)</li>
            <li>Delete Vite cache: <code>rmdir /s /q admin\node_modules\.vite</code></li>
            <li>Restart: <code>cd admin && npm run dev</code></li>
            <li>Clear browser cache (Ctrl + Shift + Delete)</li>
            <li>Hard refresh page (Ctrl + F5)</li>
          </ol>
        </div>
      ) : envVars.VITE_DOMAIN ? (
        <div style={{ background: '#e8f5e9', padding: '15px', marginTop: '10px', borderRadius: '5px' }}>
          <p style={{ color: '#2e7d32' }}><strong>✅ SUCCESS:</strong></p>
          <p>VITE_DOMAIN is correctly set to: <strong>{envVars.VITE_DOMAIN}</strong></p>
          <p>QR codes should now work correctly!</p>
        </div>
      ) : (
        <div style={{ background: '#fff3e0', padding: '15px', marginTop: '10px', borderRadius: '5px' }}>
          <p style={{ color: '#ef6c00' }}><strong>⚠️ WARNING:</strong></p>
          <p>VITE_DOMAIN is NOT SET!</p>
          <p>This means the .env file is not being read.</p>
        </div>
      )}
    </div>
  );
};

export default EnvDebug;
