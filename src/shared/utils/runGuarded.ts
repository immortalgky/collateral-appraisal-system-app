import toast from 'react-hot-toast';

/**
 * Runs a handler nobody awaits. A throw, or a rejection from an async handler, would otherwise be
 * an unhandled rejection with nothing on screen, so it is logged and reported as a toast instead.
 */
export const runGuarded = (run: () => void | Promise<void>, message: string) => {
  const report = (error: unknown) => {
    console.error(error);
    toast.error(message);
  };
  try {
    Promise.resolve(run()).catch(report);
  } catch (error) {
    report(error);
  }
};
