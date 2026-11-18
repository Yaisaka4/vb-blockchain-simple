import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  Blocks,
  LogIn,
  LogOut,
  KeyRound,
  RefreshCw,
  Landmark,
  GraduationCap,
  UserCheck,
  ChevronDown,
  Sparkles,
  ArrowLeftRight,
  Menu,
  X,
  Copy,
  Clock,
} from 'lucide-react';
import CursorGrid from '@/components/CursorGrid';
import { appAlert } from '@/lib/notify';
import { getDashboardPathForRole, useAuth } from '@/contexts/AuthContext';
import { decodeJwtPayload, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomRightDock } from '@/components/shared/BottomRightDock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    tokens,
    isAuthenticated,
    secondsUntilAccessExpiry,
    refreshCount,
    logout,
    refreshSession,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jwtDialogOpen, setJwtDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Đo vị trí cục bộ của tab đang active bên trong <nav> trên Desktop
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  // Đóng menu mobile & cuộn về đầu trang khi chuyển đường dẫn
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const isDown = window.scrollY > 20;
      setScrolled((prev) => (prev !== isDown ? isDown : prev));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    if (!isAuthenticated || !user) {
      return [
        { to: '/', label: 'Trang chủ', icon: Sparkles },
        { to: '/verify', label: 'Xác minh Văn bằng', icon: ShieldCheck },
        { to: '/explorer', label: 'Block Explorer', icon: Blocks },
      ];
    }
    if (user.role === 'ministry') {
      return [
        { to: '/ministry', label: 'Quản lý Trường ĐH', icon: Landmark },
        { to: '/explorer', label: 'Block Explorer', icon: Blocks },
        { to: '/verify', label: 'Xác minh Văn bằng', icon: ShieldCheck },
      ];
    }
    if (user.role === 'university') {
      return [
        { to: '/university', label: user.displayName, icon: GraduationCap },
        { to: '/explorer', label: 'Block Explorer', icon: Blocks },
        { to: '/verify', label: 'Xác minh Văn bằng', icon: ShieldCheck },
      ];
    }
    return [
      { to: '/student', label: 'Văn bằng của tôi', icon: UserCheck },
      { to: '/verify', label: 'Xác minh Văn bằng', icon: ShieldCheck },
    ];
  }, [isAuthenticated, user]);

  const activePath = useMemo(() => {
    const found = navItems.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    );
    return found?.to ?? null;
  }, [navItems, location.pathname]);

  const updatePill = useCallback(() => {
    if (!activePath || !navRef.current) {
      setPillStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    const el = itemRefs.current[activePath];
    if (!el || el.offsetWidth === 0) {
      setPillStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    setPillStyle({
      left: el.offsetLeft,
      width: el.offsetWidth,
      visible: true,
    });
  }, [activePath]);

  useLayoutEffect(() => {
    if (isLoginPage) return;
    updatePill();
  }, [updatePill, navItems, scrolled, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    const navEl = navRef.current;
    if (!navEl) return;
    const ro = new ResizeObserver(() => updatePill());
    ro.observe(navEl);
    Object.values(itemRefs.current).forEach((el) => {
      if (el) ro.observe(el);
    });
    window.addEventListener('resize', updatePill);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updatePill);
    };
  }, [updatePill, navItems, isLoginPage]);

  const formatCountdown = (sec: number | null) => {
    if (sec === null) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const accessPayload = decodeJwtPayload(tokens?.accessToken);
  const refreshPayload = decodeJwtPayload(tokens?.refreshToken);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip bg-[#F5F5F7] text-zinc-900">
      {/* Nền CursorGrid nhẹ nhàng chuẩn Apple */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CursorGrid
          lightMode={true}
          color="#0071E3"
          gridColor="#a1a1aa"
          cellSize={64}
          gridStyle="lines"
          lineWidth={1}
          gridOpacity={0.045}
          maxOpacity={0.16}
          fillOpacity={0.02}
          spotlight={0.2}
          radius={150}
          holdTime={220}
          fadeDuration={950}
          ambient={0.035}
          clickPulse={false}
          edgeFade={0.28}
          intro={true}
        />
      </div>

      {!isLoginPage && (
        <>
          {/* Khoảng đệm cố định giữ luồng trang không bị giật */}
          <div className="h-[64px] md:h-[68px] shrink-0" />

          {/* Thanh Điều Hướng: Đính Top -> Thu thành Khối nổi (Floating Island) khi cuộn xuống */}
          <header
            className={`fixed inset-x-0 top-0 z-50 pointer-events-none transition-all duration-300 ease-apple ${
              scrolled ? 'pt-2.5 px-3 sm:px-6' : 'pt-0 px-0'
            }`}
          >
        <div
          className={`pointer-events-auto mx-auto transition-all duration-300 ease-apple ${
            scrolled
              ? 'max-w-5xl h-[56px] md:h-[58px] rounded-2xl md:rounded-full border border-zinc-200/90 bg-white/90 backdrop-blur-2xl px-3.5 sm:px-5 shadow-[0_10px_32px_-6px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.04)]'
              : 'max-w-full h-[64px] md:h-[68px] rounded-none border-b border-zinc-200/75 bg-white/82 backdrop-blur-xl px-4 sm:px-8 shadow-none'
          }`}
        >
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-2 sm:gap-3">
            {/* Thương hiệu EduChain */}
            <Link to="/" className="flex items-center group shrink-0">
              <img
                src="/logo.png"
                alt="EduChain"
                className="h-7 sm:h-8 md:h-[34px] w-auto object-contain select-none transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </Link>

            {/* Cụm Tab Điều hướng Desktop (ẩn trên Mobile < 768px để không bao giờ bị tràn khung) */}
            <nav
              ref={navRef}
              className="hidden md:flex relative items-center gap-0.5 rounded-full bg-zinc-200/65 p-1"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white shadow-apple-sm transition-[transform,width,opacity] duration-300 ease-apple"
                style={{
                  transform: `translate3d(${pillStyle.left}px, 0, 0)`,
                  width: `${pillStyle.width}px`,
                  opacity: pillStyle.visible ? 1 : 0,
                }}
              />
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.to === activePath;
                return (
                  <Link
                    key={item.to}
                    ref={(el) => {
                      itemRefs.current[item.to] = el;
                    }}
                    to={item.to}
                    className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 lg:px-4 py-1.5 text-[13px] lg:text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                      active ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Khu vực Tài khoản & Nút mở Menu trên Mobile */}
            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white pl-2 lg:pl-3.5 pr-2 py-1 text-left shadow-apple-sm transition-all hover:border-zinc-300 focus:outline-none cursor-pointer"
                    >
                      <div className="hidden lg:block">
                        <span className="block text-[13px] font-semibold text-zinc-900 leading-tight max-w-[140px] truncate">
                          {user.displayName}
                        </span>
                        <span className="block text-xs text-zinc-500 font-mono tabular leading-tight">
                          JWT {formatCountdown(secondsUntilAccessExpiry)}
                        </span>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white shrink-0">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="space-y-1 py-2">
                      <div className="text-sm font-semibold text-zinc-900">{user.displayName}</div>
                      <div className="text-xs font-normal text-zinc-500">
                        {user.subtitle || `@${user.username}`}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(getDashboardPathForRole(user.role))}>
                      <Sparkles className="text-[#0071E3]" />
                      <span>Bảng điều khiển của tôi</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setJwtDialogOpen(true)}>
                      <KeyRound className="text-emerald-600" />
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <span>Phiên JWT & Refresh</span>
                        <Badge variant="secondary" className="px-2 py-0 font-mono tabular">
                          {formatCountdown(secondsUntilAccessExpiry)}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <ArrowLeftRight className="text-zinc-600" />
                      <span>Đổi tài khoản / Vai trò khác</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <LogOut />
                      <span>Đăng xuất</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="rounded-full px-3.5 sm:px-4">
                  <Link to="/login">
                    <LogIn className="h-4 w-4" />
                    <span>Đăng nhập</span>
                  </Link>
                </Button>
              )}

              {/* Nút Hamburger cho Mobile (< 768px) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Mở trình đơn điều hướng"
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-800 shadow-apple-sm active:scale-95 transition-transform cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Ngăn kéo Điều hướng Kính mờ trên Mobile */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto md:hidden mx-3 mt-2 rounded-2xl border border-zinc-200/90 bg-white/95 p-2 shadow-apple-hover backdrop-blur-2xl"
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.to === activePath;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-zinc-900 text-white shadow-apple-sm'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {isAuthenticated && user && (
                <div className="mt-2 border-t border-zinc-200/75 pt-2 flex items-center justify-between px-3 py-1.5 text-xs text-zinc-500">
                  <span className="truncate font-medium text-zinc-700">{user.displayName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setJwtDialogOpen(true);
                    }}
                    className="font-mono text-[#0071E3] font-medium shrink-0"
                  >
                    JWT {formatCountdown(secondsUntilAccessExpiry)}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </header>
        </>
      )}

      {/* Nội dung trang */}
      <main className="relative z-10 flex-1">{children}</main>

      {/* Cụm góc phải dưới: Nút Scroll-to-Top + Danh sách Alert shadcn/ui toàn ứng dụng */}
      <BottomRightDock />

      {/* Footer tối giản */}
      {!isLoginPage && (
        <footer className="relative z-10 border-t border-zinc-200/75 bg-white/70 backdrop-blur-md py-5 mt-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 text-center text-sm font-medium text-zinc-600">
            Nhóm 9 - BlockChain quản lý văn bằng
          </div>
        </footer>
      )}

      {/* Hộp thoại Kiểm tra Phiên JWT & Xoay vòng Refresh Token (Chuẩn Apple Inspector) */}
      <Dialog open={jwtDialogOpen} onOpenChange={setJwtDialogOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 flex flex-col max-h-[86vh]">
          {/* Header cố định */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0 pr-12">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-[#0071E3] shrink-0">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-[17px] font-semibold text-zinc-900">
                  Phiên xác thực JWT
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                  Cơ chế Access Token ngắn hạn kết hợp Refresh Token Rotation
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Phần thân cuộn bên trong viền bo tròn (thanh cuộn mảnh nằm gọn bên trong) */}
          <div className="flex-1 overflow-y-auto thin-scrollbar px-6 py-4 space-y-4 text-sm">
            {/* 3 Thẻ chỉ số gọn gàng */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
                <span className="text-[11.5px] font-medium text-zinc-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#0071E3]" /> Còn hiệu lực
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-zinc-900 tabular mt-1 block">
                  {formatCountdown(secondsUntilAccessExpiry)}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
                <span className="text-[11.5px] font-medium text-zinc-500 block">Phân quyền</span>
                <span className="text-sm sm:text-[15px] font-semibold text-zinc-900 mt-1 block truncate">
                  {user?.role === 'ministry'
                    ? 'Bộ GD&ĐT'
                    : user?.role === 'university'
                    ? 'Trường ĐH'
                    : 'Sinh viên'}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
                <span className="text-[11.5px] font-medium text-zinc-500 block">Đã xoay vòng</span>
                <span className="text-base sm:text-lg font-bold font-mono text-[#0071E3] tabular mt-1 block">
                  {refreshCount} <span className="text-xs font-sans font-medium text-zinc-500">lần</span>
                </span>
              </div>
            </div>

            {/* Khung soi Payload nền đen chữ xanh lá chuẩn Terminal Code */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-zinc-800/90 bg-zinc-900/90">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
                    HS256
                  </span>
                  <span className="text-xs font-medium text-zinc-300 truncate">
                    Access Token Payload
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (tokens?.accessToken) {
                      navigator.clipboard.writeText(tokens.accessToken);
                      appAlert.success('Đã sao chép chuỗi JWT Access Token');
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-400 hover:bg-zinc-800 hover:text-sky-300 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="h-3 w-3" />
                  <span>Sao chép JWT</span>
                </button>
              </div>
              <pre className="max-h-[176px] overflow-auto dark-scrollbar p-3.5 font-mono text-xs text-emerald-400 leading-relaxed">
                {JSON.stringify(accessPayload, null, 2)}
              </pre>
            </div>

            {/* Trạng thái Refresh Token */}
            <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-semibold text-zinc-900 block text-[13.5px]">
                  Refresh Token Rotation
                </span>
                <span className="text-xs text-zinc-500 block mt-0.5 tabular">
                  Hết hạn: {refreshPayload?.exp ? formatDateTime(refreshPayload.exp * 1000) : '—'}
                </span>
              </div>
              <Badge variant="success">Đang hoạt động</Badge>
            </div>
          </div>

          {/* Footer cố định */}
          <DialogFooter className="px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/70 shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setJwtDialogOpen(false)}>
              Đóng
            </Button>
            <Button variant="appleBlue" size="sm" onClick={handleManualRefresh} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới Token ngay</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
