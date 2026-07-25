import { Star } from 'lucide-react';

interface StarRatingProps {
  /** Filled stars (0-3). */
  value: number;
  max?: number;
  size?: number;
  /** Play a staggered pop-in animation (used on the level-complete screen). */
  animate?: boolean;
  className?: string;
}

/** Three-star rating row shared by the level-complete screen and level map. */
export function StarRating({
  value,
  max = 3,
  size = 28,
  animate = false,
  className = '',
}: StarRatingProps) {
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: max }).map((_, i) => {
        const earned = i < value;
        return (
          <Star
            key={i}
            size={size}
            className={
              earned
                ? 'text-yellow-400 fill-yellow-400 drop-shadow'
                : 'text-slate-400/50 fill-slate-500/20'
            }
            style={
              animate
                ? { animation: `star-pop 420ms ${i * 180 + 200}ms both` }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
