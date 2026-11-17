import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Landmark,
  GraduationCap,
  UserCheck,
  ArrowRight,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { appAlert } from '@/lib/notify';
import { loginSchema, type LoginFormValues } from '@/lib/schemas';
import { getDashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface DemoAccount {
  username: string;
  label: string;
  roleTag: string;
  desc: string;
  icon: React.ElementType;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'bo.gddt',
    label: 'Bộ Giáo dục & Đào tạo',
    roleTag: 'Quản trị',
    desc: 'Cấp hoặc thu hồi quyền phát hành của các trường',
    icon: Landmark,
  },
  {
    username: 'daihoc.a',
    label: 'Đại học A',
    roleTag: 'Node 1',
    desc: 'Cấp văn bằng & đề xuất thu hồi trên Node 1',
    icon: GraduationCap,
  },
  {
    username: 'daihoc.b',
    label: 'Đại học B',
    roleTag: 'Node 2',
    desc: 'Cấp văn bằng & bỏ phiếu duyệt thu hồi 2/3',
    icon: GraduationCap,
  },
  {
    username: 'daihoc.c',
    label: 'Đại học C',
    roleTag: 'Node 3',
    desc: 'Cấp văn bằng & bỏ phiếu duyệt thu hồi 2/3',
    icon: GraduationCap,
  },
  {
    username: 'sv001',
    label: 'Nguyễn Văn An',
    roleTag: 'SV001',
    desc: 'Xem văn bằng cá nhân SV001 & tạo mã QR',
    icon: UserCheck,
  },
  {
    username: 'sv002',
    label: 'Trần Thị Bình',
    roleTag: 'SV002',
    desc: 'Xem văn bằng cá nhân SV002 & tạo mã QR',
    icon: UserCheck,
  },
];

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const suggestedRole = searchParams.get('role');
  const fromParam = searchParams.get('from');

  const defaultUsername =
    suggestedRole === 'ministry'
      ? 'bo.gddt'
      : suggestedRole === 'student'
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
      const target = fromParam ? decodeURIComponent(fromParam) : getDashboardPathForRole(user.role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, fromParam, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const loggedUser = await login(values.username, values.password, values.shortLived);
      appAlert.success(`Xin chào, ${loggedUser.displayName}`, {
        description: values.shortLived
          ? 'Đã cấp JWT (Demo 20s — tự động xoay vòng Refresh Token).'
          : 'Xác thực JWT Access Token & Refresh Token thành công.',
      });
      const destination = getDashboardPathForRole(loggedUser.role);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      appAlert.error('Đăng nhập thất bại', {
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra lại thông tin tài khoản.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectDemoAccount = (username: string) => {
    form.setValue('username', username, { shouldValidate: true });
    form.setValue('password', 'Password@123', { shouldValidate: true });
  };

  const selectedUsername = form.watch('username');

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left: Login Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="lg:col-span-6"
        >
          <Card className="p-0 sm:p-2">
            <CardHeader className="space-y-3.5 pb-4">
              <div>
                <img
                  src="/logo.png"
                  alt="EduChain"
                  className="h-9 sm:h-10 w-auto object-contain select-none"
                />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Đăng nhập Hệ thống</CardTitle>
                <CardDescription className="text-sm sm:text-[15px] mt-1.5">
                  Hệ thống cấp phát cặp <b>Access Token</b> & <b>Refresh Token</b> và tự động định tuyến bạn vào đúng không gian phân quyền.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tài khoản định danh / Mã sinh viên</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ví dụ: bo.gddt, daihoc.a, sv001..."
                            autoComplete="username"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Hỗ trợ mọi mã sinh viên bắt đầu bằng <code className="font-mono text-zinc-700">sv...</code> (ví dụ <code className="font-mono text-zinc-700">sv001</code>, <code className="font-mono text-zinc-700">sv003</code>).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Nhập mật khẩu..."
                              autoComplete="current-password"
                              className="pr-11"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      <FormItem className="flex flex-row items-center justify-between gap-3 rounded-xl border border-zinc-200/85 bg-zinc-50/90 p-3.5 sm:p-4 space-y-0">
                        <div className="space-y-1 min-w-0">
                          <FormLabel className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
                            <KeyRound className="h-4 w-4 text-zinc-800 shrink-0" />
                            <span>Demo Refresh Token nhanh (20 giây)</span>
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Rút ngắn hạn Access Token còn 20s để quan sát tự động gọi <code className="font-mono">/auth/refresh</code>.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch className="shrink-0" checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    className="w-full"
                    disabled={submitting}
                  >
                    <span>{submitting ? 'Đang xác thực JWT…' : 'Đăng nhập vào Hệ thống'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: 1-Click Demo Role Selector */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="lg:col-span-6 space-y-4"
        >
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-800 shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
                Chọn nhanh Tài khoản Demo theo Phân quyền
              </h2>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Chọn một vai trò bên dưới để điền sẵn tài khoản (mật khẩu chung:{' '}
              <code className="font-mono font-medium text-zinc-800">Password@123</code>).
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const active = selectedUsername.trim().toLowerCase() === acc.username;
              return (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => selectDemoAccount(acc.username)}
                  className={`text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-zinc-900 bg-zinc-100/70 ring-2 ring-zinc-900/10 shadow-apple'
                      : 'border-zinc-200/85 bg-white hover:border-zinc-300 shadow-apple-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                        active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant={active ? 'default' : 'secondary'}>{acc.roleTag}</Badge>
                  </div>
                  <div className="font-semibold text-[15px] text-zinc-900">{acc.label}</div>
                  <div className="text-[13px] text-zinc-500 mt-1 leading-snug">{acc.desc}</div>
                  <div className="font-mono text-xs text-zinc-400 mt-2.5">@{acc.username}</div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
