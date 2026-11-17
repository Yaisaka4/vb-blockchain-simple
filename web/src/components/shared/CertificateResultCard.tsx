import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Copy,
  Building2,
  Calendar,
  Boxes,
  FileWarning,
  ShieldCheck,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import type { CertificateRecord } from '@/lib/api';
import { formatDateTime, shortHash } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CertificateResultCardProps {
  record: CertificateRecord;
  answeredByLabel?: string;
}

export const CertificateResultCard: React.FC<CertificateResultCardProps> = ({
  record,
  answeredByLabel,
}) => {
  const copyHash = (hash?: string) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    appAlert.success('Đã sao chép mã băm SHA-256', {
      description: shortHash(hash, 14, 14),
    });
  };

  if (record.status === 'valid') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/80 to-white p-5 sm:p-6 shadow-apple space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900">
                  Văn bằng Hợp lệ & Nguyên vẹn
                </h3>
                <Badge variant="success">Xác thực On-chain</Badge>
              </div>
              <p className="text-sm text-zinc-600 mt-1">
                Chữ ký số ECDSA của trường đại học và mã băm SHA-256 trùng khớp trên Blockchain.
              </p>
            </div>
          </div>
          {answeredByLabel && (
            <Badge variant="outline">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đối chiếu tại: {answeredByLabel}</span>
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-zinc-200/75 bg-white/95 p-4">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-zinc-500">Mã hiệu văn bằng</span>
            <p className="font-mono text-[15px] font-semibold text-zinc-900 break-all">{record.certId}</p>
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" /> Đơn vị cấp phát
            </span>
            <p className="text-[15px] font-semibold text-zinc-900">{record.issuerName}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> Thời điểm ghi nhận
            </span>
            <p className="text-sm text-zinc-800 tabular">{formatDateTime(record.issuedAt)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5 shrink-0" /> Vị trí lưu trữ bất biến
            </span>
            <p className="font-mono text-sm font-semibold text-zinc-900">Block #{record.blockIndex}</p>
          </div>
        </div>

        {record.docHash && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-zinc-100/85 px-4 py-3">
            <div className="min-w-0 space-y-0.5">
              <span className="text-xs font-medium text-zinc-500 block">
                Dấu vân tay tệp PDF (SHA-256)
              </span>
              <code className="font-mono text-[13px] text-zinc-800 break-all">
                {shortHash(record.docHash, 16, 16)}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto shrink-0"
              onClick={() => copyHash(record.docHash)}
            >
              <Copy className="h-3.5 w-3.5" /> Sao chép
            </Button>
          </div>
        )}

        {record.revokeRequest && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 flex items-start gap-3">
            <FileWarning className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 space-y-1">
              <p className="font-semibold">Đang có yêu cầu thu hồi chờ hội đồng các trường phê duyệt</p>
              <p>Lý do đề xuất: {record.revokeRequest.reason}</p>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  if (record.status === 'revoked' && record.revoked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="rounded-2xl border border-amber-300/90 bg-gradient-to-b from-amber-50/85 to-white p-5 sm:p-6 shadow-apple space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900">
                  Văn bằng Đã bị Thu hồi
                </h3>
                <Badge variant="warning">Hết hiệu lực pháp lý</Badge>
              </div>
              <p className="text-sm text-zinc-600 mt-1">
                Đã được đa số trường đại học trong liên minh đồng thuận phê duyệt thu hồi.
              </p>
            </div>
          </div>
          {answeredByLabel && <Badge variant="outline">{answeredByLabel}</Badge>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-amber-200/80 bg-white p-4 text-sm">
          <div>
            <span className="text-xs font-medium text-zinc-500 block">Mã văn bằng</span>
            <span className="font-mono text-[15px] font-semibold text-zinc-900">{record.certId}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 block">Trường cấp ban đầu</span>
            <span className="text-[15px] font-medium text-zinc-900">{record.issuerName}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs font-medium text-zinc-500 block">Lý do thu hồi chính thức</span>
            <span className="font-medium text-red-700">{record.revoked.reason}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 block">Thời điểm thu hồi</span>
            <span className="tabular">{formatDateTime(record.revoked.revokedAt)} (Block #{record.revoked.blockIndex})</span>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 block">Hội đồng trường đồng thuận</span>
            <span className="font-medium text-zinc-900">{(record.revoked.approvedBy || []).join(', ')}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (record.status === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-sky-200 bg-sky-50/75 p-5 sm:p-6 shadow-apple flex items-start gap-3.5"
      >
        <Clock className="h-6 w-6 text-[#0071E3] animate-spin shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <h3 className="text-base font-semibold text-zinc-900">Đang chờ đóng Block PoA</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Văn bằng <span className="font-mono font-semibold">{record.certId}</span> đang nằm trong hàng đợi Mempool. Vui lòng kiểm tra lại sau khoảng 5 giây.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="rounded-2xl border border-red-200/90 bg-gradient-to-b from-red-50/80 to-white p-5 sm:p-6 shadow-apple flex items-start gap-4"
    >
      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-red-600 text-white shrink-0 shadow-sm">
        <XCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900">
            Không tìm thấy trên Blockchain
          </h3>
          <Badge variant="destructive">Cảnh báo Giả mạo / Sai lệch</Badge>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Tệp PDF này đã bị chỉnh sửa dù chỉ 1 byte sau khi cấp, hoặc chưa từng được bất kỳ cơ sở đào tạo hợp pháp nào ghi nhận lên Blockchain.
        </p>
      </div>
    </motion.div>
  );
};
