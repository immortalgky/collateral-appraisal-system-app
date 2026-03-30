export type CrewMember =
  | 'luffy'
  | 'zoro'
  | 'nami'
  | 'sanji'
  | 'robin'
  | 'franky'
  | 'chopper'
  | 'usopp'
  | 'brook';

export type Station =
  | 'deck'
  | 'kitchen'
  | 'library'
  | 'workshop'
  | 'helm'
  | 'crowsNest';

export type Animation =
  | 'idle'
  | 'walking'
  | 'reading'
  | 'typing'
  | 'running'
  | 'thinking'
  | 'searching'
  | 'eating'
  | 'celebrating'
  | 'sleeping';

export type AgentRole = 'main' | 'subagent' | 'teammate';

export type AgentOnShip = {
  id: string;
  sessionId: string;
  role: AgentRole;
  projectName: string;
  crewMember: CrewMember;
  currentStation: Station;
  targetStation: Station;
  animation: Animation;
  speechText: string | null;
  lastActivity: number;
  isVisible: boolean;
};

export type TranscriptEvent = {
  sessionId: string;
  projectName: string;
  type:
    | 'tool'
    | 'turn_end'
    | 'user_message'
    | 'session_start'
    | 'session_end'
    | 'subagent_start'
    | 'subagent_tool'
    | 'subagent_end';
  agentId?: string;
  tool?: string;
  detail?: string;
};

// Pixel art types
export type PixelData = [number, number, string][];
export type SpriteFrames = PixelData[];
