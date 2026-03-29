import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');
const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const SCAN_INTERVAL_MS = 5000;

export type SessionInfo = {
  sessionId: string;
  filePath: string;
  projectName: string;
  lastModified: number;
};

export class SessionScanner {
  private knownSessions = new Set<string>();
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private onNewSession: (session: SessionInfo) => void;
  private onSessionGone: (sessionId: string) => void;

  constructor(
    onNewSession: (session: SessionInfo) => void,
    onSessionGone: (sessionId: string) => void
  ) {
    this.onNewSession = onNewSession;
    this.onSessionGone = onSessionGone;
  }

  start(): void {
    this.scan();
    this.scanTimer = setInterval(() => this.scan(), SCAN_INTERVAL_MS);
  }

  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  private scan(): void {
    const activeSessions = this.findActiveSessions();
    const activeIds = new Set(activeSessions.map((s) => s.sessionId));

    // Detect new sessions
    for (const session of activeSessions) {
      if (!this.knownSessions.has(session.sessionId)) {
        this.knownSessions.add(session.sessionId);
        this.onNewSession(session);
      }
    }

    // Detect gone sessions
    for (const knownId of this.knownSessions) {
      if (!activeIds.has(knownId)) {
        this.knownSessions.delete(knownId);
        this.onSessionGone(knownId);
      }
    }
  }

  private findActiveSessions(): SessionInfo[] {
    const sessions: SessionInfo[] = [];
    const now = Date.now();

    if (!fs.existsSync(CLAUDE_DIR)) return sessions;

    let projectDirs: string[];
    try {
      projectDirs = fs.readdirSync(CLAUDE_DIR);
    } catch {
      return sessions;
    }

    for (const projectDir of projectDirs) {
      const projectPath = path.join(CLAUDE_DIR, projectDir);

      let stat: fs.Stats;
      try {
        stat = fs.statSync(projectPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;

      let files: string[];
      try {
        files = fs.readdirSync(projectPath);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = path.join(projectPath, file);
        let fileStat: fs.Stats;
        try {
          fileStat = fs.statSync(filePath);
        } catch {
          continue;
        }

        const lastModified = fileStat.mtimeMs;
        if (now - lastModified > ACTIVE_THRESHOLD_MS) continue;

        const sessionId = file.replace('.jsonl', '');
        const projectName = decodeProjectName(projectDir);

        sessions.push({ sessionId, filePath, projectName, lastModified });
      }
    }

    // Sort by most recently modified first
    sessions.sort((a, b) => b.lastModified - a.lastModified);
    return sessions;
  }
}

function decodeProjectName(dirName: string): string {
  // Claude project dirs are hashed paths like "-home-user-myproject"
  // Try to extract a readable project name
  const parts = dirName.split('-').filter(Boolean);
  if (parts.length === 0) return dirName;

  // Take the last meaningful segment as the project name
  return parts[parts.length - 1] || dirName;
}
