import { ThousandSunny } from './components/ThousandSunny';
import { SessionPanel } from './components/SessionPanel';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useTranscriptStream } from './hooks/useTranscriptStream';
import { useCrewAnimation } from './hooks/useCrewAnimation';

export default function App() {
  useTranscriptStream();
  useCrewAnimation();

  return (
    <div
      className="app"
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
      }}
    >
      {/* Title */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '16px',
          fontFamily: '"Press Start 2P", monospace',
        }}
      >
        <h1
          style={{
            fontSize: '16px',
            color: '#FFD700',
            textShadow: '2px 2px 0 #CC0000',
            marginBottom: '8px',
          }}
        >
          CLAUDE PIXEL AGENT
        </h1>
        <p style={{ fontSize: '9px', color: '#87CEEB', lineHeight: '1.6' }}>
          Thousand Sunny Edition
        </p>
      </header>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '900px',
          width: '100%',
        }}
      >
        {/* Ship scene */}
        <div
          style={{
            border: '3px solid #333',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 0 20px rgba(34, 136, 204, 0.3)',
          }}
        >
          <ThousandSunny />
        </div>

        {/* Session panel */}
        <div
          style={{
            width: '220px',
            background: '#111122',
            border: '2px solid #333',
            borderRadius: '12px',
            overflow: 'auto',
            maxHeight: `${65 * 8}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ConnectionStatus />
          <div style={{ borderTop: '1px solid #333', flex: 1 }}>
            <SessionPanel />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          marginTop: '16px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#555',
          textAlign: 'center',
          lineHeight: '1.8',
        }}
      >
        <div>Polls ~/.claude/projects/ for active Claude Code sessions</div>
        <div>Each session = a Straw Hat crew member on the ship</div>
      </footer>
    </div>
  );
}
