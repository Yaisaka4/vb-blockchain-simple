import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  UploadCloud,
  Search,
  FileText,
  Download,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import {
  lookupCertAcrossNodes,
  verifyPdfAcrossNodes,
  type CertificateRecord,
} from '@/lib/api';
import {
  verifyCodeSchema,
  verifyPdfSchema,
  type VerifyCodeFormValues,
} from '@/lib/schemas';
import { fileToBase64, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CertificateResultCard } from '@/components/shared/CertificateResultCard';

export const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sharedCertId = searchParams.get('cert');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [verifyingPdf, setVerifyingPdf] = useState(false);

  const [activeResult, setActiveResult] = useState<{
    mode: 'pdf' | 'code';
    record: CertificateRecord;
    nodeLabel: string;
  } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const codeForm = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { certId: sharedCertId || '' },
    mode: 'onChange',
  });

  const runCodeLookup = useCallback(async (certId: string) => {
    setLookingUp(true);
    try {
      const { data, nodeLabel } = await lookupCertAcrossNodes(certId);
      setActiveResult({ mode: 'code', record: data, nodeLabel });
    } catch (err: unknown) {
      appAlert.error('Tra cứu thất bại', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLookingUp(false);
    }
  }, []);

  useEffect(() => {
    if (sharedCertId) {
      codeForm.setValue('certId', sharedCertId);
      runCodeLookup(sharedCertId);
      appAlert.info(`Đã mở từ mã QR văn bằng ${sharedCertId}`, {
        id: 'verify-qr-shared',
        description: 'Hãy tải thêm tệp PDF gốc của ứng viên vào khung Cách 1 để đối chiếu mã băm SHA-256.',
        durationMs: 7000,
      });
    }
    return () => appAlert.dismiss('verify-qr-shared');
  }, [sharedCertId, codeForm, runCodeLookup]);

  const handleFileVerify = async (file: File) => {
    setPdfError(null);
    const parsed = verifyPdfSchema.safeParse({ pdfFile: file });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Tệp không hợp lệ';
      setPdfError(msg);
      appAlert.error('Tệp tải lên không hợp lệ', { description: msg });
      return;
    }

    setSelectedFile(file);
    setVerifyingPdf(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, nodeLabel } = await verifyPdfAcrossNodes(base64);
      setActiveResult({ mode: 'pdf', record: data, nodeLabel });
    } catch (err: unknown) {
      appAlert.error('Không thể xác minh tệp PDF', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setVerifyingPdf(false);
    }
  };

  const onCodeSubmit = (values: VerifyCodeFormValues) => {
    runCodeLookup(values.certId);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-10 space-y-7">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Cổng Xác minh Mở · Không cần đăng nhập</span>
          </Badge>
          <Badge variant="success">Tự động dự phòng qua Backup VPS (:3100)</Badge>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900">
          Xác minh Văn bằng trực tuyến
        </h1>
        <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed max-w-3xl">
          Dành cho Nhà tuyển dụng và Đơn vị đối tác: kiểm tra trực tiếp văn bằng trên mạng Blockchain mà không cần liên hệ lại trường cấp.
        </p>
      </motion.div>

      {/* Symmetrical 2-Column Verification Input Cards */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        {/* Left: Primary PDF Cryptographic Verification */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#0071E3] shrink-0" />
              <span>Cách 1: Xác minh bằng Tệp PDF Gốc</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Băm toàn bộ tệp PDF bằng <code className="font-mono">SHA-256</code> và đối chiếu trực tiếp trên Blockchain. Phát hiện ngay cả khi tệp bị sửa chỉ 1 ký tự.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileVerify(f);
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileVerify(f);
              }}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                pdfError
                  ? 'border-red-300 bg-red-50/40'
                  : 'border-zinc-200 bg-zinc-50/70 hover:border-[#0071E3] hover:bg-sky-50/30'
              }`}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0071E3] text-white shadow-sm">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-[15px] font-semibold text-zinc-900 break-all">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(selectedFile.size)} ·{' '}
                    {verifyingPdf ? 'Đang băm SHA-256 & đối chiếu…' : 'Nhấn hoặc kéo thả để kiểm tra tệp khác'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="h-10 w-10 text-zinc-400 mx-auto" />
                  <p className="text-sm sm:text-[15px] font-semibold text-zinc-800">
                    Kéo thả tệp PDF văn bằng vào đây
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-500">
                    Hoặc nhấn để chọn tệp (.PDF · Tối đa 10 MB)
                  </p>
                </div>
              )}
            </div>

            {pdfError && <p className="text-[13px] font-medium text-red-600">{pdfError}</p>}

            {/* Sample Test Files */}
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/85 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-zinc-600 font-medium">Tệp PDF mẫu thử nhanh:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { file: 'VB2026-001.pdf', tag: 'Bản gốc hợp lệ' },
                  { file: 'VB2026-001-da-sua.pdf', tag: 'Bản bị sửa điểm' },
                  { file: 'GHOST-001.pdf', tag: 'Bằng giả (Chưa cấp phép)' },
                ].map((s) => (
                  <a
                    key={s.file}
                    href={`/samples/${s.file}`}
                    download={s.file}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:border-[#0071E3] hover:text-[#0071E3] whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.tag}</span>
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Quick Code Lookup */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-zinc-800 shrink-0" />
              <span>Cách 2: Tra cứu theo Số hiệu Văn bằng</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Kiểm tra nhanh trạng thái hiệu lực, đơn vị cấp phát và lịch sử thu hồi dựa trên mã văn bằng (hoặc tự động từ mã QR).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Form {...codeForm}>
              <form
                onSubmit={codeForm.handleSubmit(onCodeSubmit)}
                className="flex-1 flex flex-col justify-between gap-5"
              >
                <FormField
                  control={codeForm.control}
                  name="certId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số hiệu / Mã văn bằng</FormLabel>
                      <FormControl>
                        <Input placeholder="Ví dụ: VB2026-001" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lưu ý: Tra cứu theo mã chỉ xác nhận tình trạng hiệu lực. Hãy kết hợp Cách 1 để đảm bảo nội dung tệp PDF không bị làm giả.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" variant="default" className="w-full" disabled={lookingUp}>
                  <Search className="h-4 w-4" />
                  <span>{lookingUp ? 'Đang tra cứu trên Blockchain…' : 'Tra cứu Trạng thái Văn bằng'}</span>
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Full-Width Verification Result Section */}
      {activeResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-semibold text-zinc-700">
              Kết quả đối chiếu ({activeResult.mode === 'pdf' ? 'Xác minh tệp PDF SHA-256' : 'Tra cứu theo mã hiệu'}):
            </span>
          </div>
          <CertificateResultCard
            record={activeResult.record}
            answeredByLabel={activeResult.nodeLabel}
            mode={activeResult.mode}
          />
        </div>
      )}
    </div>
  );
};
