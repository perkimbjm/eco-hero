import { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

export function OrientationGate({ children }: { children: React.ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-24 h-24 rounded-3xl bg-green-600 flex items-center justify-center shadow-2xl mb-6 animate-bounce-slow">
        <RotateCw size={48} className="text-white animate-spin-slow" />
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-3">
        Putar Perangkatmu
      </h2>
      <p className="text-slate-300 text-base leading-relaxed max-w-xs">
        Eco Hero paling seru dimainkan dalam mode lanskap (horizontal).
        Silakan putar ponselmu untuk mulai bermain!
      </p>
      <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm">
        <span className="flex items-center gap-1.5 bg-slate-800 px-4 py-2 rounded-full">
          <RotateCw size={16} className="animate-spin-slow" />
          Rotasi ke lanskap
        </span>
      </div>
    </div>
  );
}
