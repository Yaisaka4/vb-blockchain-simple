import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  Server,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import {
  getIssuers,
  getMinistryNodeUrl,
  getNodeInfo,
  grantIssuer,
  removeIssuer,
  type IssuersResponse,
  type NodeInfo,
} from '@/lib/api';
import { shortHash } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BlockWaitBanner } from '@/components/shared/BlockWaitBanner';

export const MinistryPage: React.FC = () => {
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [data, setData] = useState<IssuersResponse | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [waitFromHeight, setWaitFromHeight] = useState<number | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ publicKey: string; name: string } | null>(null);
  const waitingBlock = waitFromHeight !== null;

  const loadData = useCallback(async () => {
    try {
      const [info, issuers] = await Promise.all([
        getNodeInfo(getMinistryNodeUrl()),
        getIssuers(),
      ]);
      setNodeInfo(info);
      setData(issuers);
      setWaitFromHeight((prev) => (prev !== null && info.height > prev ? null : prev));
      appAlert.dismiss('ministry-offline');
    } catch {
      appAlert.error('Không kết nối được Node 1 (Máy chủ Bộ GD&ĐT)', {
        id: 'ministry-offline',
        description: `Hãy bật mạng qua lệnh node tools/start-local.js (${getMinistryNodeUrl()}).`,
        durationMs: 0,
      });
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 3500);
    return () => {
      window.clearInterval(timer);
      appAlert.dismiss('ministry-offline');
    };
  }, [loadData]);

  const handleGrant = async (publicKey: string, name: string) => {
    setBusyKey(publicKey);
    try {
      const res = await grantIssuer(publicKey, name);
      appAlert.success(`Đã ký lệnh cấp quyền cho ${name}`, { description: res.message });
      setWaitFromHeight(nodeInfo?.height ?? 0);
    } catch (err: unknown) {
      appAlert.error('Không thể cấp quyền', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!revokeTarget) return;
    setBusyKey(revokeTarget.publicKey);
    try {
      const res = await removeIssuer(revokeTarget.publicKey);
      appAlert.success(`Đã ký lệnh gỡ quyền của ${revokeTarget.name}`, {
        description: res.message,
      });
      setRevokeTarget(null);
      setWaitFromHeight(nodeInfo?.height ?? 0);
    } catch (err: unknown) {
      appAlert.error('Không thể gỡ quyền', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const schools = data?.schools || [];
  const issuers = data?.issuers || {};
  const authorizedCount = schools.filter((s) => !!issuers[s.publicKey]).length;

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
            <Badge variant="default">Bộ Giáo dục & Đào tạo</Badge>
            {nodeInfo && (
              <Badge variant={nodeInfo.valid ? 'success' : 'destructive'}>
                {nodeInfo.valid ? `Node 1 Hợp lệ · Block #${nodeInfo.height}` : 'Chain Lỗi'}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900">
            Quản lý Quyền Phát hành Văn bằng
          </h1>
          <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed max-w-3xl">
            Mọi quyết định cấp hoặc gỡ quyền đều được ký bằng <b>Khóa bí mật Admin</b> của Bộ và ghi trực tiếp lên Blockchain qua giao dịch{' '}
            <code className="font-mono text-sm">ADD_ISSUER</code> / <code className="font-mono text-sm">REMOVE_ISSUER</code>.
          </p>
        </div>

        <Button variant="outline" className="self-start sm:self-auto" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
          <span>Làm mới</span>
        </Button>
      </motion.div>

      <BlockWaitBanner
        active={waitingBlock}
        onComplete={() => {
          loadData();
          window.setTimeout(() => setWaitFromHeight(null), 800);
        }}
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[13px] font-medium text-zinc-500 block">Trường thành viên liên minh</span>
              <span className="text-2xl font-bold text-zinc-900 tabular mt-0.5 block">{schools.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[13px] font-medium text-zinc-500 block">Trường đang có quyền cấp bằng</span>
              <span className="text-2xl font-bold text-emerald-700 tabular mt-0.5 block">
                {authorizedCount} / {schools.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[#0071E3] shrink-0">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[13px] font-medium text-zinc-500 block">Độ cao chuỗi Block hiện tại</span>
              <span className="text-2xl font-bold text-zinc-900 font-mono tabular mt-0.5 block">
                #{nodeInfo?.height ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schools Permission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh mục Cơ sở Đào tạo Thành viên</CardTitle>
          <CardDescription className="text-sm">
            Chỉ những trường có trạng thái <b>Được phép phát hành</b> mới có thể gửi giao dịch <code className="font-mono">ISSUE</code> hợp lệ lên chuỗi khối.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Cơ sở đào tạo</TableHead>
                <TableHead>Khóa công khai ECDSA (secp256k1)</TableHead>
                <TableHead>Trạng thái quyền</TableHead>
                <TableHead className="text-right">Thao tác của Bộ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s, idx) => {
                const isAuthorized = !!issuers[s.publicKey];
                const isBusy = busyKey === s.publicKey;
                return (
                  <TableRow key={s.publicKey}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-semibold text-[15px] text-zinc-900">{s.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Validator Node #{idx + 1}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-[13px] text-zinc-700">
                          {shortHash(s.publicKey, 14, 12)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            navigator.clipboard.writeText(s.publicKey);
                            appAlert.success(`Đã sao chép khóa công khai của ${s.name}`);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isAuthorized ? (
                        <Badge variant="success">Được phép phát hành</Badge>
                      ) : (
                        <Badge variant="secondary">Chưa cấp quyền</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {isAuthorized ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => setRevokeTarget({ publicKey: s.publicKey, name: s.name })}
                        >
                          <ShieldOff className="h-4 w-4" />
                          <span>Gỡ quyền</span>
                        </Button>
                      ) : (
                        <Button
                          variant="appleBlue"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleGrant(s.publicKey, s.name)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{isBusy ? 'Đang ký…' : 'Cấp quyền phát hành'}</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Remove Permission Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận gỡ quyền phát hành văn bằng?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Sau khi giao dịch <code className="font-mono">REMOVE_ISSUER</code> được đóng vào block mới,{' '}
              <b>{revokeTarget?.name}</b> sẽ không thể cấp thêm văn bằng mới (các văn bằng đã cấp trước đó vẫn giữ nguyên hiệu lực trên chuỗi).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              disabled={!!busyKey}
              onClick={handleConfirmRemove}
            >
              Xác nhận gỡ quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
