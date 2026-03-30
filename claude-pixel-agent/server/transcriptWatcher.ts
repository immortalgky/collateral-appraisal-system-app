import fs from 'node:fs';
import { parseTranscriptLine, type TranscriptEvent } from './transcriptParser.js';

type FileWatcher = {
  filePath: string;
  sessionId: string;
  projectName: string;
  offset: number;
  lineBuffer: string;
  lastActivity: number;
};

const POLL_INTERVAL_MS = 500;
const MAX_READ_BYTES = 65536; // 64KB per read
const INACTIVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export class TranscriptWatcherManager {
  private watchers = new Map<string, FileWatcher>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private onEvent: (event: TranscriptEvent) => void;

  constructor(onEvent: (event: TranscriptEvent) => void) {
    this.onEvent = onEvent;
  }

  start(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.pollAll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.watchers.clear();
  }

  addSession(sessionId: string, filePath: string, projectName: string): void {
    if (this.watchers.has(sessionId)) return;

    // Start from end of file (only watch new events)
    let offset = 0;
    try {
      const stat = fs.statSync(filePath);
      offset = stat.size;
    } catch {
      // File might not exist yet
    }

    this.watchers.set(sessionId, {
      filePath,
      sessionId,
      projectName,
      offset,
      lineBuffer: '',
      lastActivity: Date.now(),
    });

    this.onEvent({
      sessionId,
      projectName,
      type: 'session_start',
    });
  }

  removeSession(sessionId: string): void {
    const watcher = this.watchers.get(sessionId);
    if (watcher) {
      this.onEvent({
        sessionId,
        projectName: watcher.projectName,
        type: 'session_end',
      });
      this.watchers.delete(sessionId);
    }
  }

  getActiveSessions(): Array<{ sessionId: string; projectName: string; lastActivity: number }> {
    return Array.from(this.watchers.values()).map((w) => ({
      sessionId: w.sessionId,
      projectName: w.projectName,
      lastActivity: w.lastActivity,
    }));
  }

  private pollAll(): void {
    const now = Date.now();

    for (const [sessionId, watcher] of this.watchers) {
      // Remove inactive watchers
      if (now - watcher.lastActivity > INACTIVE_TIMEOUT_MS) {
        this.removeSession(sessionId);
        continue;
      }

      this.pollFile(watcher);
    }
  }

  private pollFile(watcher: FileWatcher): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(watcher.filePath);
    } catch {
      return; // File doesn't exist or is inaccessible
    }

    if (stat.size <= watcher.offset) return; // No new data

    const bytesToRead = Math.min(stat.size - watcher.offset, MAX_READ_BYTES);
    const buffer = Buffer.alloc(bytesToRead);

    let fd: number | null = null;
    try {
      fd = fs.openSync(watcher.filePath, 'r');
      fs.readSync(fd, buffer, 0, bytesToRead, watcher.offset);
    } catch {
      return;
    } finally {
      if (fd !== null) fs.closeSync(fd);
    }

    watcher.offset += bytesToRead;
    watcher.lastActivity = Date.now();

    const text = watcher.lineBuffer + buffer.toString('utf-8');
    const lines = text.split('\n');

    // Last element is either empty (complete line) or partial (buffer it)
    watcher.lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const events = parseTranscriptLine(
        trimmed,
        watcher.sessionId,
        watcher.projectName
      );

      for (const event of events) {
        this.onEvent(event);
      }
    }
  }
}
