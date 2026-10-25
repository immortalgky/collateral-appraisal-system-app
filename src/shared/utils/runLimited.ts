/** Runs the tasks with at most `limit` in flight, in order; a task that fails does not stop the rest. */
export const runLimited = async <T>(tasks: (() => Promise<T>)[], limit = 3): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const at = next++;
      results[at] = await tasks[at]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};
