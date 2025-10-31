import { useEffect, useRef, useState } from 'react';

// 使用时间窗口节流值更新，返回被节流的值
export function useThrottledValue<T>(value: T, delayMs = 120) {
  const [throttled, setThrottled] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setThrottled(value), delayMs);
    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [value, delayMs]);

  return throttled;
}

// 返回一个节流后的函数（尾触发），适合高频事件回调
export function useThrottleFn<T extends (...args: any[]) => void>(fn: T, delayMs = 120): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef<T>(fn);

  useEffect(() => { fnRef.current = fn; }, [fn]);

  const throttled = ((...args: any[]) => {
    const now = Date.now();
    const diff = now - lastCallRef.current;
    if (diff >= delayMs) {
      lastCallRef.current = now;
      fnRef.current(...args);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        fnRef.current(...args);
      }, delayMs - diff);
    }
  }) as T;

  return throttled;
}