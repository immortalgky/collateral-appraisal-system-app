import express from 'express';
import cors from 'cors';
import { SessionScanner } from './sessionScanner.js';
import { TranscriptWatcherManager } from './transcriptWatcher.js';
import type { TranscriptEvent } from './transcriptParser.js';

const app = express();
const PORT = 3210;

app.use(cors());

// SSE clients
const clients = new Set<express.Response>();

function broadcast(event: TranscriptEvent): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}

// Transcript watcher
const watcherManager = new TranscriptWatcherManager(broadcast);

// Session scanner
const scanner = new SessionScanner(
  (session) => {
    console.log(`[+] New session: ${session.projectName} (${session.sessionId.slice(0, 8)}...)`);
    watcherManager.addSession(session.sessionId, session.filePath, session.projectName);
  },
  (sessionId) => {
    console.log(`[-] Session gone: ${sessionId.slice(0, 8)}...`);
    watcherManager.removeSession(sessionId);
  }
);

// SSE endpoint — streams ALL session events
app.get('/api/stream', (_req: express.Request, res: express.Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send current sessions as initial state
  const sessions = watcherManager.getActiveSessions();
  for (const session of sessions) {
    const event: TranscriptEvent = {
      sessionId: session.sessionId,
      projectName: session.projectName,
      type: 'session_start',
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  clients.add(res);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

// REST endpoint — list active sessions
app.get('/api/sessions', (_req: express.Request, res: express.Response) => {
  const sessions = watcherManager.getActiveSessions();
  res.json(sessions);
});

// Start
scanner.start();
watcherManager.start();

app.listen(PORT, () => {
  console.log(`\n  Claude Pixel Agent Server`);
  console.log(`  Streaming on http://localhost:${PORT}/api/stream`);
  console.log(`  Scanning ~/.claude/projects/ for active sessions...\n`);
});
