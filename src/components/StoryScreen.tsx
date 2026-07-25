import { useState, useEffect } from 'react';
import { TreePine, ArrowRight, Sparkles } from 'lucide-react';
import { LEVELS } from '@/game/levels';
import { THEME_COLORS } from '@/game/constants';
import type { ThemeKey } from '@/game/types';

interface StoryScreenProps {
  levelId: number;
  onContinue: () => void;
}

export function StoryScreen({ levelId, onContinue }: StoryScreenProps) {
  const level = LEVELS.find((l) => l.id === levelId);
  const [visible, setVisible] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    setVisible(false);
    setTextIndex(0);
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setTextIndex(1), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [levelId]);

  if (!level) return null;
  const colors = THEME_COLORS[level.theme as ThemeKey];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 transition-all duration-1000"
      style={{
        background: `linear-gradient(to bottom, ${colors.skyTop}, ${colors.skyBottom})`,
      }}
    >
      {/* Tree of Life decoration */}
      <div className="relative mb-6 animate-tree-grow">
        <div className="w-24 h-24 rounded-full bg-green-600/40 flex items-center justify-center shadow-2xl">
          <TreePine size={56} className="text-white drop-shadow-lg" />
        </div>
        <div className="absolute -inset-2 rounded-full bg-green-400/20 animate-pulse-ring" />
      </div>

      {/* Story card */}
      <div
        className={`bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 max-w-lg w-full transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
            Level {level.id}
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {level.name}
          </div>
        </div>

        {/* Pohon Kehidupan dialogue */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <TreePine size={22} className="text-white" />
          </div>
          <div className="bg-green-50 rounded-2xl rounded-tl-sm p-4 flex-1">
            <p className="text-slate-800 leading-relaxed text-base">
              {textIndex >= 1 ? level.story.intro : '\u00A0'}
            </p>
          </div>
        </div>

        {/* Mission objectives */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles size={14} className="text-yellow-500" />
            Misi:
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Kumpulkan {level.trash.length} sampah
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Kalahkan {level.enemies.length} polusi
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              Temukan {level.secrets.length} bonus rahasia
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Capai bendera daur ulang
            </div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-lg shadow-lg transition-all"
        >
          Mulai Petualangan
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
