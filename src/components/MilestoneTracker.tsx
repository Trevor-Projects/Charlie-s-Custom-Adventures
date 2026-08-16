import React from 'react';
import { Milestone } from '../types';
import { CheckCircle2, Circle, Flag, MapPin } from 'lucide-react';

interface MilestoneTrackerProps {
  milestones: Milestone[];
  currentMilestoneIndex: number;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  milestones,
  currentMilestoneIndex,
}) => {
  return (
    <div className="bg-stone-900 border border-amber-900/40 rounded-2xl p-4 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
        <h3 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          Campaign Quest Arc & Milestones
        </h3>
        <span className="text-[11px] text-stone-400 font-mono">
          Chapter {currentMilestoneIndex + 1} of {milestones.length || 4}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {milestones.map((ms, idx) => {
          const isCompleted = ms.completed || idx < currentMilestoneIndex;
          const isCurrent = idx === currentMilestoneIndex;

          return (
            <div
              key={ms.chapter || idx}
              className={`p-3 rounded-xl border text-xs transition-all relative ${
                isCurrent
                  ? 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                  : isCompleted
                  ? 'bg-stone-950/80 border-emerald-900/60 text-stone-400'
                  : 'bg-stone-950/40 border-stone-800 opacity-60 text-stone-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono font-bold text-[10px] text-amber-400 uppercase tracking-wider">
                  Chapter {ms.chapter || idx + 1}
                </span>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Flag className="w-4 h-4 text-amber-400 animate-bounce" />
                ) : (
                  <Circle className="w-4 h-4 text-stone-700" />
                )}
              </div>

              <h4 className={`font-serif font-bold mb-1 ${isCurrent ? 'text-amber-100' : 'text-stone-300'}`}>
                {ms.title}
              </h4>
              <p className="text-[11px] line-clamp-2 leading-relaxed opacity-90">
                {ms.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
