export type AppAlertKind = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface AppAlertItem {
  id: string;
  variant: AppAlertKind;
  title: string;
  description?: string;
  durationMs?: number; // 0 = giữ nguyên cho tới khi đóng hoặc hết điều kiện
  createdAt: number;
}

export interface PushAlertOptions {
  id?: string;
  description?: string;
  durationMs?: number;
}

type Listener = (items: AppAlertItem[]) => void;

let alerts: AppAlertItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, number>();

function emit() {
  const snapshot = [...alerts];
  listeners.forEach((fn) => fn(snapshot));
}

function scheduleDismiss(id: string, durationMs: number) {
  const prev = timers.get(id);
  if (prev) window.clearTimeout(prev);
  if (durationMs > 0) {
    const t = window.setTimeout(() => {
      dismissAlert(id);
    }, durationMs);
    timers.set(id, t);
  } else {
    timers.delete(id);
  }
}

export function pushAlert(
  variant: AppAlertKind,
  title: string,
  options?: PushAlertOptions
): string {
  const id = options?.id || `alrt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const durationMs = options?.durationMs ?? 4500;
  const nextItem: AppAlertItem = {
    id,
    variant,
    title,
    description: options?.description,
    durationMs,
    createdAt: Date.now(),
  };

  const existingIdx = alerts.findIndex((a) => a.id === id);
  if (existingIdx >= 0) {
    const cur = alerts[existingIdx];
    // Tránh re-render không cần thiết nếu nội dung alert định kỳ không đổi
    if (
      cur.title === nextItem.title &&
      cur.description === nextItem.description &&
      cur.variant === nextItem.variant
    ) {
      if (durationMs > 0) scheduleDismiss(id, durationMs);
      return id;
    }
    alerts = alerts.map((item, idx) => (idx === existingIdx ? nextItem : item));
  } else {
    // Giữ tối đa 4 alert trên màn hình để góc phải dưới luôn gọn gàng
    alerts = [...alerts.slice(-3), nextItem];
  }

  scheduleDismiss(id, durationMs);
  emit();
  return id;
}

export function dismissAlert(id: string) {
  const t = timers.get(id);
  if (t) {
    window.clearTimeout(t);
    timers.delete(id);
  }
  const next = alerts.filter((a) => a.id !== id);
  if (next.length !== alerts.length) {
    alerts = next;
    emit();
  }
}

export function subscribeAlerts(fn: Listener) {
  listeners.add(fn);
  fn([...alerts]);
  return () => {
    listeners.delete(fn);
  };
}

export const appAlert = {
  message: (title: string, opts?: PushAlertOptions) => pushAlert('default', title, opts),
  success: (title: string, opts?: PushAlertOptions) => pushAlert('success', title, opts),
  error: (title: string, opts?: PushAlertOptions) => pushAlert('destructive', title, opts),
  warning: (title: string, opts?: PushAlertOptions) => pushAlert('warning', title, opts),
  info: (title: string, opts?: PushAlertOptions) => pushAlert('info', title, opts),
  dismiss: dismissAlert,
};
