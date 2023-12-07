type DebouncedFunction<F extends (...args: any[]) => any> = (
  ...args: Parameters<F>
) => ()=>void;
/**
 * debounce function
 * @param func function
 * @param delay time delay
 * @returns debounced function they will return a cancel function
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  delay: number
): DebouncedFunction<F> {
  let timerId: number | null;

  return function (...args: Parameters<F>) {
    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      func(...args);
      timerId = null;
    }, delay);
    return ()=>{
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    }
  };
}

type PromiseState = "pending" | "fulfilled" | "rejected";
export async function getPromiseState(
  p: Promise<unknown>
): Promise<PromiseState> {
  return await Promise.race([
    Promise.resolve(p).then(
      (): PromiseState => "fulfilled",
      (): PromiseState => "rejected"
    ),
    Promise.resolve().then((): PromiseState => "pending"),
  ]);
}

export type AsyncThrottleFn<T extends any[]> = (...args: T) => Promise<void>;
// debounce a async function, if promise state is pending will cache function's args
// but not call this function. when promise is resolved, call function with cached args.
export const asyncThrottle = <T extends any[]>(
  fn: (...args: T) => Promise<unknown>
): AsyncThrottleFn<T> => {
  let isExecuting = false;
  let pendingArgs: T | undefined;

  const executeGuard = async (...args: T) => {
    isExecuting = true;

    // Remove pending call before executing
    pendingArgs = undefined;
    try {
      await fn(...args);
    } finally {
      isExecuting = false;
    }
  };

  return async (...args) => {
    if (!isExecuting) {
      let executeArgs: T | undefined = args;
      // Nothing is executing, immediately execute the function
      while (executeArgs) {
        await executeGuard(...executeArgs).catch((err) => {
          console.error(err);
        });
        // Execute the pending call, if exists.
        executeArgs = pendingArgs;
      }
      return;
    }

    // Something is currently executing, queue the args and set a timeout
    pendingArgs = args;
  };
};

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...funcArgs: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

