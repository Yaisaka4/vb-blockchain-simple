import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  FilePlus2,
  FileWarning,
  BookOpenCheck,
  UploadCloud,
  FileText,
  ExternalLink,
  CheckCircle2,
  Copy,
  Download,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_NAMES, getNetworkConfig } from '@/lib/network';
import {
  approveRevokeCertificate,
  getCertificateOnNode,
  getIssuers,
  getNodeChain,
  getNodeInfo,
  getRevokeRequests,
  getSchoolNodeUrl,
  issueCertificate,
  requestRevokeCertificate,
  type CertificateRecord,
  type NodeInfo,
  type RevokeRequestItem,
} from '@/lib/api';
import {
  issueCertSchema,
  revokeCertSchema,
  type IssueCertFormValues,
  type RevokeCertFormValues,
} from '@/lib/schemas';
import { fileToBase64, formatBytes, formatDateTime, shortHash } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { BlockWaitBanner } from '@/components/shared/BlockWaitBanner';

export const UniversityPage: React.FC = () => {
  const { user } = useAuth();
  const schoolIdx = user?.schoolIndex ?? 0;
  const schoolName = user?.displayName || SCHOOL_NAMES[schoolIdx] || 'Trường Đại học';
  const nodeUrl = getSchoolNodeUrl(schoolIdx);
  const net = getNetworkConfig();

  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [offline, setOffline] = useState(false);
  const [issuedCerts, setIssuedCerts] = useState<CertificateRecord[]>([]);
  const [revokeRequests, setRevokeRequests] = useState<RevokeRequestItem[]>([]);
  const [waitFromHeight, setWaitFromHeight] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const waitingBlock = waitFromHeight !== null;

  const issueFileRef = useRef<HTMLInputElement | null>(null);
  const evidenceFileRef = useRef<HTMLInputElement | null>(null);

  const defaultCertCode = schoolIdx === 0 ? 'VB2026-001' : `VB2026-00${schoolIdx + 1}`;

  const issueForm = useForm<IssueCertFormValues>({
    resolver: zodResolver(issueCertSchema),
    defaultValues: {
      certId: defaultCertCode,
      studentId: 'SV001',
    },
    mode: 'onChange',
  });

  const revokeForm = useForm<RevokeCertFormValues>({
    resolver: zodResolver(revokeCertSchema),
    defaultValues: {
      certId: '',
      reason: 'Phát hiện vi phạm quy chế thi tốt nghiệp theo biên bản hội đồng kỷ luật',
    },
    mode: 'onChange',
  });

  const loadAll = useCallback(async () => {
    try {
      const [info, reqs, chainRes, issuersRes] = await Promise.all([
        getNodeInfo(nodeUrl),
        getRevokeRequests(nodeUrl),
        getNodeChain(nodeUrl),
        getIssuers(nodeUrl),
      ]);
      setNodeInfo(info);
      setRevokeRequests(reqs);
      setWaitFromHeight((prev) => (prev !== null && info.height > prev ? null : prev));
      setOffline(false);
      appAlert.dismiss('uni-offline');

      if (!info.isIssuer) {
        appAlert.warning(`${schoolName} chưa có quyền cấp văn bằng`, {
          id: 'uni-no-issuer',
          description: 'Hãy đăng nhập tài khoản Bộ GD&ĐT (bo.gddt) để cấp quyền phát hành.',
          durationMs: 0,
        });
      } else {
        appAlert.dismiss('uni-no-issuer');
      }

      const myPubKey = issuersRes.schools[schoolIdx]?.publicKey;
      if (myPubKey) {
        const myIssueTxs = chainRes.chain
          .flatMap((b) => b.transactions)
          .filter((t) => t.type === 'ISSUE' && t.issuer === myPubKey)
          .reverse();
        const details = await Promise.all(
          myIssueTxs.map((t) => getCertificateOnNode(nodeUrl, t.certId || ''))
        );
        setIssuedCerts(details);
      }
    } catch {
      setOffline(true);
      appAlert.error(`Node của ${schoolName} đang ngoại tuyến`, {
        id: 'uni-offline',
        description: `Không kết nối được tới ${nodeUrl}. Hãy chạy node tools/start-local.js.`,
        durationMs: 0,
      });
    }
  }, [nodeUrl, schoolIdx, schoolName]);

  useEffect(() => {
    loadAll();
    const timer = window.setInterval(loadAll, 3500);
    return () => {
      window.clearInterval(timer);
      appAlert.dismiss('uni-offline');
      appAlert.dismiss('uni-no-issuer');
    };
  }, [loadAll]);

  const onIssueSubmit = async (values: IssueCertFormValues) => {
    try {
      const pdfBase64 = await fileToBase64(values.pdfFile);
      const res = await issueCertificate(nodeUrl, {
        certId: values.certId.trim(),
        studentId: values.studentId.trim(),
        pdfBase64,
      });
      appAlert.success(`Đã ký phát hành ${values.certId}`, { description: res.message });
      setWaitFromHeight(nodeInfo?.height ?? 0);
    } catch (err: unknown) {
      appAlert.error('Cấp văn bằng thất bại', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onRevokeSubmit = async (values: RevokeCertFormValues) => {
    try {
      const evidenceBase64 = await fileToBase64(values.evidenceFile);
      const res = await requestRevokeCertificate(nodeUrl, values.certId.trim(), {
        reason: values.reason.trim(),
        evidenceBase64,
        evidenceName: values.evidenceFile.name,
      });
      appAlert.success(`Đã gửi yêu cầu thu hồi ${values.certId}`, { description: res.message });
      setWaitFromHeight(nodeInfo?.height ?? 0);
    } catch (err: unknown) {
      appAlert.error('Gửi yêu cầu thu hồi thất bại', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleApproveRevoke = async (certId: string) => {
    setApprovingId(certId);
    try {
      const res = await approveRevokeCertificate(nodeUrl, certId);
      appAlert.success(`Đã ký chấp thuận thu hồi ${certId}`, { description: res.message });
      setWaitFromHeight(nodeInfo?.height ?? 0);
    } catch (err: unknown) {
      appAlert.error('Không thể phê duyệt thu hồi', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApprovingId(null);
    }
  };

  const selectedPdf = issueForm.watch('pdfFile');
  const selectedEvidence = revokeForm.watch('evidenceFile');
  const canIssue = !!nodeInfo?.isIssuer && !offline;
  const revocableOwnCerts = issuedCerts.filter((c) => c.status === 'valid' && !c.revokeRequest);
  const actionableRequests = revokeRequests.filter(
    (r) => r.requester !== schoolIdx && !r.approvals.includes(schoolIdx)
  ).length;

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
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Node #{schoolIdx + 1} · {nodeUrl.replace(/^https?:\/\//, '')}</span>
            </Badge>
            {nodeInfo && (
              <Badge variant={!nodeInfo.valid ? 'destructive' : nodeInfo.isIssuer ? 'success' : 'warning'}>
                {!nodeInfo.valid
                  ? 'Chain không hợp lệ'
                  : nodeInfo.isIssuer
                  ? `Có quyền phát hành · Block #${nodeInfo.height}`
                  : `Chưa được Bộ cấp quyền · Block #${nodeInfo.height}`}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900">
            Hội đồng Văn bằng — {schoolName}
          </h1>
          <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed max-w-3xl">
            Tài khoản này chỉ được phép thao tác trên máy chủ của <b>{schoolName}</b>, ký giao dịch bằng khóa bí mật ECDSA riêng của trường.
          </p>
        </div>

        <Button variant="outline" className="self-start sm:self-auto" onClick={loadAll}>
          <RefreshCw className="h-4 w-4" />
          <span>Đồng bộ</span>
        </Button>
      </motion.div>

      <BlockWaitBanner
        active={waitingBlock}
        onComplete={() => {
          loadAll();
          window.setTimeout(() => setWaitFromHeight(null), 800);
        }}
      />

      {/* Main Tabs (Responsive: xếp chồng gọn trên Mobile < 640px, nằm ngang trên Tablet/Desktop) */}
      <Tabs defaultValue="issue" className="space-y-5">
        <TabsList className="grid w-full grid-cols-1 sm:w-auto sm:inline-flex h-auto p-1.5 gap-1">
          <TabsTrigger value="issue" className="justify-center">
            <FilePlus2 className="h-4 w-4 shrink-0" />
            <span>Cấp văn bằng mới</span>
          </TabsTrigger>
          <TabsTrigger value="revoke" className="justify-center">
            <FileWarning className="h-4 w-4 shrink-0" />
            <span>Thu hồi & Phê duyệt 2/3</span>
            {revokeRequests.length > 0 && (
              <Badge variant={actionableRequests > 0 ? 'destructive' : 'secondary'} className="ml-1 px-2 py-0">
                {revokeRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="justify-center">
            <BookOpenCheck className="h-4 w-4 shrink-0" />
            <span>Đã cấp ({issuedCerts.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ISSUE CERTIFICATE */}
        <TabsContent value="issue">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Phát hành Văn bằng lên Blockchain</CardTitle>
                <CardDescription className="text-sm">
                  Tệp PDF chỉ dùng để tính mã băm <code className="font-mono">SHA-256</code>, không lưu tệp gốc lên chuỗi khối. Mã sinh viên được băm kèm muối bí mật để bảo vệ thông tin cá nhân.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...issueForm}>
                  <form onSubmit={issueForm.handleSubmit(onIssueSubmit)} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={issueForm.control}
                        name="certId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Số hiệu / Mã văn bằng</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={defaultCertCode}
                                className="font-mono"
                                disabled={!canIssue}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={issueForm.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mã sinh viên thụ hưởng</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="SV001"
                                className="font-mono"
                                disabled={!canIssue}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={issueForm.control}
                      name="pdfFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tệp PDF Văn bằng gốc</FormLabel>
                          <FormControl>
                            <div>
                              <input
                                ref={issueFileRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                className="hidden"
                                disabled={!canIssue}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) field.onChange(f);
                                }}
                              />
                              <div
                                onClick={() => canIssue && issueFileRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (!canIssue) return;
                                  const f = e.dataTransfer.files?.[0];
                                  if (f) field.onChange(f);
                                }}
                                className={`rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center transition-colors ${
                                  !canIssue
                                    ? 'cursor-not-allowed border-zinc-200 bg-zinc-100/70 opacity-60'
                                    : 'cursor-pointer border-zinc-200 bg-zinc-50/70 hover:border-[#0071E3] hover:bg-sky-50/30'
                                }`}
                              >
                                {selectedPdf ? (
                                  <div className="flex items-center justify-center gap-3.5 text-left">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0071E3] text-white shrink-0">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[15px] font-semibold text-zinc-900 truncate">{selectedPdf.name}</p>
                                      <p className="text-xs text-zinc-500 mt-0.5">
                                        {formatBytes(selectedPdf.size)} · Nhấn để chọn tệp khác
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <UploadCloud className="h-9 w-9 text-zinc-400 mx-auto" />
                                    <p className="text-sm sm:text-[15px] font-medium text-zinc-700">
                                      Kéo thả tệp PDF vào đây hoặc nhấn để chọn tệp
                                    </p>
                                    <p className="text-xs text-zinc-500">Định dạng .PDF · Dung lượng tối đa 10 MB</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      variant="appleBlue"
                      size="lg"
                      className="w-full"
                      disabled={!canIssue || issueForm.formState.isSubmitting}
                    >
                      {!canIssue ? (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>Chưa được Bộ GD&ĐT cấp quyền</span>
                        </>
                      ) : (
                        <>
                          <FilePlus2 className="h-4 w-4" />
                          <span>
                            {issueForm.formState.isSubmitting
                              ? 'Đang băm SHA-256 & ký số…'
                              : `Ký số & Ghi nhận bởi ${schoolName}`}
                          </span>
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Sample PDFs Helper Card */}
            <Card className="lg:col-span-5 bg-zinc-50/70">
              <CardHeader>
                <CardTitle className="text-base">Bộ tệp PDF Mẫu Kiểm thử</CardTitle>
                <CardDescription className="text-sm">
                  Tải các tệp mẫu sinh bởi <code className="font-mono">tools/make-pdf.js</code> về máy để thử nhanh quy trình cấp và thu hồi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { file: 'VB2026-001.pdf', label: 'VB2026-001.pdf', note: 'Nguyễn Văn An · SV001 · GPA 7.5' },
                  { file: 'VB2026-002.pdf', label: 'VB2026-002.pdf', note: 'Trần Thị Bình · SV002 · GPA 8.1' },
                  { file: 'VB2026-001-da-sua.pdf', label: 'VB2026-001-da-sua.pdf', note: 'Bản giả sửa GPA 7.5 → 9.5' },
                  { file: 'bien-ban-gian-lan.pdf', label: 'bien-ban-gian-lan.pdf', note: 'Biên bản mẫu đính kèm khi thu hồi' },
                ].map((item) => (
                  <a
                    key={item.file}
                    href={`/samples/${item.file}`}
                    download={item.file}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/85 bg-white p-3.5 transition-colors hover:border-[#0071E3]"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-zinc-900 truncate">{item.label}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{item.note}</div>
                    </div>
                    <Download className="h-4 w-4 text-[#0071E3] shrink-0" />
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: MULTI-SIG REVOCATION */}
        <TabsContent value="revoke" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Revoke Request Form */}
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Đề xuất Thu hồi Văn bằng của {schoolName}</CardTitle>
                <CardDescription className="text-sm">
                  Theo quy tắc phân quyền, <b>{schoolName}</b> chỉ được đề nghị thu hồi văn bằng do chính mình từng cấp, và cần ít nhất 1 trường thành viên khác đồng thuận (đạt 2/3).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revocableOwnCerts.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    <span className="text-xs font-medium text-zinc-500 block">
                      Chọn nhanh văn bằng hợp lệ của {schoolName}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {revocableOwnCerts.map((c) => (
                        <button
                          key={c.certId}
                          type="button"
                          onClick={() => revokeForm.setValue('certId', c.certId, { shouldValidate: true })}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-medium text-zinc-800 hover:border-[#0071E3] hover:text-[#0071E3] cursor-pointer"
                        >
                          {c.certId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Form {...revokeForm}>
                  <form onSubmit={revokeForm.handleSubmit(onRevokeSubmit)} className="space-y-4">
                    <FormField
                      control={revokeForm.control}
                      name="certId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mã văn bằng cần thu hồi</FormLabel>
                          <FormControl>
                            <Input placeholder="Ví dụ: VB2026-001" className="font-mono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={revokeForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lý do thu hồi chi tiết</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Nhập căn cứ pháp lý / biên bản kỷ luật..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={revokeForm.control}
                      name="evidenceFile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hồ sơ bằng chứng (Off-chain + Hash On-chain)</FormLabel>
                          <FormControl>
                            <div>
                              <input
                                ref={evidenceFileRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) field.onChange(f);
                                }}
                              />
                              <div
                                onClick={() => evidenceFileRef.current?.click()}
                                className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-center hover:border-red-400 transition-colors"
                              >
                                {selectedEvidence ? (
                                  <div className="text-sm">
                                    <p className="font-semibold text-zinc-900 truncate">{selectedEvidence.name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{formatBytes(selectedEvidence.size)}</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1 text-sm text-zinc-500">
                                    <UploadCloud className="h-6 w-6 mx-auto text-zinc-400" />
                                    <p>Chọn tệp PDF hoặc Ảnh biên bản (.pdf, .png, .jpg)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Tệp gốc lưu tại máy chủ {schoolName}, mã băm SHA-256 ghi bất biến lên chuỗi.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      variant="destructive"
                      size="lg"
                      className="w-full"
                      disabled={offline || revokeForm.formState.isSubmitting}
                    >
                      <FileWarning className="h-4 w-4" />
                      <span>
                        {revokeForm.formState.isSubmitting ? 'Đang tải bằng chứng & ký…' : 'Gửi Yêu cầu Thu hồi'}
                      </span>
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Pending Approvals Table */}
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Hội đồng Liên trường Bỏ phiếu Phê duyệt</CardTitle>
                <CardDescription className="text-sm">
                  Xem tệp biên bản bằng chứng do trường khác gửi lên và ký giao dịch{' '}
                  <code className="font-mono">REVOKE_APPROVE</code> nếu hợp lệ.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revokeRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center text-sm text-zinc-500">
                    Hiện không có yêu cầu thu hồi văn bằng nào đang chờ duyệt.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[108px]">Văn bằng</TableHead>
                        <TableHead>Trường yêu cầu, Lý do & Bằng chứng</TableHead>
                        <TableHead className="w-[96px]">Đồng thuận</TableHead>
                        <TableHead className="text-right w-[128px]">Quyết định</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revokeRequests.map((req) => {
                        const isRequester = req.requester === schoolIdx;
                        const alreadyApproved = req.approvals.includes(schoolIdx);
                        const evidenceLink = `${net.schools[req.requester]}/evidence/${req.evidenceHash}`;
                        return (
                          <TableRow key={req.certId}>
                            <TableCell className="font-mono font-semibold text-[13px] whitespace-nowrap align-top">
                              {req.certId}
                            </TableCell>
                            <TableCell className="align-top space-y-1.5">
                              <div className="font-medium text-zinc-900">
                                {SCHOOL_NAMES[req.requester] || req.issuerName}
                              </div>
                              <div className="text-[13px] text-zinc-600 leading-snug break-words">
                                {req.reason}
                              </div>
                              <div>
                                <a
                                  href={evidenceLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md border border-sky-200/80 bg-sky-50/70 px-2 py-0.5 text-xs font-medium text-[#0071E3] hover:bg-sky-100/70 transition-colors max-w-full"
                                >
                                  <FileText className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[200px]">{req.evidenceName}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap align-top">
                              <Badge variant="warning" className="font-mono tabular">
                                {1 + req.approvals.length}/{req.needed} trường
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap align-top">
                              {isRequester ? (
                                <span className="text-xs font-medium text-zinc-400">Chờ duyệt</span>
                              ) : alreadyApproved ? (
                                <Badge variant="success">Đã ký duyệt</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="appleBlue"
                                  disabled={approvingId === req.certId}
                                  onClick={() => handleApproveRevoke(req.certId)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Chấp nhận</span>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: ISSUED CERTIFICATES LEDGER */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách Văn bằng Đã Cấp bởi {schoolName}</CardTitle>
              <CardDescription className="text-sm">
                Chỉ liệt kê các văn bằng được ký phát hành bởi khóa riêng của <b>{schoolName}</b>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issuedCerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 py-14 text-center text-sm text-zinc-500">
                  {schoolName} chưa phát hành văn bằng nào trên chuỗi khối.
                </div>
              ) : (
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã văn bằng</TableHead>
                      <TableHead>Mã băm PDF (SHA-256)</TableHead>
                      <TableHead>Thời gian cấp</TableHead>
                      <TableHead>Block</TableHead>
                      <TableHead>Trạng thái hiệu lực</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuedCerts.map((c) => (
                      <TableRow key={c.certId}>
                        <TableCell className="font-mono font-semibold text-zinc-900 whitespace-nowrap">
                          {c.certId}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <code className="text-[13px] font-mono text-zinc-600">
                              {shortHash(c.docHash, 10, 10)}
                            </code>
                            {c.docHash && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(c.docHash!);
                                  appAlert.success('Đã sao chép mã băm PDF');
                                }}
                                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm tabular text-zinc-600 whitespace-nowrap">
                          {formatDateTime(c.issuedAt)}
                        </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          #{c.blockIndex}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {c.status === 'revoked' ? (
                            <Badge variant="destructive">Đã thu hồi</Badge>
                          ) : c.revokeRequest ? (
                            <Badge variant="warning">Chờ duyệt thu hồi</Badge>
                          ) : (
                            <Badge variant="success">Hợp lệ</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
