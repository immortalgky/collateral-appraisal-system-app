import { usePixelAgentStore } from '../store';
import type { CrewMember } from '../types';

const CREW_EMOJIS: Record<CrewMember, string> = {
  luffy: '👒',
  zoro: '⚔️',
  nami: '🧭',
  sanji: '🍳',
  robin: '📚',
  franky: '🔧',
  chopper: '🩺',
  usopp: '🎯',
  brook: '🎻',
};

const CREW_COLORS: Record<CrewMember, string> = {
  luffy: '#CC0000',
  zoro: '#2D8B46',
  nami: '#FF8C00',
  sanji: '#DAA520',
  robin: '#6B3FA0',
  franky: '#00CED1',
  chopper: '#FFB6C1',
  usopp: '#8B6914',
  brook: '#555555',
};

export function SessionPanel() {
  const agents = usePixelAgentStore((s) => s.agents);
  const agentList = Array.from(agents.values());

  // Group by session
  const sessionGroups = new Map<string, typeof agentList>();
  for (const agent of agentList) {
    const group = sessionGroups.get(agent.sessionId) ?? [];
    group.push(agent);
    sessionGroups.set(agent.sessionId, group);
  }

  if (sessionGroups.size === 0) {
    return (
      <div className="session-panel" style={{ padding: '16px', color: '#999', fontFamily: '"Press Start 2P", monospace', fontSize: '8px', lineHeight: '1.8' }}>
        <div style={{ marginBottom: '8px', color: '#FFD700' }}>CREW LOG</div>
        <div>No active sessions.</div>
        <div style={{ marginTop: '8px', fontSize: '7px' }}>
          Start a Claude Code session
          <br />to see agents appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="session-panel" style={{ padding: '12px', fontFamily: '"Press Start 2P", monospace', fontSize: '8px' }}>
      <div style={{ marginBottom: '12px', color: '#FFD700', fontSize: '9px' }}>CREW LOG</div>

      {Array.from(sessionGroups.entries()).map(([sessionId, members]) => {
        const mainAgent = members.find((m) => m.role === 'main');
        const subagents = members.filter((m) => m.role !== 'main');

        return (
          <div key={sessionId} style={{ marginBottom: '12px' }}>
            {/* Project name */}
            <div style={{ color: '#87CEEB', marginBottom: '4px', fontSize: '7px' }}>
              {mainAgent?.projectName ?? 'Unknown'}
            </div>

            {/* Main agent */}
            {mainAgent && (
              <AgentRow agent={mainAgent} indent={false} />
            )}

            {/* Subagents */}
            {subagents.map((sub) => (
              <AgentRow key={sub.id} agent={sub} indent={true} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AgentRow({ agent, indent }: { agent: import('../types').AgentOnShip; indent: boolean }) {
  const emoji = CREW_EMOJIS[agent.crewMember];
  const color = CREW_COLORS[agent.crewMember];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        paddingLeft: indent ? '12px' : '0',
        marginBottom: '3px',
        color: '#DDD',
        lineHeight: '1.6',
      }}
    >
      {indent && <span style={{ color: '#666' }}>└─</span>}
      <span>{emoji}</span>
      <span style={{ color, fontWeight: 'bold' }}>
        {agent.crewMember.toUpperCase()}
      </span>
      {agent.role === 'subagent' && (
        <span style={{ color: '#888', fontSize: '6px' }}>(sub)</span>
      )}
      <span style={{ color: '#888', fontSize: '7px', marginLeft: '2px' }}>
        [{agent.animation}]
      </span>
    </div>
  );
}
