import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Power Apps tablet / landscape design coordinates. Browser size changes only scale.
export const canvasSize = { width: 1366, height: 768 } as const;

export function CanvasFrame({ children }: { children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const resize = () => setScale(Math.min(
      element.clientWidth / canvasSize.width,
      element.clientHeight / canvasSize.height,
    ));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div className="canvas-stage" ref={stage}>
    <div className="canvas-frame" style={{
      width: canvasSize.width,
      height: canvasSize.height,
      transform: `translate(-50%, -50%) scale(${scale})`,
    }}>
      {children}
    </div>
  </div>;
}
