import { z } from 'zod';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const isEvidenceFile = (file: File) => {
  const lower = file.name.toLowerCase();
  return (
    file.type === 'application/pdf' ||
    file.type === 'image/png' ||
    file.type === 'image/jpeg' ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  );
};

// 1. Đăng nhập hệ thống
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Tên đăng nhập cần tối thiểu 2 ký tự')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9._@-]+$/, 'Tên đăng nhập chỉ gồm chữ cái, số và các ký tự . _ @ -'),
  password: z
    .string()
    .min(6, 'Mật khẩu cần tối thiểu 6 ký tự')
    .max(100, 'Mật khẩu tối đa 100 ký tự'),
  shortLived: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// 2. Trường đại học cấp văn bằng mới (ISSUE)
export const issueCertSchema = z.object({
  certId: z
    .string()
    .trim()
    .min(3, 'Mã văn bằng cần tối thiểu 3 ký tự (ví dụ: VB2026-001)')
    .max(40, 'Mã văn bằng tối đa 40 ký tự')
    .regex(/^[A-Za-z0-9-_]+$/, 'Mã văn bằng chỉ được chứa chữ không dấu, số, dấu gạch ngang (-) hoặc gạch dưới (_)'),
  studentId: z
    .string()
    .trim()
    .min(3, 'Mã sinh viên cần tối thiểu 3 ký tự (ví dụ: SV001)')
    .max(30, 'Mã sinh viên tối đa 30 ký tự')
    .regex(/^[A-Za-z0-9-_]+$/, 'Mã sinh viên chỉ được chứa chữ không dấu, số, dấu - hoặc _'),
  pdfFile: z
    .custom<File>((val) => val instanceof File, { message: 'Vui lòng chọn tệp PDF văn bằng gốc' })
    .refine((file) => file.size > 0, 'Tệp PDF đang rỗng')
    .refine((file) => file.size <= MAX_FILE_BYTES, 'Dung lượng tệp PDF không vượt quá 10 MB')
    .refine(isPdfFile, 'Tệp tải lên bắt buộc có định dạng .pdf'),
});

export type IssueCertFormValues = z.infer<typeof issueCertSchema>;

// 3. Trường đại học gửi yêu cầu thu hồi văn bằng (REVOKE_REQUEST)
export const revokeCertSchema = z.object({
  certId: z
    .string()
    .trim()
    .min(3, 'Vui lòng nhập mã văn bằng cần thu hồi (tối thiểu 3 ký tự)')
    .max(40, 'Mã văn bằng tối đa 40 ký tự')
    .regex(/^[A-Za-z0-9-_]+$/, 'Mã văn bằng chỉ được chứa chữ không dấu, số, dấu - hoặc _'),
  reason: z
    .string()
    .trim()
    .min(10, 'Lý do thu hồi cần rõ ràng, tối thiểu 10 ký tự')
    .max(300, 'Lý do thu hồi tối đa 300 ký tự'),
  evidenceFile: z
    .custom<File>((val) => val instanceof File, { message: 'Bắt buộc đính kèm tệp bằng chứng (biên bản/quyết định)' })
    .refine((file) => file.size > 0, 'Tệp bằng chứng đang rỗng')
    .refine((file) => file.size <= MAX_FILE_BYTES, 'Dung lượng tệp bằng chứng không vượt quá 10 MB')
    .refine(isEvidenceFile, 'Chỉ chấp nhận tệp PDF hoặc hình ảnh (.pdf, .png, .jpg, .jpeg)'),
});

export type RevokeCertFormValues = z.infer<typeof revokeCertSchema>;

// 4. Nhà tuyển dụng tra cứu theo mã văn bằng
export const verifyCodeSchema = z.object({
  certId: z
    .string()
    .trim()
    .min(2, 'Vui lòng nhập mã văn bằng hợp lệ')
    .max(40, 'Mã văn bằng tối đa 40 ký tự')
    .regex(/^[A-Za-z0-9-_]+$/, 'Mã văn bằng chỉ chứa chữ cái, số, dấu - hoặc _'),
});

export type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>;

// 5. Nhà tuyển dụng tải tệp PDF để xác minh băm SHA-256
export const verifyPdfSchema = z.object({
  pdfFile: z
    .custom<File>((val) => val instanceof File, { message: 'Vui lòng chọn tệp PDF cần kiểm định' })
    .refine((file) => file.size > 0, 'Tệp PDF không hợp lệ (0 byte)')
    .refine((file) => file.size <= MAX_FILE_BYTES, 'Tệp PDF vượt quá giới hạn 10 MB')
    .refine(isPdfFile, 'Chỉ hỗ trợ xác minh tệp văn bằng định dạng PDF (.pdf)'),
});

export type VerifyPdfFormValues = z.infer<typeof verifyPdfSchema>;

// 6. Sinh viên tra cứu theo mã sinh viên
export const studentLookupSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, 'Mã sinh viên cần tối thiểu 3 ký tự (ví dụ: SV001)')
    .max(30, 'Mã sinh viên tối đa 30 ký tự')
    .regex(/^[A-Za-z0-9-_]+$/, 'Mã sinh viên chỉ chứa chữ cái không dấu, số, dấu - hoặc _'),
});

export type StudentLookupFormValues = z.infer<typeof studentLookupSchema>;
