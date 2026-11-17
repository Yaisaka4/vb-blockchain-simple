import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Blocks,
  ShieldAlert,
  CheckCircle2,
  WifiOff,
  Flame,
  RefreshCw,
  Eye,
  Cpu,
  Server,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';
import { getAllNodes, SCHOOL_NAMES, type NodeDescriptor } from '@/lib/network';
import {
  getNodeChain,
  triggerNodeTamper,
  type BlockItem,
  type ChainResponse,
} from '@/lib/api';
import { formatDateTime, shortHash } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NodeSnapshot {
  descriptor: NodeDescriptor;
  data: ChainResponse | null;
}

export const ExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<NodeSnapshot[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<{
    nodeLabel: string;
    block: BlockItem;
  } | null>(null);
  const [demoAttackMode, setDemoAttackMode] = useState(false);
  const [tamperingNode, setTamperingNode] = useState<string | null>(null);

  const pollAll = useCallback(async () => {
    const nodes = getAllNodes();
    const res = await Promise.all(
      nodes.map(async (descriptor) => {
        try {
          const data = await getNodeChain(descriptor.url);
          return { descriptor, data };
        } catch {
          return { descriptor, data: null };
        }
      })
    );
    setSnapshots(res);
  }, []);

  useEffect(() => {
    pollAll();
    const timer = window.setInterval(pollAll, 2000);
    return () => window.clearInterval(timer);
  }, [pollAll]);

  const handleTamperDemo = async (node: NodeDescriptor) => {
    setTamperingNode(node.id);
    try {
      const res = await triggerNodeTamper(node.url);
      appAlert.warning(`Đã mô phỏng sửa trộm tại ${node.shortLabel}!`, {
        description: `Phát hiện lỗi: "${res.error}" — Node này sẽ báo ĐỎ và tự khôi phục chuỗi chuẩn sau ~6 giây.`,
        durationMs: 7000,
      });
      pollAll();
    } catch (err: unknown) {
      appAlert.error('Không thể mô phỏng tấn công', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setTamperingNode(null);
    }
  };

  // Lấy chuỗi chuẩn dài nhất hợp lệ để hiển thị chuỗi Block chung
  const canonicalSnapshot = snapshots
    .filter((s) => s.data?.valid)
    .sort((a, b) => (b.data?.height ?? -1) - (a.data?.height ?? -1))[0];

  const highest = canonicalSnapshot?.data?.height ?? 0;
  const canonicalChain = canonicalSnapshot?.data?.chain ?? [];
  const nextTurnSchool = SCHOOL_NAMES[(highest + 1) % SCHOOL_NAMES.length];

  const canUseSecurityDemo = user?.role !== 'student';

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              <Blocks className="h-3.5 w-3.5" />
              <span>Chuỗi Block chung toàn mạng</span>
            </Badge>
            <Badge variant="info">
              <Cpu className="h-3.5 w-3.5" />
              <span>Lượt đóng Block #{highest + 1}: {nextTurnSchool}</span>
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900">
            Block Explorer — Dữ liệu Chuỗi khối & Trạng thái Node
          </h1>
          <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed max-w-3xl">
            Toàn hệ thống dùng chung <b>một chuỗi Blockchain duy nhất</b>. Nhấn vào bất kỳ Block nào bên dưới để xem mã băm SHA-256, Merkle Root và chữ ký số ECDSA.
          </p>
        </div>

        <Button variant="outline" className="self-start md:self-auto shrink-0" onClick={pollAll}>
          <RefreshCw className="h-4 w-4" />
          <span>Làm mới</span>
        </Button>
      </motion.div>

      {/* SECTION 1: UNIFIED BLOCKCHAIN TIMELINE */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <CardTitle>Danh sách các Block trên Chuỗi (Độ cao #{highest})</CardTitle>
            <CardDescription className="text-sm mt-0.5">
              Hiển thị từ Block mới nhất lùi về Block đầu tiên (Block #0 - Genesis).
            </CardDescription>
          </div>
          {canonicalSnapshot && (
            <Badge variant="outline">
              Mempool chờ: {canonicalSnapshot.data?.mempool.length ?? 0} giao dịch
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {canonicalChain.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
              Chưa kết nối được máy chủ nào trong mạng Blockchain.
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {[...canonicalChain].reverse().map((block) => (
                <button
                  key={block.index + block.hash}
                  type="button"
                  onClick={() =>
                    setSelectedBlock({
                      nodeLabel: 'Chuỗi Block chuẩn',
                      block,
                    })
                  }
                  className="text-left rounded-2xl border border-zinc-200/85 bg-zinc-50/60 p-4 transition-all hover:bg-white hover:border-[#0071E3] hover:shadow-apple cursor-pointer group min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-bold text-zinc-900 whitespace-nowrap">
                      Block #{block.index}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 group-hover:text-[#0071E3] whitespace-nowrap shrink-0">
                      …{block.hash.slice(-10)}
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 tabular">
                    {formatDateTime(block.timestamp)}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/70 space-y-1">
                    {block.transactions.map((tx, idx) => (
                      <div key={idx} className="text-[13px] font-mono text-zinc-700 truncate">
                        • <span className="font-semibold">{tx.type}</span>{' '}
                        <span className="font-sans text-zinc-900">
                          {tx.certId || tx.name || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: 4 NODE REPLICAS */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-zinc-700 shrink-0" />
              <h2 className="text-lg font-semibold text-zinc-900">
                Trạng thái Đồng bộ Bản sao tại 4 Node Thành viên
              </h2>
            </div>
            <p className="text-sm text-zinc-500 max-w-2xl">
              Mỗi trường đại học và máy chủ dự phòng tự giữ một bản sao đầy đủ của chuỗi Block trên để đối chiếu chéo và tự phục hồi khi dữ liệu bị can thiệp.
            </p>
          </div>

          {canUseSecurityDemo && (
            <label className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer select-none shrink-0">
              <span>Demo Kiểm thử Tự phục hồi</span>
              <Switch checked={demoAttackMode} onCheckedChange={setDemoAttackMode} />
            </label>
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {snapshots.map(({ descriptor, data }) => {
            const isOnline = !!data;
            const isValid = data?.valid ?? false;
            const isMyUniversityNode =
              user?.role === 'university' && user.schoolIndex === descriptor.schoolIndex;
            const shortHost = descriptor.url.replace(/^https?:\/\//, '');

            return (
              <Card
                key={descriptor.id}
                className={`transition-all duration-300 ${
                  !isOnline
                    ? 'opacity-65 border-zinc-200 bg-zinc-50'
                    : !isValid
                    ? 'border-red-400 bg-red-50/50 ring-2 ring-red-500/20'
                    : isMyUniversityNode
                    ? 'border-[#0071E3] ring-2 ring-[#0071E3]/15'
                    : 'border-zinc-200/85'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Header: min-w-0 + shrink-0 whitespace-nowrap Badge để không bao giờ bị rớt chữ "Đồng bộ" */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate">
                        {descriptor.shortLabel}
                      </h3>
                      <p className="font-mono text-xs text-zinc-500 mt-0.5 truncate" title={descriptor.url}>
                        {shortHost}
                      </p>
                    </div>

                    {!isOnline ? (
                      <Badge variant="secondary">
                        <WifiOff />
                        <span>Đang tắt</span>
                      </Badge>
                    ) : isValid ? (
                      <Badge variant="success">
                        <CheckCircle2 />
                        <span>Đồng bộ</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="animate-pulse">
                        <ShieldAlert />
                        <span>Bị sửa!</span>
                      </Badge>
                    )}
                  </div>

                  {isMyUniversityNode && (
                    <div>
                      <Badge variant="info">Node của trường bạn</Badge>
                    </div>
                  )}

                  {isOnline && data ? (
                    <div className="rounded-xl bg-zinc-50 border border-zinc-200/75 p-3.5 text-sm space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500 whitespace-nowrap">Độ cao bản sao</span>
                        <span className="font-mono font-semibold text-zinc-900 tabular">
                          #{data.height}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-500 whitespace-nowrap">Hash khối đỉnh</span>
                        <span className="font-mono text-xs text-zinc-700 truncate">
                          …{data.chain[data.chain.length - 1]?.hash.slice(-8)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 py-5 text-center text-sm text-zinc-400">
                      Không phản hồi kết nối
                    </div>
                  )}

                  {isOnline && data && !data.valid && data.error && (
                    <div className="rounded-xl bg-red-100/90 border border-red-200 p-3 text-xs font-medium text-red-800 leading-relaxed">
                      {data.error}
                    </div>
                  )}

                  {demoAttackMode &&
                    isOnline &&
                    !descriptor.isBackup &&
                    (data?.height ?? 0) >= 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={tamperingNode === descriptor.id}
                        onClick={() => handleTamperDemo(descriptor)}
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        <span>Giả lập Sửa trộm Dữ liệu</span>
                      </Button>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Block Cryptographic Inspector Dialog */}
      <Dialog
        open={!!selectedBlock}
        onOpenChange={(open) => !open && setSelectedBlock(null)}
      >
        <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0 pr-12">
            <DialogTitle className="font-mono text-base sm:text-lg">
              Block #{selectedBlock?.block.index} — {selectedBlock?.nodeLabel}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Thời gian đóng khối: {formatDateTime(selectedBlock?.block.timestamp)}
            </DialogDescription>
          </DialogHeader>

          {selectedBlock && (
            <div className="flex-1 overflow-y-auto thin-scrollbar px-6 py-4 space-y-4 text-sm">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 space-y-2.5 font-mono text-xs">
                <div>
                  <span className="text-zinc-500 block font-sans font-medium mb-0.5">
                    Hash hiện tại (SHA-256):
                  </span>
                  <span className="text-zinc-900 break-all">{selectedBlock.block.hash}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans font-medium mb-0.5">
                    Hash khối liền trước (prevHash):
                  </span>
                  <span className="text-zinc-700 break-all">{selectedBlock.block.prevHash}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans font-medium mb-0.5">
                    Gốc cây giao dịch (merkleRoot):
                  </span>
                  <span className="text-zinc-700 break-all">{selectedBlock.block.merkleRoot}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans font-medium mb-0.5">
                    Khóa công khai Validator ký đóng khối:
                  </span>
                  <span className="text-zinc-700 break-all">
                    {shortHash(selectedBlock.block.validator, 20, 20)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-zinc-800/90 bg-zinc-900/90 text-xs font-semibold text-zinc-300">
                  Danh sách Giao dịch trong Khối ({selectedBlock.block.transactions.length})
                </div>
                <pre className="max-h-[240px] overflow-auto dark-scrollbar p-4 font-mono text-xs text-emerald-400 leading-relaxed">
                  {JSON.stringify(selectedBlock.block.transactions, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
