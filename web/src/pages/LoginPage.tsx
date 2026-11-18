import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Landmark,
  GraduationCap,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Lock,
  User,
  Loader2,
} from 'lucide-react';
import SpecularButton from '@/components/SpecularButton';
import { appAlert } from '@/lib/notify';
import { loginSchema, type LoginFormValues } from '@/lib/schemas';
import { getDashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface DemoAccount {
  username: string;
  label: string;
  icon: React.ElementType;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'bo.gddt', label: 'Bộ GD&ĐT', icon: Landmark },
  { username: 'daihoc.a', label: 'Đại học A', icon: GraduationCap },
  { username: 'daihoc.b', label: 'Đại học B', icon: GraduationCap },
  { username: 'daihoc.c', label: 'Đại học C', icon: GraduationCap },
  { username: 'sv001', label: 'SV001 · Văn An', icon: UserCheck },
  { username: 'sv002', label: 'SV002 · Thị Bình', icon: UserCheck },
];

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const suggestedRole = searchParams.get('role');
  const fromParam = searchParams.get('from');
  const decodedFrom = fromParam ? decodeURIComponent(fromParam) : null;

  const inferredRole =
    suggestedRole ||
    (decodedFrom?.startsWith('/ministry')
      ? 'ministry'
      : decodedFrom?.startsWith('/student')
      ? 'student'
      : decodedFrom?.startsWith('/university')
      ? 'university'
      : null);

  const defaultUsername =
    inferredRole === 'ministry'
      ? 'bo.gddt'
      : inferredRole === 'student'
      ? 'sv001'
      : 'daihoc.a';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: defaultUsername,
      password: 'Password@123',
      shortLived: false,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.setValue('username', defaultUsername, { shouldValidate: true });
  }, [defaultUsername, form]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const target =
        decodedFrom && decodedFrom.startsWith('/')
          ? decodedFrom
          : getDashboardPathForRole(user.role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, decodedFrom, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const loggedUser = await login(values.username, values.password, values.shortLived);
      appAlert.success(`Xin chào, ${loggedUser.displayName}`, {
        description: values.shortLived
          ? 'Đã cấp JWT (Demo 20s — tự động xoay vòng Refresh Token).'
          : 'Xác thực JWT Access Token & Refresh Token thành công.',
      });
      const destination =
        decodedFrom && decodedFrom.startsWith('/')
          ? decodedFrom
          : getDashboardPathForRole(loggedUser.role);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      appAlert.error('Đăng nhập thất bại', {
        description:
          err instanceof Error ? err.message : 'Vui lòng kiểm tra lại thông tin tài khoản.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectDemoAccount = (username: string) => {
    form.setValue('username', username, { shouldValidate: true });
    form.setValue('password', 'Password@123', { shouldValidate: true });
  };

  const normalizedUsername = (form.watch('username') || '').trim().toLowerCase();

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[940px] overflow-hidden rounded-[26px] border border-zinc-200/85 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.03)] grid md:grid-cols-12"
      >
        {/* Cột trái: Tinh gọn thương hiệu */}
        <div className="relative overflow-hidden bg-[#111113] text-white p-6 sm:p-8 md:col-span-5 flex flex-col justify-between gap-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 24px 24px',
            }}
          />

          {/* Logo */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm transition-transform duration-200 group-hover:scale-[1.04]">
                <img
                  src="/logo-mark.png"
                  alt="EduChain"
                  className="h-full w-full object-contain select-none"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">EduChain</span>
            </Link>
          </div>

          {/* Thông điệp ngắn gọn */}
          <div className="relative z-10 space-y-3 my-auto">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-[-0.025em] leading-[1.22] text-white">
              Hệ thống Quản lý
              <span className="block text-zinc-400 font-medium mt-1">
                Văn bằng Blockchain.
              </span>
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Cổng xác thực định danh tập trung dành cho Bộ GD&ĐT, các Trường Đại học và Sinh viên.
            </p>
          </div>

          {/* Chân cột trái đúng 1 dòng theo yêu cầu */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-xs sm:text-[13px] font-medium text-zinc-400">
            Nhóm 9 - BlockChain quản lý văn bằng
          </div>
        </div>

        {/* Cột phải: Form đăng nhập gọn gàng vừa khít 100vh */}
        <div className="bg-white p-6 sm:p-8 md:col-span-7 flex flex-col justify-center">
          <div className="space-y-5">
            {/* Header + Nút về trang chủ */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                  Đăng nhập
                </h2>
                <p className="text-xs sm:text-[13px] text-zinc-500 mt-0.5">
                  Nhập thông tin tài khoản hoặc chọn nhanh vai trò bên dưới.
                </p>
              </div>
              <Link
                to="/"
                className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-50/80 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-950 shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>Trang chủ</span>
              </Link>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-medium text-zinc-800">
                        Tài khoản / Mã sinh viên
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <Input
                            placeholder="bo.gddt, daihoc.a, sv001..."
                            autoComplete="username"
                            className="h-10 pl-10 text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[13px] font-medium text-zinc-800">
                        Mật khẩu
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu..."
                            autoComplete="current-password"
                            className="h-10 pl-10 pr-10 text-sm"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortLived"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-2 space-y-0">
                      <FormLabel className="text-[13px] font-medium text-zinc-700 flex items-center gap-2 cursor-pointer">
                        <KeyRound className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>Demo xoay vòng JWT nhanh (20 giây)</span>
                      </FormLabel>
                      <FormControl>
                        <Switch
                          className="shrink-0"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="pt-0.5">
                  <SpecularButton
                    type="submit"
                    size="md"
                    radius={12}
                    tint="#111113"
                    tintOpacity={0.96}
                    textColor="#ffffff"
                    lineColor="#ffffff"
                    baseColor="#52525b"
                    thickness={1.3}
                    idleIntensity={0.45}
                    intensity={1.05}
                    glow={0.85}
                    autoAnimate={true}
                    speed={0.22}
                    disabled={submitting}
                    className="w-full h-11 text-sm font-semibold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>Đang đăng nhập…</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng nhập</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </>
                    )}
                  </SpecularButton>
                </div>
              </form>
            </Form>

            {/* Chọn nhanh tài khoản Demo tinh gọn */}
            <div className="space-y-2 pt-1 border-t border-zinc-100">
              <div className="flex items-center justify-between text-[11.5px] text-zinc-500">
                <span className="font-medium">Tài khoản Demo nhanh</span>
                <span className="font-mono text-zinc-400">Password@123</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const active = normalizedUsername === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => selectDemoAccount(acc.username)}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all cursor-pointer ${
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-apple-sm'
                          : 'border-zinc-200/80 bg-zinc-50/60 text-zinc-700 hover:border-zinc-300 hover:bg-white'
                      }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active ? 'text-white' : 'text-zinc-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight truncate">
                          {acc.label}
                        </div>
                        <div
                          className={`font-mono text-[10.5px] leading-tight truncate ${
                            active ? 'text-zinc-300' : 'text-zinc-400'
                          }`}
                        >
                          @{acc.username}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
