import { create } from 'zustand';
import type { AgentOnShip, AgentRole, Animation, CrewMember, Station, TranscriptEvent } from './types';
import { getToolStation, getStationAnimation } from './data/stationLayout';
import { getCrewMessage } from './data/messages';

const CREW_ORDER: CrewMember[] = [
  'luffy', 'zoro', 'nami', 'sanji', 'robin', 'franky', 'chopper', 'usopp', 'brook',
];

const IDLE_TIMEOUT_MS = 30_000;
const SLEEP_TIMEOUT_MS = 5 * 60_000;

type PixelAgentStore = {
  agents: Map<string, AgentOnShip>;
  isConnected: boolean;

  setConnected: (connected: boolean) => void;
  handleEvent: (event: TranscriptEvent) => void;
  tick: () => void; // Called periodically for idle/sleep transitions
};

function getNextCrewMember(agents: Map<string, AgentOnShip>): CrewMember {
  const usedCrew = new Set<CrewMember>();
  for (const agent of agents.values()) {
    usedCrew.add(agent.crewMember);
  }
  for (const member of CREW_ORDER) {
    if (!usedCrew.has(member)) return member;
  }
  return 'luffy'; // fallback if all 9 are taken
}

export const usePixelAgentStore = create<PixelAgentStore>((set, get) => ({
  agents: new Map(),
  isConnected: false,

  setConnected: (connected) => set({ isConnected: connected }),

  handleEvent: (event) => {
    set((state) => {
      const agents = new Map(state.agents);

      switch (event.type) {
        case 'session_start': {
          const agentId = event.sessionId;
          if (agents.has(agentId)) break;
          const crewMember = getNextCrewMember(agents);
          agents.set(agentId, {
            id: agentId,
            sessionId: event.sessionId,
            role: 'main' as AgentRole,
            projectName: event.projectName,
            crewMember,
            currentStation: 'deck' as Station,
            targetStation: 'deck' as Station,
            animation: 'idle' as Animation,
            speechText: `${capitalize(crewMember)} reporting for duty!`,
            lastActivity: Date.now(),
            isVisible: true,
          });
          break;
        }

        case 'session_end': {
          const agent = agents.get(event.sessionId);
          if (agent) {
            agents.set(event.sessionId, {
              ...agent,
              animation: 'sleeping',
              speechText: 'Mission complete... zzz',
              targetStation: 'deck',
            });
          }
          break;
        }

        case 'tool': {
          const agent = agents.get(event.sessionId);
          if (!agent) break;
          const station = getToolStation(event.tool ?? '');
          const animation = getStationAnimation(station);
          const speechText = getCrewMessage(agent.crewMember, event.tool ?? '', event.detail ?? '');
          agents.set(event.sessionId, {
            ...agent,
            targetStation: station,
            animation: agent.currentStation === station ? animation : 'walking',
            speechText,
            lastActivity: Date.now(),
          });
          break;
        }

        case 'turn_end': {
          const agent = agents.get(event.sessionId);
          if (!agent) break;
          agents.set(event.sessionId, {
            ...agent,
            targetStation: 'deck',
            animation: 'celebrating',
            speechText: getCrewMessage(agent.crewMember, 'done', ''),
            lastActivity: Date.now(),
          });
          break;
        }

        case 'user_message': {
          const agent = agents.get(event.sessionId);
          if (!agent) break;
          agents.set(event.sessionId, {
            ...agent,
            animation: 'thinking',
            speechText: getCrewMessage(agent.crewMember, 'thinking', ''),
            lastActivity: Date.now(),
          });
          break;
        }

        case 'subagent_start': {
          if (!event.agentId) break;
          const crewMember = getNextCrewMember(agents);
          agents.set(event.agentId, {
            id: event.agentId,
            sessionId: event.sessionId,
            role: 'subagent',
            projectName: event.projectName,
            crewMember,
            currentStation: 'helm',
            targetStation: 'helm',
            animation: 'thinking',
            speechText: event.detail ?? 'Sub-crew deployed!',
            lastActivity: Date.now(),
            isVisible: true,
          });
          break;
        }

        case 'subagent_tool': {
          if (!event.agentId) break;
          const subagent = agents.get(event.agentId);
          if (!subagent) break;
          const station = getToolStation(event.tool ?? '');
          const animation = getStationAnimation(station);
          agents.set(event.agentId, {
            ...subagent,
            targetStation: station,
            animation: subagent.currentStation === station ? animation : 'walking',
            speechText: event.detail ?? null,
            lastActivity: Date.now(),
          });
          break;
        }

        case 'subagent_end': {
          if (!event.agentId) break;
          const subagent = agents.get(event.agentId);
          if (subagent) {
            agents.set(event.agentId, {
              ...subagent,
              animation: 'celebrating',
              speechText: 'Done!',
              targetStation: 'deck',
            });
            // Remove after a short delay (handled in tick)
          }
          break;
        }
      }

      return { agents };
    });
  },

  tick: () => {
    const now = Date.now();
    set((state) => {
      const agents = new Map(state.agents);
      let changed = false;

      for (const [id, agent] of agents) {
        const elapsed = now - agent.lastActivity;

        // Walking → arrival
        if (agent.animation === 'walking' && agent.currentStation !== agent.targetStation) {
          agents.set(id, {
            ...agent,
            currentStation: agent.targetStation,
            animation: getStationAnimation(agent.targetStation),
          });
          changed = true;
          continue;
        }

        // Celebrating → idle (after 2s)
        if (agent.animation === 'celebrating' && elapsed > 2000) {
          if (agent.role === 'subagent') {
            // Fade out subagent
            agents.set(id, { ...agent, isVisible: false });
            changed = true;
            // Remove fully after fade
            setTimeout(() => {
              get().handleEvent({
                sessionId: agent.sessionId,
                projectName: agent.projectName,
                type: 'session_end',
              });
            }, 1000);
          } else {
            agents.set(id, {
              ...agent,
              animation: 'idle',
              speechText: null,
              targetStation: 'deck',
            });
            changed = true;
          }
          continue;
        }

        // Idle timeout → kitchen
        if (
          agent.animation !== 'eating' &&
          agent.animation !== 'sleeping' &&
          agent.animation !== 'walking' &&
          agent.animation !== 'celebrating' &&
          elapsed > IDLE_TIMEOUT_MS
        ) {
          agents.set(id, {
            ...agent,
            targetStation: 'kitchen',
            animation: agent.currentStation === 'kitchen' ? 'eating' : 'walking',
            speechText: getCrewMessage(agent.crewMember, 'idle', ''),
          });
          changed = true;
          continue;
        }

        // Sleep timeout
        if (agent.animation === 'eating' && elapsed > SLEEP_TIMEOUT_MS) {
          agents.set(id, {
            ...agent,
            animation: 'sleeping',
            speechText: 'zzz...',
            targetStation: 'deck',
          });
          changed = true;
          continue;
        }
      }

      return changed ? { agents } : state;
    });
  },
}));

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
