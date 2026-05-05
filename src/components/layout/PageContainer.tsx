import { Navbar } from './Navbar';

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white relative overflow-hidden font-sans">
      {/* Background Glow Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E05A1E] rounded-full blur-[120px] opacity-[0.06] animate-float"></div>
        <div className="absolute top-[40%] right-[-5%] w-[30%] h-[30%] bg-[#FF7A3D] rounded-full blur-[100px] opacity-[0.06] animate-float-delayed"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-[#E05A1E] rounded-full blur-[110px] opacity-[0.06] animate-float-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 sm:pb-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
