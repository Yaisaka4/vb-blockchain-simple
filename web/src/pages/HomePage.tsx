import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Landmark,
  GraduationCap,
  UserCheck,
  Blocks,
  ArrowRight,
  Lock,
  Activity,
  FileCheck2,
  ArrowLeftRight,
} from 'lucide-react';
import SplitFlapText from '@/components/SplitFlapText';
import SpecularButton from '@/components/SpecularButton';
import { getDashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import { getAllNodes } from '@/lib/network';
import { getNodeInfo, type NodeInfo, type UserRole } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [nodeStates, setNodeStates] = useState<Array<{ label: string; info: NodeInfo | null }>>([]);

  useEffect(() => {
    let active = true;
    const loadNodes = async () => {
      const nodes = getAllNodes();
      const res = await Promise.all(
        nodes.map(async (n) => {
          try {
            const info = await getNodeInfo(n.url);
            return { label: n.shortLabel, info };
          } catch {
            return { label: n.shortLabel, info: null };
          }
        })
      );
      if (active) setNodeStates(res);
    };
    loadNodes();
    const timer = window.setInterval(loadNodes, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const onlineCount = nodeStates.filter((n) => n.info !== null).length;
  const totalNodes = nodeStates.length || 4;
  const maxHeight = Math.max(0, ...nodeStates.map((n) => n.info?.height ?? 0));

  const heroStatusTags = useMemo(
    () => [
      onlineCount > 0
        ? `${onlineCount}/${totalNodes} Node trực tuyến · Block #${maxHeight}`
        : 'Đang kết nối mạng Blockchain…',
      'Bảo mật SHA-256 · ECDSA 256k1',
      'Đồng thuận 2/3 · Chống sửa đổi',
    ],
    [onlineCount, totalNodes, maxHeight]
  );

  const handleRoleAction = async (
    requiredRole: UserRole | 'public',
    targetPath: string,
    loginHint?: string
  ) => {
    if (requiredRole === 'public') {
      navigate(targetPath);
      return;
    }
    if (!isAuthenticated || !user) {
      navigate(`/login?role=${loginHint || requiredRole}`);
      return;
    }
    if (user.role === requiredRole) {
      navigate(targetPath);
      return;
    }
    await logout();
    navigate(`/login?role=${loginHint || requiredRole}`);
  };

  const roles: Array<{
    title: string;
    subtitle: string;
    desc: string;
    icon: React.ElementType;
    requiredRole: UserRole | 'public';
    targetPath: string;
    loginHint?: string;
    badge: string;
    badgeVariant: 'default' | 'success' | 'secondary';
    accent: string;
  }> = [
    {
      title: 'Nhà tuyển dụng & Công chúng',
      subtitle: 'Truy cập Mở · Không yêu cầu tài khoản',
      desc: 'Xác minh tức thời tính toàn vẹn của tệp PDF văn bằng hoặc quét mã QR trực tiếp trên Blockchain.',
      icon: FileCheck2,
      requiredRole: 'public',
      targetPath: '/verify',
      badge: 'Công khai',
      badgeVariant: 'success',
      accent: 'bg-zinc-900 text-white',
    },
    {
      title: 'Cơ sở Đào tạo (Đại học A, B, C)',
      subtitle: 'Phân quyền theo từng Trường Đại học',
      desc: 'Ký số phát hành văn bằng mới (SHA-256 + ECDSA) trên đúng Node của trường và bỏ phiếu đa chữ ký 2/3 khi thu hồi.',
      icon: GraduationCap,
      requiredRole: 'university',
      targetPath: '/university',
      loginHint: 'university',
      badge: user?.role === 'university' ? user.displayName : 'Yêu cầu Đăng nhập',
      badgeVariant: user?.role === 'university' ? 'default' : 'secondary',
      accent: 'bg-zinc-100 text-zinc-900',
    },
    {
      title: 'Bộ Giáo dục và Đào tạo',
      subtitle: 'Cơ quan Quản lý Cấp quyền',
      desc: 'Xét duyệt, cấp hoặc gỡ quyền phát hành văn bằng của từng trường đại học bằng Khóa Admin.',
      icon: Landmark,
      requiredRole: 'ministry',
      targetPath: '/ministry',
      loginHint: 'ministry',
      badge: user?.role === 'ministry' ? 'Đang đăng nhập' : 'Khóa Admin',
      badgeVariant: user?.role === 'ministry' ? 'default' : 'secondary',
      accent: 'bg-zinc-100 text-zinc-900',
    },
    {
      title: 'Cổng Thông tin Sinh viên',
      subtitle: 'Bảo mật riêng tư theo Mã Sinh viên',
      desc: 'Chỉ truy xuất văn bằng thuộc về chính mã sinh viên đang đăng nhập và tạo mã QR chia sẻ cho nhà tuyển dụng.',
      icon: UserCheck,
      requiredRole: 'student',
      targetPath: '/student',
      loginHint: 'student',
      badge: user?.role === 'student' ? `${user.studentId}` : 'Cá nhân',
      badgeVariant: user?.role === 'student' ? 'default' : 'secondary',
      accent: 'bg-zinc-100 text-zinc-900',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 pt-8 sm:pt-12 pb-10 space-y-10 sm:space-y-12">
      {/* Apple Hero */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-5xl mx-auto space-y-5 sm:space-y-6"
      >
        <div className="flex justify-center">
          <SplitFlapText
            words={heroStatusTags}
            tileStyle="minimal"
            depth={0}
            textColor="#3f3f46"
            fontSize="clamp(12px, 3vw, 14px)"
            gap={1}
            padTo={30}
            align="center"
            flipDuration={0.075}
            stagger={0.018}
            flipsPerChar={4}
            cycleDelay={3000}
            charset="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#·-"
            className="educhain-flap"
          />
        </div>

        <h1 className="text-balance text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-[-0.028em] text-[#111113] leading-[1.18] sm:leading-[1.14]">
          <span className="block">Xác thực văn bằng số.</span>
          <span className="block mt-1 sm:mt-1.5">
            Minh bạch, bất biến trên Blockchain.
          </span>
        </h1>

        <p className="text-[15px] sm:text-[17px] text-zinc-600 leading-relaxed max-w-2xl mx-auto">
          Mỗi văn bằng được băm mật mã <span className="font-mono text-zinc-800">SHA-256</span>, ký số{' '}
          <span className="font-mono text-zinc-800">ECDSA secp256k1</span> và đối chiếu chéo giữa các trường đại học. Không một ai có thể chỉnh sửa lén lút.
        </p>

        {/* Specular Buttons đồng bộ tông màu Đen - Trắng của Logo EduChain */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 pt-2">
          <SpecularButton
            size="md"
            radius={999}
            tint="#111113"
            tintOpacity={0.96}
            textColor="#ffffff"
            lineColor="#ffffff"
            baseColor="#52525b"
            thickness={1.4}
            idleIntensity={0.45}
            intensity={1.1}
            glow={0.9}
            autoAnimate={true}
            speed={0.25}
            onClick={() => navigate('/verify')}
            className="w-full sm:w-auto text-[15px] font-semibold px-7 py-3.5"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Xác minh Văn bằng ngay</span>
          </SpecularButton>

          {isAuthenticated && user ? (
            <SpecularButton
              size="md"
              radius={999}
              tint="#ffffff"
              tintOpacity={0.92}
              blur={12}
              textColor="#111113"
              lineColor="#18181b"
              baseColor="#d4d4d8"
              thickness={1.2}
              idleIntensity={0.55}
              intensity={0.95}
              glow={0.3}
              onClick={() => navigate(getDashboardPathForRole(user.role))}
              className="w-full sm:w-auto text-[15px] font-medium px-7 py-3.5 shadow-apple-sm"
            >
              <span>Tiếp tục với {user.displayName}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </SpecularButton>
          ) : (
            <SpecularButton
              size="md"
              radius={999}
              tint="#ffffff"
              tintOpacity={0.92}
              blur={12}
              textColor="#111113"
              lineColor="#18181b"
              baseColor="#d4d4d8"
              thickness={1.2}
              idleIntensity={0.55}
              intensity={0.95}
              glow={0.3}
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-[15px] font-medium px-7 py-3.5 shadow-apple-sm"
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span>Đăng nhập Cổng Nghiệp vụ</span>
            </SpecularButton>
          )}
        </div>
      </motion.section>

      {/* Role Cards Grid */}
      <section className="grid gap-5 sm:gap-6 md:grid-cols-2">
        {roles.map((item, idx) => {
          const Icon = item.icon;
          const isCurrentRole =
            item.requiredRole !== 'public' && isAuthenticated && user?.role === item.requiredRole;
          const isOtherRoleWhenLoggedIn =
            item.requiredRole !== 'public' && isAuthenticated && user?.role !== item.requiredRole;

          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * idx, duration: 0.35 }}
            >
              <button
                type="button"
                onClick={() => handleRoleAction(item.requiredRole, item.targetPath, item.loginHint)}
                className="w-full text-left block h-full group cursor-pointer focus:outline-none"
              >
                <Card
                  className={`h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-apple-hover ${
                    isCurrentRole
                      ? 'border-zinc-900/50 ring-2 ring-zinc-900/10'
                      : 'group-hover:border-zinc-300/90'
                  }`}
                >
                  <CardContent className="p-5 sm:p-7 flex flex-col justify-between h-full space-y-5">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shrink-0 ${item.accent}`}>
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <Badge variant={item.badgeVariant}>{item.badge}</Badge>
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-[19px] font-semibold text-zinc-900">
                          {item.title}
                        </h2>
                        <p className="text-[13px] font-medium text-zinc-500 mt-0.5">{item.subtitle}</p>
                      </div>
                      <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 pt-1">
                      {isOtherRoleWhenLoggedIn ? (
                        <>
                          <ArrowLeftRight className="h-4 w-4 shrink-0" />
                          <span>Chuyển sang tài khoản vai trò này</span>
                        </>
                      ) : (
                        <>
                          <span>{isCurrentRole ? 'Mở bảng điều khiển của bạn' : 'Truy cập phân hệ'}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          );
        })}
      </section>

      {/* Live Network Pulse Strip */}
      <section className="rounded-2xl border border-zinc-200/85 bg-white/95 p-5 sm:p-6 shadow-apple flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-zinc-900">
              Trạng thái các Node trong Mạng Blockchain
            </h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              3 Trường Đại học luân phiên tạo Block (PoA) cùng 1 Node Backup dự phòng giữ bản sao chuỗi chung.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {nodeStates.map((n) => (
            <div
              key={n.label}
              className="flex items-center gap-2 rounded-full border border-zinc-200/85 bg-zinc-50 px-3 py-1.5 text-xs sm:text-[13px] whitespace-nowrap"
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  !n.info ? 'bg-zinc-300' : n.info.valid ? 'bg-emerald-500' : 'bg-red-500 animate-ping'
                }`}
              />
              <span className="font-medium text-zinc-800">{n.label}</span>
              <span className="font-mono text-zinc-500 tabular">
                {n.info ? `#${n.info.height}` : 'tắt'}
              </span>
            </div>
          ))}
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link to="/explorer">
              <Blocks className="h-4 w-4" />
              <span>Block Explorer</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};
