import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Home, Clock, Settings, LogOut, LogIn, Zap, MessageSquare } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'New' },
  { to: '/results', icon: Clock, label: 'History' },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const isGuest = !user || user.isAnonymous;

  const handleAuthAction = async () => {
    if (isGuest) {
      navigate('/login', { state: { explicitSignIn: true } });
    } else {
      await logout();
      toast('Signed out successfully', 'success');
      navigate('/login');
    }
  };

  const navLinkClass = (to: string) => cn(
    "transition-all duration-150 active:scale-95",
    location.pathname === to
      ? "text-white"
      : "text-[#888888] hover:text-white"
  );

  return (
    <>
      {/* ── Desktop top bar ── */}
      <nav className="hidden sm:flex border-b border-[#2A2A2A] bg-[#0D0D0D]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 w-full flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group transition-all active:scale-95">
            <Zap className="w-5 h-5 text-[#E05A1E]" />
            <span className="text-[#E05A1E] font-bold text-xl tracking-tight group-hover:text-[#FF7A3D] transition-colors">
              PublishKit
            </span>
          </Link>

          <div className="flex items-center gap-6 text-sm font-medium">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={navLinkClass(to)}
              >
                {label}
              </Link>
            ))}

            <button
              onClick={handleAuthAction}
              className="text-[#888888] hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
            >
              {isGuest ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" /> Sign Out
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <header className="sm:hidden flex items-center justify-between px-5 py-3 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#2A2A2A] sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 active:scale-95 transition-all">
          <Zap className="w-4 h-4 text-[#E05A1E]" />
          <span className="text-[#E05A1E] font-bold text-lg tracking-tight">PublishKit</span>
        </Link>
        <button
          onClick={handleAuthAction}
          className="flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-all px-3 py-1.5 rounded-full border border-[#2A2A2A] active:scale-95"
        >
          {isGuest ? (
            <>
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </>
          )}
        </button>
      </header>

      {/* ── Mobile bottom nav bar ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-[#2A2A2A]">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all active:scale-90",
                  active
                    ? "text-[#E05A1E]"
                    : "text-[#555555] hover:text-[#888888]"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_rgba(224,90,30,0.8)]")} />
                <span className="text-[10px] font-medium">{label}</span>
                {active && (
                  <div className="absolute -bottom-px w-8 h-0.5 bg-[#E05A1E] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer so content doesn't hide behind bottom nav on mobile */}
      <div className="sm:hidden h-16" />
    </>
  );
}
