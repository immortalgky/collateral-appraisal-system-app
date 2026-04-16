import { LogLevel, type ILogger } from '@microsoft/signalr';

/**
 * SignalR logger that suppresses the "stopped during negotiation" error.
 *
 * In React Strict Mode (development), effects are unmounted and remounted once.
 * When the cleanup fires while SignalR is mid-negotiation it calls stop(), which
 * internally logs an error before the .catch() handler can intercept it. That
 * error is harmless — the connection succeeds on the second mount — but it
 * clutters the console and can mask real failures.
 */
const SUPPRESSED = /stopped during negotiation/i;

export const signalrLogger: ILogger = {
  log(logLevel: LogLevel, message: string) {
    if (SUPPRESSED.test(message)) return;
    if (logLevel >= LogLevel.Error) {
      console.error('[SignalR]', message);
    } else if (logLevel >= LogLevel.Warning) {
      console.warn('[SignalR]', message);
    }
  },
};
