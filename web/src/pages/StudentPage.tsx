import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import {
  QrCode,
  Copy,
  ExternalLink,
  GraduationCap,
  Calendar,
  Boxes,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentCertificatesAcrossNodes, type CertificateRecord } from '@/lib/api';
import { formatDateTime, shortHash } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const StudentPage: React.FC = () => {
  const { user } = useAuth();
  const myStudentId = user?.studentId || 'SV001';

  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [answeredNode, setAnsweredNode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [shareCert, setShareCert] = useState<CertificateRecord | null>(null);

  const fetchMyDiplomas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, nodeLabel } = await getStudentCertificatesAcrossNodes(myStudentId);
      setCerts(data);
      setAnsweredNode(nodeLabel);
      appAlert.dismiss('student-fetch-err');
    } catch (err: unknown) {
      appAlert.error('Không thể tải hồ sơ văn bằng', {
        id: 'student-fetch-err',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [myStudentId]);

  useEffect(() => {
    fetchMyDiplomas();
    return () => appAlert.dismiss('student-fetch-err');
  }, [fetchMyDiplomas]);

  const shareUrl = shareCert
    ? `${window.location.origin}/verify?cert=${encodeURIComponent(shareCert.certId)}`
    : '';

  const validCount = certs.filter((c) => c.status === 'valid').length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-10 space-y-7">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Mã sinh viên: {myStudentId}</span>
            </Badge>
            {answeredNode && (
              <Badge variant="success">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{answeredNode}</span>
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900">
            Văn bằng của {user?.displayName}
          </h1>
          <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed max-w-2xl">
            Hồ sơ cá nhân được bảo vệ bằng hàm băm một chiều <code className="font-mono text-sm">sha256(studentId + salt)</code> và chỉ hiển thị các văn bằng thuộc về tài khoản <b>{myStudentId}</b> của bạn.
          </p>
        </div>

        <Button
          variant="outline"
          className="self-start sm:self-auto"
          onClick={fetchMyDiplomas}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </Button>
      </motion.div>

      {/* Personal Summary Strip */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[13px] font-medium text-zinc-500 block">Tổng số văn bằng ghi nhận</span>
              <span className="text-2xl font-bold text-zinc-900 tabular mt-0.5 block">{certs.length}</span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[13px] font-medium text-zinc-500 block">Đang có hiệu lực pháp lý</span>
              <span className="text-2xl font-bold text-emerald-700 tabular mt-0.5 block">{validCount}</span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diploma Cards */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-12 sm:p-14 text-center text-[15px] text-zinc-500">
          Đang đồng bộ danh sách văn bằng từ mạng Blockchain…
        </div>
      ) : certs.length === 0 ? (
        <Card>
          <CardContent className="py-14 sm:py-16 px-4 text-center space-y-2.5">
            <Sparkles className="h-9 w-9 text-zinc-300 mx-auto" />
            <h3 className="text-base sm:text-lg font-semibold text-zinc-800">
              Chưa có văn bằng nào được cấp cho mã {myStudentId}
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
              Ngay sau khi trường đại học ký số phát hành văn bằng cho mã <b>{myStudentId}</b> và khối mới được đóng (~5 giây), văn bằng sẽ tự động hiển thị tại đây.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          {certs.map((c, idx) => (
            <motion.div
              key={c.certId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full flex flex-col justify-between hover:shadow-apple-hover transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shrink-0">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="font-mono text-base sm:text-lg truncate">{c.certId}</CardTitle>
                        <CardDescription className="text-sm mt-0.5 truncate">{c.issuerName}</CardDescription>
                      </div>
                    </div>
                    {c.status === 'valid' ? (
                      <Badge variant="success">Hợp lệ</Badge>
                    ) : (
                      <Badge variant="destructive">Đã thu hồi</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200/75 p-4 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 flex items-center gap-1.5 shrink-0">
                        <Calendar className="h-4 w-4" /> Ngày cấp
                      </span>
                      <span className="font-medium text-zinc-800 tabular text-right">
                        {formatDateTime(c.issuedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 flex items-center gap-1.5 shrink-0">
                        <Boxes className="h-4 w-4" /> Block lưu trữ
                      </span>
                      <span className="font-mono font-medium text-zinc-800">Block #{c.blockIndex}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 shrink-0">Hash PDF</span>
                      <span className="font-mono text-[13px] text-zinc-700 truncate">{shortHash(c.docHash, 8, 8)}</span>
                    </div>
                  </div>

                  {c.revokeRequest && c.status === 'valid' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Đang có yêu cầu thu hồi chờ hội đồng duyệt: {c.revokeRequest.reason}
                    </div>
                  )}

                  <Button
                    variant="appleBlue"
                    size="lg"
                    className="w-full"
                    onClick={() => setShareCert(c)}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Tạo Liên kết & Mã QR</span>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Code & Link Share Modal */}
      <Dialog open={!!shareCert} onOpenChange={(open) => !open && setShareCert(null)}>
        <DialogContent className="max-w-md p-5 sm:p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Chia sẻ Văn bằng {shareCert?.certId}</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Nhà tuyển dụng chỉ cần quét mã QR hoặc mở liên kết này để đối chiếu trực tiếp trên Blockchain mà không cần đăng nhập.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-2 space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-apple">
              {shareUrl && <QRCodeSVG value={shareUrl} size={184} level="M" includeMargin={false} />}
            </div>

            <div className="w-full flex items-center gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs sm:text-[13px] bg-zinc-50" />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  appAlert.success('Đã sao chép liên kết xác minh', {
                    description: 'Bạn có thể gửi kèm liên kết này trong CV.',
                  });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Lưu ý: Đính kèm thêm <b>tệp PDF văn bằng gốc</b> trong hồ sơ xin việc để nhà tuyển dụng kiểm tra mã băm SHA-256.
            </p>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setShareCert(null)}>
              Đóng
            </Button>
            <Button variant="appleBlue" asChild>
              <a href={shareUrl} target="_blank" rel="noreferrer">
                <span>Mở trang Xác minh</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
