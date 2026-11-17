import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BlockWaitBannerProps {
  active: boolean;
  label?: string;
  durationMs?: number;
  onComplete?: () => void;
}

export const BlockWaitBanner: React.FC<BlockWaitBannerProps> = ({
  active,
  label = 'Giao dịch đã vào Mempool — đang chờ Validator tới lượt đóng Block PoA (~5 giây)…',
  durationMs = 5800,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setDone(false);
      return;
    }
    setDone(false);
    const start = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        setDone(true);
        onComplete?.();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, durationMs, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4 shadow-apple-sm">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-950">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-[#0071E3] animate-spin shrink-0" />
                )}
                <span>{done ? 'Block mới đã được tạo — đang đồng bộ dữ liệu Blockchain…' : label}</span>
              </div>
              <span className="text-xs font-mono font-semibold text-[#0071E3] tabular">
                {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5 bg-sky-200/60" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
