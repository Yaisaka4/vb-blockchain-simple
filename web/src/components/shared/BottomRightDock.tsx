import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  X,
  ArrowUp,
} from 'lucide-react';
import {
  dismissAlert,
  subscribeAlerts,
  type AppAlertItem,
  type AppAlertKind,
} from '@/lib/notify';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ICONS: Record<AppAlertKind, React.ElementType> = {
  default: Bell,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const BottomRightDock: React.FC = () => {
  const [items, setItems] = useState<AppAlertItem[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => subscribeAlerts(setItems), []);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 260);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2.5 sm:w-[390px]"
    >
      {/* Nút Scroll-to-Top tự động xếp gọn ngay phía trên danh sách Alert, không bao giờ đè nhau */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            key="scroll-top-btn"
            layout
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto"
          >
            <Button
              type="button"
              size="icon"
              onClick={scrollToTop}
              aria-label="Cuộn lên đầu trang"
              title="Lên đầu trang"
              className="h-11 w-11 rounded-full border border-zinc-200/90 bg-white/92 text-zinc-800 shadow-apple-hover backdrop-blur-xl hover:bg-zinc-900 hover:text-white hover:border-zinc-900"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cụm thông báo toàn ứng dụng dùng chuẩn component Alert của shadcn/ui ở góc phải dưới */}
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const Icon = ICONS[item.variant] || Bell;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-full"
            >
              <Alert variant={item.variant}>
                <Icon />
                <AlertTitle>{item.title}</AlertTitle>
                {item.description && (
                  <AlertDescription>{item.description}</AlertDescription>
                )}
                <AlertAction>
                  <button
                    type="button"
                    onClick={() => dismissAlert(item.id)}
                    aria-label="Đóng thông báo"
                    className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </AlertAction>
              </Alert>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
