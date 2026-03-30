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

type ContentBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
};

type JsonlRecord = {
  type?: string;
  subtype?: string;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
  };
};

function summarizeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read':
      return `Reading ${basename(input.file_path as string)}`;
    case 'Write':
      return `Writing ${basename(input.file_path as string)}`;
    case 'Edit':
      return `Editing ${basename(input.file_path as string)}`;
    case 'Bash':
      return `Running: ${truncate(input.command as string, 40)}`;
    case 'Grep':
      return `Searching for "${truncate(input.pattern as string, 25)}"`;
    case 'Glob':
      return `Finding files: ${truncate(input.pattern as string, 25)}`;
    case 'Agent':
      return `Sub-crew: ${truncate(input.description as string, 30)}`;
    default:
      return `Using ${name}`;
  }
}

function basename(filePath: string | undefined): string {
  if (!filePath) return 'file';
  const parts = filePath.split('/');
  return parts[parts.length - 1] || 'file';
}

function truncate(text: string | undefined, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export function parseTranscriptLine(
  line: string,
  sessionId: string,
  projectName: string
): TranscriptEvent[] {
  const events: TranscriptEvent[] = [];

  let record: JsonlRecord;
  try {
    record = JSON.parse(line);
  } catch {
    return events;
  }

  // Turn completion
  if (record.type === 'system' && record.subtype === 'turn_duration') {
    events.push({ sessionId, projectName, type: 'turn_end' });
    return events;
  }

  // User message
  if (record.type === 'user') {
    events.push({ sessionId, projectName, type: 'user_message' });
    return events;
  }

  // Assistant message with tool calls
  if (record.type === 'assistant' && record.message?.content) {
    const content = record.message.content;
    if (!Array.isArray(content)) return events;

    for (const block of content) {
      if (block.type !== 'tool_use' || !block.name) continue;

      const input = (block.input ?? {}) as Record<string, unknown>;

      // Subagent spawn
      if (block.name === 'Agent') {
        events.push({
          sessionId,
          projectName,
          type: 'subagent_start',
          agentId: block.id,
          tool: 'Agent',
          detail: summarizeTool('Agent', input),
        });
        continue;
      }

      // Regular tool
      events.push({
        sessionId,
        projectName,
        type: 'tool',
        tool: block.name,
        detail: summarizeTool(block.name, input),
      });
    }

    // Check for async agent text
    for (const block of content) {
      if (
        block.type === 'text' &&
        block.text?.includes('Async agent launched successfully')
      ) {
        events.push({
          sessionId,
          projectName,
          type: 'subagent_start',
          agentId: `async-${Date.now()}`,
          tool: 'Agent',
          detail: 'Teammate launched!',
        });
      }
    }
  }

  return events;
}
