import { usePixelAgentStore } from '../store';

export function ConnectionStatus() {
  const isConnected = usePixelAgentStore((s) => s.isConnected);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: isConnected ? '#4CAF50' : '#FF5252',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isConnected ? '#4CAF50' : '#FF5252',
          boxShadow: isConnected
            ? '0 0 6px rgba(76, 175, 80, 0.6)'
            : '0 0 6px rgba(255, 82, 82, 0.6)',
        }}
        className={isConnected ? 'pulse-dot' : ''}
      />
      <span>{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
      {!isConnected && (
        <span style={{ color: '#888', fontSize: '7px' }}>
          (start server: npm run dev:server)
        </span>
      )}
    </div>
  );
}
