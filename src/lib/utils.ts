type DebouncedFunction<F extends (...args: any[]) => any> = (
  ...args: Parameters<F>
) => void;
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  delay: number
): DebouncedFunction<F> {
  let timerId: number | null;

  return function (...args: Parameters<F>): void {
    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      func(...args);
      timerId = null;
    }, delay);
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

// covter svg to canvas
export async function createCanvas(
  doc: string[],
  aspect: number,
  domWidth: number
): Promise<HTMLCanvasElement[]> {
  let canvas_list: HTMLCanvasElement[] = [];
  const dpr = window.devicePixelRatio || 1;

  function loadImage(svg: string): Promise<HTMLImageElement> {
    return new Promise((resolve, _) => {
      const img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.src = "data:image/svg+xml," + encodeURIComponent(svg);
    });
  }

  for (let idx = 0; idx < doc.length; idx++) {
    const value = doc[idx];
    const canvas = document.createElement("canvas")!;
    let img = await loadImage(value);

    const domHeight = domWidth * aspect;
    canvas.style.width = domWidth + "px";
    canvas.style.height = domHeight + "px";
    canvas.width = dpr * domWidth;
    canvas.height = dpr * domHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.drawImage(img, 0, 0, domWidth, domHeight);

    canvas_list.push(canvas);
  }

  return canvas_list;
}
