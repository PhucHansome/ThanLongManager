import React, { useState, useEffect } from 'react';
import {
  Download,
  Play,
  Monitor,
  Cpu,
  ShieldCheck,
  Zap,
  Coins,
  History,
  Cloud,
  Headphones,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Layers,
  Sparkles,
  Bot,
  Gamepad2,
  HardDrive,
  Wifi,
  Eye,
  LogIn,
  UserPlus,
  ArrowDown,
  Clock,
  Check,
  Copy,
  ChevronDown
} from 'lucide-react';
import { PricingPlan } from '../../types';
import { apiGetPricing } from '../../lib/api';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onGoToPortal?: () => void;
  isLoggedIn: boolean;
  userName?: string;
  userRole?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onGoToPortal,
  isLoggedIn,
  userName,
  userRole
}) => {
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [activeVideoTab, setActiveVideoTab] = useState<'install' | 'multi' | 'farm'>('install');
  const [downloadCounter, setDownloadCounter] = useState(12845);
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Fetch pricing from backend API
  useEffect(() => {
    apiGetPricing()
      .then(plans => {
        if (plans && plans.length > 0) {
          setPricingPlans(plans);
        } else {
          // Fallback plans
          setPricingPlans([
            { id: '1', months: 1, price: 150000, discount_pct: 0, label: 'Gói 1 Tháng', is_active: true },
            { id: '2', months: 3, price: 400000, discount_pct: 11, label: 'Gói 3 Tháng', is_active: true },
            { id: '3', months: 6, price: 750000, discount_pct: 17, label: 'Gói 6 Tháng', is_active: true },
            { id: '4', months: 12, price: 1200000, discount_pct: 33, label: 'Gói 1 Năm (VIP)', is_active: true },
          ]);
        }
      })
      .catch(() => {
        setPricingPlans([
          { id: '1', months: 1, price: 150000, discount_pct: 0, label: 'Gói 1 Tháng', is_active: true },
          { id: '2', months: 3, price: 400000, discount_pct: 11, label: 'Gói 3 Tháng', is_active: true },
          { id: '3', months: 6, price: 750000, discount_pct: 17, label: 'Gói 6 Tháng', is_active: true },
          { id: '4', months: 12, price: 1200000, discount_pct: 33, label: 'Gói 1 Năm (VIP)', is_active: true },
        ]);
      })
      .finally(() => setPricingLoading(false));
  }, []);

  const handleCopyHash = () => {
    navigator.clipboard.writeText('SHA256: 7e2d9b6a12ef84c01284bd97cf402319fca3401289dfb830d12e5c8a2b3491f0');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTriggerDownload = () => {
    setDownloadModalOpen(true);
    setDownloadStarted(true);
    setDownloadCounter(prev => prev + 1);

    // Create a temporary mock file download trigger
    const blob = new Blob([
      `=== THẦN LONG MOBILE AUTO PRO - v24.22 ===\n\n` +
      `Cảm ơn bạn đã tải Thần Long Mobile Auto Pro!\n\n` +
      `HƯỚNG DẪN BẮT ĐẦU NHANH:\n` +
      `1. Khởi động LDPlayer 9 hoặc 14.\n` +
      `2. Đặt độ phân giải LDPlayer: 1280x720 (DPI 240) - Chế độ Máy tính bảng.\n` +
      `3. Bật Gỡ lỗi ADB (Local connection) trong cài đặt LDPlayer.\n` +
      `4. Khởi chạy ThanLongMobileAutoPro.exe với quyền Run as Administrator.\n` +
      `5. Đăng nhập tài khoản của bạn để bắt đầu auto.\n\n` +
      `Hỗ trợ 24/7 qua Zalo & Telegram: @thanlong_autopro\n`
    ], { type: 'text/plain;charset=utf-8' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ThanLongMobileAutoPro_v24.22_Setup_Guide.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('vi-VN').format(p) + ' đ';
  };

  const features = [
    {
      icon: <Gamepad2 className="w-6 h-6 text-[#22c55e]" />,
      title: 'Chạy đa acc LDPlayer song song',
      desc: 'Hỗ trợ đồng thời 5 đến 30 giả lập LDPlayer 9 & 14. Phân luồng thông minh, không chiếm trỏ chuột, thoải mái làm việc khác.',
      badge: 'Multi-Instance'
    },
    {
      icon: <Bot className="w-6 h-6 text-[#22c55e]" />,
      title: 'Tự động cày quái & Bán đồ',
      desc: 'Tự động di chuyển tới bãi train theo tọa độ, combo chiêu thức chuẩn phái, nhận diện đầy túi tự về NPC bán rác gom vàng.',
      badge: 'Smart AI Loop'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#22c55e]" />,
      title: 'Hệ thống license bảo mật',
      desc: 'Quản lý bản quyền theo Machine ID (mỗi máy 1 tài khoản). Bảo mật tuyệt đối qua hạ tầng Supabase Cloud hiện đại.',
      badge: 'Hardware Lock'
    },
    {
      icon: <Coins className="w-6 h-6 text-[#22c55e]" />,
      title: 'Theo dõi vàng kiếm được realtime',
      desc: 'Thống kê tốc độ kiếm vàng (Vàng/giờ), tổng vàng thu hoạch trong ngày của từng acc, xuất báo cáo doanh số rõ ràng.',
      badge: 'Live Analytics'
    },
    {
      icon: <Zap className="w-6 h-6 text-[#22c55e]" />,
      title: 'Tự động hồi sinh khi bị trọng thương',
      desc: 'Bị quái cắn hoặc kẻ địch đồ sát? Tool tự chọn hồi sinh, dùng phi hành phù hoặc chạy bộ quay lại đúng bãi quái tiếp tục cày.',
      badge: 'Auto Revive'
    },
    {
      icon: <History className="w-6 h-6 text-[#22c55e]" />,
      title: 'Log chi tiết mọi thao tác',
      desc: 'Ghi nhật ký từng hành động: nhận đồ tím, nhặt bảo rương, bơm máu Mana, phát hiện kẻ địch và gửi cảnh báo âm thanh.',
      badge: 'Audit Logs'
    },
    {
      icon: <Cloud className="w-6 h-6 text-[#22c55e]" />,
      title: 'Xác thực qua Supabase Cloud',
      desc: 'Kết nối trực tiếp hệ quản trị đám mây tốc độ cao. Gia hạn license tự động qua VietQR xác nhận chỉ sau 3 giây.',
      badge: 'Cloud Sync'
    },
    {
      icon: <Headphones className="w-6 h-6 text-[#22c55e]" />,
      title: 'Cập nhật tự động, hỗ trợ 24/7',
      desc: 'Tự động kiểm tra bản vá mỗi khi mở tool. Kênh hỗ trợ kỹ thuật Zalo và Telegram giải đáp thắc mắc người dùng liên tục.',
      badge: 'Auto Update'
    }
  ];

  const installSteps = [
    {
      step: '01',
      title: 'Tải và cài đặt LDPlayer 9 / 14',
      desc: 'Khuyến nghị sử dụng phiên bản LDPlayer 9 (64-bit) hoặc LDPlayer 14 tối ưu hiệu năng cao nhất trên Windows.',
      tip: 'Nên cài LDPlayer trên ổ đĩa SSD để game mở nhanh và không bị nghẽn đĩa.'
    },
    {
      step: '02',
      title: 'Bật gỡ lỗi ADB trong LDPlayer',
      desc: 'Vào LDPlayer: Cài đặt (bánh răng) ➜ Cài đặt khác ➜ Tại mục "Gỡ lỗi ADB" chọn "Mở kết nối cục bộ" (Local connection).',
      tip: 'ADB cho phép tool gửi lệnh điều khiển ngầm mà không cần chiếm quyền chuột của bạn.'
    },
    {
      step: '03',
      title: 'Set độ phân giải 1280×720 (BẮT BUỘC)',
      desc: 'Trong Cài đặt hiển thị LDPlayer: Chọn "Máy tính bảng" ➜ Độ phân giải 1280 × 720 (DPI 240). Khởi động lại giả lập.',
      tip: 'Đây là độ phân giải chuẩn quốc tế để bộ nhận diện ảnh OCR hoạt động chính xác 100%.'
    },
    {
      step: '04',
      title: 'Tải tool, giải nén và chạy .exe',
      desc: 'Tải file ThanLongMobileAutoPro.zip từ trang web, giải nén ra thư mục và nhấp đúp file ThanLongMobileAutoPro.exe.',
      tip: 'Đăng nhập bằng tài khoản web của bạn hoặc đăng ký tài khoản mới để nhận 3 ngày dùng thử miễn phí.'
    }
  ];

  const faqs = [
    {
      q: 'Tool có an toàn và có bị khóa tài khoản game không?',
      a: 'Thần Long Mobile Auto Pro hoạt động dựa trên cơ chế phân tích hình ảnh (Computer Vision OCR) và điều khiển giả lập qua giao thức ADB chuẩn của Android. Tool không hề can thiệp, hook bộ nhớ hay chỉnh sửa file game APK, do đó đảm bảo an toàn tối đa cho nhân vật của bạn.'
    },
    {
      q: 'Một license bản quyền sử dụng được cho bao nhiêu máy tính?',
      a: 'Mỗi tài khoản bản quyền mặc định được gán cho 1 máy tính vật lý duy nhất (khóa theo Machine ID phần cứng). Nếu bạn đổi máy tính hoặc nâng cấp linh kiện, bạn có thể dễ dàng quản lý và gỡ máy cũ trong Cổng Quản Lý Web để kích hoạt máy mới.'
    },
    {
      q: 'Máy tính của tôi chạy được tối đa bao nhiêu cửa sổ giả lập?',
      a: 'Với cấu hình RAM 16GB và CPU i5/Ryzen 5, bạn có thể chạy ổn định từ 6 - 10 tài khoản song song. Tool có cơ chế tối ưu FPS ngầm xuống 15-20fps khi giả lập ẩn xuống dưới, giúp tiết kiệm tới 60% CPU và nhiệt độ máy luôn mát.'
    },
    {
      q: 'Sau khi chuyển khoản gia hạn thì bao lâu có license?',
      a: 'Hệ thống tích hợp cổng thanh toán VietQR tự động đồng bộ Webhook ngân hàng qua SePay. Sau khi bạn chuyển khoản đúng mã đơn hàng, hệ thống sẽ tự động kích hoạt cộng thêm ngày sử dụng vào tài khoản chỉ sau 3 đến 5 giây.'
    },
    {
      q: 'Tôi là người mới, có được hỗ trợ cài đặt từ xa không?',
      a: 'Đội ngũ kỹ thuật viên của chúng tôi hỗ trợ nhiệt tình qua Ultraview / Teamviewer hoàn toàn miễn phí từ A đến Z, giúp bạn cài đặt giả lập và cấu hình tool chạy chuẩn xác ngay trong lần đầu tiên.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#1a1b1e] text-zinc-100 font-sans selection:bg-[#22c55e] selection:text-zinc-950">
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-40 bg-[#1a1b1e]/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e] to-emerald-800 flex items-center justify-center shadow-lg shadow-[#22c55e]/20 border border-emerald-400/30">
              <Sparkles className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Thần Long Mobile</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/30 px-1.5 py-0.5 rounded">
                  Auto Pro
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Chuyên nghiệp · Ổn định · Không chiếm chuột</p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300 font-medium">
            <button onClick={() => scrollTo('features')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
              Tính năng
            </button>
            <button onClick={() => scrollTo('video')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
              Video HD
            </button>
            <button onClick={() => scrollTo('guide')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
              Cài đặt 5p
            </button>
            <button onClick={() => scrollTo('system')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
              Yêu cầu máy
            </button>
            <button onClick={() => scrollTo('download')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
              Tải tool
            </button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
              Bảng giá
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            {isLoggedIn ? (
              <button
                onClick={onGoToPortal}
                className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#22c55e]/20 cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Vào Cổng Quản Lý {userName ? `(${userName})` : ''}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#22c55e]/20 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Dùng thử 3 ngày</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#22c55e]/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-48 right-10 w-96 h-96 bg-emerald-600/10 blur-[140px] pointer-events-none rounded-full" />

        {/* Ambient Subtle Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Version Kicker (Clean unboxed metadata) */}
            <div className="inline-flex items-center gap-2 text-xs text-zinc-400 font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
              <span className="text-[#22c55e] font-semibold">Phiên bản v24.22</span>
              <span aria-hidden="true">·</span>
              <span>Hỗ trợ LDPlayer 9 & 14</span>
              <span aria-hidden="true">·</span>
              <span>Cập nhật mới nhất</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
              Thần Long Mobile <span className="text-[#22c55e]">Auto Pro</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
              Tool auto game Thần Long Mobile chuyên nghiệp — Chạy đa acc LDPlayer, tự động cày quái, bán đồ, quản lý license bảo mật điện toán đám mây.
            </p>

            {/* 2 CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => scrollTo('download')}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 font-bold px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-[#22c55e]/25 hover:shadow-[#22c55e]/40 hover:-translate-y-0.5 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>⬇️ Tải về ngay</span>
              </button>

              <button
                onClick={() => scrollTo('video')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 font-semibold px-6 py-3.5 rounded-xl text-sm border border-zinc-700 transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <Play className="w-4 h-4 text-[#22c55e] fill-[#22c55e]" />
                <span>📺 Xem hướng dẫn</span>
              </button>
            </div>

            {/* Key Value Points */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Chạy nền không chiếm chuột</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Tesseract OCR tiếng Việt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Đổi máy linh hoạt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>3 ngày dùng thử miễn phí</span>
              </div>
            </div>
          </div>

          {/* Tool UI Interactive Mockup / Window Preview */}
          <div className="mt-12 lg:mt-16 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-zinc-700/80 bg-[#141517] shadow-2xl shadow-black/80 overflow-hidden">
              {/* Fake Window Titlebar */}
              <div className="bg-zinc-900/90 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 ml-2">
                    Thần Long Mobile Auto Pro v24.22 · [PyQt5 Engine]
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                  <span className="flex items-center gap-1 text-[#22c55e]">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                    SUPABASE CONNECTED
                  </span>
                  <span>CPU: 11% · RAM: 1.4GB</span>
                </div>
              </div>

              {/* Window Content: Live Multi-Account Dashboard Simulation */}
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left 2 Cols: Running Instances Table */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Danh sách LDPlayer đang auto (4 Acc)
                    </span>
                    <span className="text-xs text-[#22c55e] font-mono font-medium">
                      Tổng vàng: +4.850.000 Vàng / ngày
                    </span>
                  </div>

                  {/* Acc Cards */}
                  <div className="space-y-2">
                    {[
                      { name: 'LD-01: Nga My (Lv.89)', map: 'Yến Vương Cổ Mộ 7', status: 'Cày quái & Bơm máu', gold: '+1.420k', ping: '24ms' },
                      { name: 'LD-02: Võ Đang (Lv.92)', map: 'Hạn Huyết Lĩnh', status: 'Tự bán đồ rác', gold: '+1.180k', ping: '28ms' },
                      { name: 'LD-03: Tiêu Dao (Lv.85)', map: 'Hoàng Long Động', status: 'Cày quái tự động', gold: '+1.350k', ping: '22ms' },
                      { name: 'LD-04: Thiên Sơn (Lv.90)', map: 'Tần Hoàng Địa Cung', status: 'Hồi sinh ➜ Quay lại bãi', gold: '+900k', ping: '31ms' }
                    ].map((acc, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-mono font-bold text-[#22c55e]">
                            0{idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-200">{acc.name}</div>
                            <div className="text-[11px] text-zinc-400">Map: {acc.map}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center gap-1.5 text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                            {acc.status}
                          </span>
                          <span className="font-mono font-bold text-amber-400">{acc.gold}</span>
                          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">{acc.ping}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Col: Machine License & Realtime Feed */}
                <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
                      <span>Bản quyền máy trạm</span>
                      <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                    </div>

                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Machine ID:</span>
                        <span className="font-mono text-zinc-300">HWID-7F2A...9C1B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Trạng thái:</span>
                        <span className="text-[#22c55e] font-semibold">Đã kích hoạt</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Hạn sử dụng:</span>
                        <span className="font-semibold text-zinc-200">Còn 28 ngày</span>
                      </div>
                    </div>

                    {/* Mini Event Log */}
                    <div className="mt-4">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Nhật ký thao tác vừa ghi nhận:
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400 space-y-1.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 max-h-36 overflow-y-auto">
                        <div className="text-zinc-300">[14:32:01] LD-01: Nhặt [Bí kíp tàn diệp]</div>
                        <div className="text-zinc-300">[14:32:15] LD-02: Rương đầy ➜ Bán 14 rác</div>
                        <div className="text-emerald-400">[14:32:40] LD-04: Hồi sinh tại chỗ thành công</div>
                        <div className="text-zinc-400">[14:33:05] Auto Sync Supabase: OK (0 error)</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Xác thực Cloud: Supabase RPC</span>
                    <button
                      onClick={() => onOpenAuth('login')}
                      className="text-[#22c55e] hover:underline font-medium cursor-pointer"
                    >
                      Mở bảng điều khiển ➜
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. VIDEO SECTION ─── */}
      <section id="video" className="py-20 bg-zinc-950 border-t border-b border-zinc-800/80 scroll-mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <span>📺 Video hướng dẫn sử dụng</span>
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Xem chi tiết các bước thiết lập LDPlayer, kích hoạt bản quyền và kinh nghiệm cày vàng tối ưu không lo giật lag.
            </p>

            {/* Video Playlist Tabs */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setActiveVideoTab('install')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeVideoTab === 'install'
                    ? 'bg-[#22c55e] text-zinc-950 shadow-md shadow-[#22c55e]/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                1. Cài đặt & Cấu hình LDPlayer (5 Phút)
              </button>
              <button
                onClick={() => setActiveVideoTab('multi')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeVideoTab === 'multi'
                    ? 'bg-[#22c55e] text-zinc-950 shadow-md shadow-[#22c55e]/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                2. Chạy 10+ Acc không chiếm chuột
              </button>
              <button
                onClick={() => setActiveVideoTab('farm')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeVideoTab === 'farm'
                    ? 'bg-[#22c55e] text-zinc-950 shadow-md shadow-[#22c55e]/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                3. Tối ưu Farm vàng & Auto bán rác
              </button>
            </div>
          </div>

          {/* Video Container */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/80 aspect-video">
            {activeVideoTab === 'install' && (
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title="Hướng dẫn cài đặt Thần Long Mobile Auto Pro"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            {activeVideoTab === 'multi' && (
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title="Hướng dẫn chạy đa acc không chiếm chuột"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            {activeVideoTab === 'farm' && (
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title="Tối ưu farm vàng và auto bán đồ"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>

          {/* Quick Timestamps / Key Highlights */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-400">
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-[#22c55e] font-mono font-bold">00:35</span>
              <p className="mt-0.5 text-zinc-300 truncate">Thiết lập độ phân giải 1280x720</p>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-[#22c55e] font-mono font-bold">01:45</span>
              <p className="mt-0.5 text-zinc-300 truncate">Bật gỡ lỗi ADB cục bộ</p>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-[#22c55e] font-mono font-bold">03:10</span>
              <p className="mt-0.5 text-zinc-300 truncate">Đăng nhập tài khoản & nhận trial</p>
            </div>
            <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
              <span className="text-[#22c55e] font-mono font-bold">04:50</span>
              <p className="mt-0.5 text-zinc-300 truncate">Kích hoạt auto cày quái & bán đồ</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURES GRID ─── */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-12">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs text-[#22c55e] font-bold uppercase tracking-wider mb-2">
            Tính Năng Vượt Trội
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Bộ công cụ tự động hóa toàn diện cho game thủ
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Được lập trình bằng Python/PyQt5 tối ưu phần cứng, liên tục cập nhật theo các bản cập nhật của Thần Long Mobile.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/90 hover:border-[#22c55e]/40 p-6 rounded-2xl transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-[#22c55e] transition-colors mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  {feat.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/60 text-[11px] text-[#22c55e] flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá tính năng</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. HƯỚNG DẪN CÀI ĐẶT ─── */}
      <section id="guide" className="py-20 bg-zinc-950 border-t border-zinc-800/80 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <span>🚀 Cài đặt trong 5 phút</span>
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Chỉ 4 bước đơn giản, không cần cấu hình phức tạp. Bất kỳ ai cũng có thể tự chạy auto ngay tại nhà.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {installSteps.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Step Number Big */}
                  <div className="text-4xl font-black font-mono text-[#22c55e]/25 mb-4">
                    {step.step}
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Helpful Tip */}
                <div className="mt-5 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold shrink-0">Lưu ý:</span>
                  <span>{step.tip}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tip Box for Resolution */}
          <div className="mt-10 bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-200">
                  Thông số chuẩn LDPlayer: Độ phân giải 1280 × 720 (DPI 240)
                </div>
                <div className="text-xs text-zinc-400">
                  Tool sử dụng thư viện nhận diện hình ảnh theo chuẩn này. Cài đúng độ phân giải giúp auto tìm quái và click nút chính xác tuyệt đối.
                </div>
              </div>
            </div>

            <button
              onClick={() => scrollTo('download')}
              className="whitespace-nowrap bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Tải bộ cài ngay ➜
            </button>
          </div>
        </div>
      </section>

      {/* ─── 5. YÊU CẦU HỆ THỐNG ─── */}
      <section id="system" className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs text-[#22c55e] font-bold uppercase tracking-wider mb-2">
            Cấu Hình Yêu Cầu
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            Yêu cầu hệ thống máy tính
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Kiểm tra cấu hình PC / Laptop của bạn để chọn số lượng acc phù hợp.
          </p>
        </div>

        {/* 2-Column Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Minimum Card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white">Cấu hình tối thiểu</h3>
                <p className="text-xs text-zinc-400">Phù hợp cày 1 - 3 Acc mượt mà</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-800 text-zinc-300">
                1-3 Giả lập
              </span>
            </div>

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-zinc-500" /> Hệ điều hành (OS)
                </span>
                <span className="font-semibold text-zinc-200">Windows 10 / 11 64-bit</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-zinc-500" /> Bộ xử lý (CPU)
                </span>
                <span className="font-semibold text-zinc-200">Intel Core i3 / Ryzen 3</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" /> Bộ nhớ RAM
                </span>
                <span className="font-semibold text-zinc-200">8 GB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" /> Ổ cứng trống
                </span>
                <span className="font-semibold text-zinc-200">5 GB trống</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" /> Giả lập Android
                </span>
                <span className="font-semibold text-zinc-200">LDPlayer 9 hoặc 14</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-zinc-500" /> Độ phân giải
                </span>
                <span className="font-semibold text-amber-400">1280×720 (bắt buộc)</span>
              </div>
            </div>
          </div>

          {/* Recommended Card */}
          <div className="bg-zinc-900/90 border-2 border-[#22c55e]/40 rounded-2xl p-6 relative shadow-lg shadow-[#22c55e]/5">
            <div className="absolute -top-3 right-6 bg-[#22c55e] text-zinc-950 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded shadow">
              Khuyên Dùng Để Cày Vàng
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white">Cấu hình đề xuất (Dàn Cày Farm)</h3>
                <p className="text-xs text-zinc-400">Chạy mượt 6 - 20 Acc không giật lag</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30">
                6-20 Giả lập
              </span>
            </div>

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-[#22c55e]" /> Hệ điều hành (OS)
                </span>
                <span className="font-semibold text-zinc-200">Windows 10 / 11 64-bit</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[#22c55e]" /> Bộ xử lý (CPU)
                </span>
                <span className="font-semibold text-zinc-200">Intel Core i5/i7 hoặc Ryzen 5/7 (6 core 12 threads)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-[#22c55e]" /> Bộ nhớ RAM
                </span>
                <span className="font-semibold text-[#22c55e]">16 GB – 32 GB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-[#22c55e]" /> Ổ cứng trống
                </span>
                <span className="font-semibold text-zinc-200">Ổ SSD NVMe tốc độ cao</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-[#22c55e]" /> Kết nối mạng
                </span>
                <span className="font-semibold text-zinc-200">Internet ổn định (Ping &lt; 50ms)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-[#22c55e]" /> Độ phân giải
                </span>
                <span className="font-semibold text-amber-400">1280×720 (DPI 240)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. DOWNLOAD SECTION ─── */}
      <section id="download" className="py-20 bg-zinc-950 border-t border-b border-zinc-800/80 scroll-mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-b from-[#1f2024] to-[#141517] border border-zinc-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Aura */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#22c55e]/10 blur-[100px] pointer-events-none rounded-full" />

            <div className="text-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto mb-4 text-[#22c55e] shadow-lg shadow-[#22c55e]/10">
                <Download className="w-8 h-8 stroke-[2.2]" />
              </div>

              <h2 className="text-3xl font-extrabold text-white">
                ⬇️ Tải tool về máy
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Bản cài đặt trọn gói đã tích hợp sẵn thư viện Tesseract OCR và ADB Tools. Tải về là dùng được ngay, không cần cấu hình thêm bất kỳ gì!
              </p>

              {/* Version & Date Info (Clean Unboxed) */}
              <div className="mt-4 flex items-center justify-center gap-3 text-xs text-zinc-400 font-mono">
                <span className="text-[#22c55e] font-semibold">Phiên bản: v24.22</span>
                <span aria-hidden="true">·</span>
                <span>Dung lượng: ~200MB</span>
                <span aria-hidden="true">·</span>
                <span>Ngày cập nhật: 14/10/2026</span>
              </div>

              {/* Download Main Button */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleTriggerDownload}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 font-black px-8 py-4 rounded-xl text-base transition-all shadow-xl shadow-[#22c55e]/25 hover:shadow-[#22c55e]/40 hover:scale-[1.02] cursor-pointer"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>Tải về ThanLongMobileAutoPro.exe</span>
                </button>

                <a
                  href="#guide"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-200 font-semibold px-5 py-4 rounded-xl text-sm border border-zinc-700 transition-colors"
                >
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>📄 Tải hướng dẫn sử dụng (PDF)</span>
                </a>
              </div>

              {/* Download Count Indicator */}
              <div className="mt-4 text-[11px] text-zinc-500">
                Đã có <span className="font-semibold text-zinc-300 font-mono">{downloadCounter.toLocaleString('vi-VN')}</span> lượt tải về và kích hoạt thành công
              </div>

              {/* Important Note */}
              <div className="mt-6 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl text-left text-xs text-zinc-400">
                <div className="font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                  <span>Đã tích hợp đầy đủ công cụ</span>
                </div>
                Tool đã bao gồm sẵn bộ thư viện Tesseract OCR — không cần cài thêm Python hay bất kỳ phần mềm phụ trợ nào.
              </div>

              {/* Windows Defender False Positive Warning */}
              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-left text-xs text-amber-200/90 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Cảnh báo Windows Defender có thể báo nhầm:</span>{' '}
                  Do phần mềm giao tiếp với giả lập qua giao thức gỡ lỗi ADB và kiểm tra Machine ID bảo mật, Windows SmartScreen có thể hiện cảnh báo xanh. Quý khách vui lòng bấm{' '}
                  <span className="font-bold underline text-white">More info (Xem thêm thông tin)</span> ➜{' '}
                  <span className="font-bold underline text-white">Run anyway (Vẫn chạy)</span> để khởi chạy tool.
                </div>
              </div>

              {/* SHA256 Checksum */}
              <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-zinc-500 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-900">
                <span className="truncate">SHA256: 7e2d9b6a12ef84c01284bd97cf402319fca3401289dfb830d12e5c8a2b3491f0</span>
                <button
                  onClick={handleCopyHash}
                  className="ml-2 text-zinc-400 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. BẢNG GIÁ PRICING ─── */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-12">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs text-[#22c55e] font-bold uppercase tracking-wider mb-2">
            Bảng Giá Bản Quyền
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            Chi phí hợp lý · Tự động kích hoạt trong 3 giây
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Tất cả các gói đều hỗ trợ đầy đủ tính năng: đa acc không giới hạn, auto nhặt quái, bán rác, nhận diện OCR và hỗ trợ kỹ thuật 24/7.
          </p>
        </div>

        {/* Pricing Cards */}
        {pricingLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, idx) => {
              const isBestSeller = plan.months === 3 || plan.months === 6;
              const isVip = plan.months === 12;

              return (
                <div
                  key={plan.id || idx}
                  className={`bg-zinc-900/60 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                    isBestSeller
                      ? 'border-2 border-[#22c55e] shadow-xl shadow-[#22c55e]/10 -translate-y-1'
                      : isVip
                      ? 'border-2 border-amber-500/60 shadow-xl shadow-amber-500/10'
                      : 'border border-zinc-800'
                  }`}
                >
                  {isBestSeller && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#22c55e] text-zinc-950 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded shadow">
                      Phổ Biến Nhất
                    </div>
                  )}

                  {isVip && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded shadow">
                      Tiết Kiệm 40%
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{plan.label}</h3>
                    <p className="text-xs text-zinc-400">Thời hạn sử dụng: {plan.months} tháng ({plan.months * 30} ngày)</p>

                    <div className="mt-5 pb-5 border-b border-zinc-800">
                      <div className="text-3xl font-black text-white tracking-tight">
                        {formatPrice(plan.price)}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Chỉ ~{Math.round(plan.price / (plan.months * 30)).toLocaleString('vi-VN')} đ / ngày cày vàng
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="mt-5 space-y-2.5 text-xs text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        <span>Chạy đa acc không giới hạn</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        <span>Auto cày quái & tự bán đồ rác</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        <span>Tự động hồi sinh & quay lại bãi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                        <span>Hỗ trợ Ultraview cài đặt 1-1</span>
                      </div>
                      {plan.months >= 6 && (
                        <div className="flex items-center gap-2 text-[#22c55e] font-medium">
                          <Check className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                          <span>Tặng thêm 15 ngày trải nghiệm VIP</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buy Button */}
                  <div className="mt-8">
                    <button
                      onClick={() => onOpenAuth('register')}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isBestSeller
                          ? 'bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 shadow-md shadow-[#22c55e]/25'
                          : isVip
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/25'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                      }`}
                    >
                      <span>Mua Gói Này</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Free trial banner */}
        <div className="mt-12 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="text-base font-bold text-white">Chưa chắc chắn? Dùng thử hoàn toàn miễn phí 3 ngày</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Đăng ký tài khoản mới ngay hôm nay để nhận tự động 3 ngày trải nghiệm đầy đủ tính năng của Thần Long Mobile Auto Pro.
            </p>
          </div>
          <button
            onClick={() => onOpenAuth('register')}
            className="whitespace-nowrap bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-[#22c55e]/20 cursor-pointer"
          >
            Đăng ký dùng thử ngay
          </button>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section className="py-20 bg-zinc-950 border-t border-zinc-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Câu hỏi thường gặp (FAQ)
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Giải đáp các thắc mắc phổ biến nhất của người dùng về bản quyền, giả lập và an toàn game.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-semibold text-sm text-zinc-200">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-[#22c55e]' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer className="border-t border-zinc-900 bg-[#141517] py-12 text-zinc-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-zinc-800/80">
            {/* Col 1: Brand Info */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e] to-emerald-800 flex items-center justify-center text-zinc-950 font-bold text-sm">
                  TL
                </div>
                <span className="font-extrabold text-base text-white">Thần Long Auto Pro</span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Giải pháp phần mềm tự động hóa toàn diện cho game thủ Thần Long Mobile. Chạy đa nhiệm LDPlayer, an toàn và tin cậy.
              </p>
              <div className="text-[11px] text-zinc-500 font-mono">
                Xác thực Supabase Cloud · Cổng thanh toán VietQR
              </div>
            </div>

            {/* Col 2: Liên kết nhanh */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">
                Liên kết nhanh
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => scrollTo('features')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
                    Tính năng nổi bật
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('video')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
                    Video hướng dẫn sử dụng
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('guide')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
                    Cài đặt trong 5 phút
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('system')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
                    Yêu cầu cấu hình PC
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('pricing')} className="hover:text-[#22c55e] transition-colors cursor-pointer">
                    Bảng giá bản quyền
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Cổng Web Quản Lý */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">
                Cổng Quản Lý Web
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="hover:text-[#22c55e] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập hệ thống</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="hover:text-[#22c55e] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng ký nhận 3 ngày trial</span>
                  </button>
                </li>
                {isLoggedIn && (
                  <li>
                    <button
                      onClick={onGoToPortal}
                      className="text-[#22c55e] font-semibold hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Truy cập Bảng Điều Khiển</span>
                    </button>
                  </li>
                )}
                <li>
                  <span className="text-zinc-500">Quản lý Machine ID máy tính</span>
                </li>
                <li>
                  <span className="text-zinc-500">Gia hạn license tự động VietQR</span>
                </li>
              </ul>
            </div>

            {/* Col 4: Kênh Hỗ Trợ Khách Hàng */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">
                Hỗ Trợ Kỹ Thuật 24/7
              </h4>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Zalo CSKH:</span>
                  <span className="font-semibold text-zinc-200">0988.xxx.xxx</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Telegram:</span>
                  <span className="font-semibold text-[#22c55e]">@thanlong_autopro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Fanpage:</span>
                  <span className="font-semibold text-zinc-200">fb.com/thanlongautopro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Giờ hỗ trợ:</span>
                  <span className="text-zinc-200">24/7 (Cả ngày Lễ & Tết)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 text-[11px]">
            <div>
              © 2026 Thần Long Mobile Auto Pro. Tất cả các quyền được bảo lưu.
            </div>
            <div className="flex items-center gap-4">
              <span>Chính sách bảo mật</span>
              <span aria-hidden="true">·</span>
              <span>Điều khoản sử dụng</span>
              <span aria-hidden="true">·</span>
              <span>Cam kết hoàn tiền trong 24h</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Download confirmation dialog */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f2024] border border-zinc-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e] mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Tải về thành công!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Tệp hướng dẫn và thông tin khởi động <span className="text-[#22c55e] font-mono font-semibold">ThanLongMobileAutoPro_v24.22</span> đã bắt đầu được tải xuống.
              </p>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <div className="font-semibold text-[#22c55e]">Các bước tiếp theo:</div>
              <div className="flex items-start gap-2 text-zinc-400">
                <span className="font-mono text-zinc-500">1.</span>
                <span>Mở LDPlayer, cài đặt độ phân giải 1280x720 và bật ADB Debug.</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-400">
                <span className="font-mono text-zinc-500">2.</span>
                <span>Khởi chạy ThanLongMobileAutoPro.exe với quyền Administrator.</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-400">
                <span className="font-mono text-zinc-500">3.</span>
                <span>Đăng nhập tài khoản web để kích hoạt license trial 3 ngày.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDownloadModalOpen(false)}
                className="flex-1 bg-[#22c55e] hover:bg-[#1eb054] text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Đã hiểu, đóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
