import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Shimmer animation utility
 */
const shimmerClass = "bg-gradient-to-r from-slate-300 via-slate-50 to-slate-300 bg-[length:200%_100%] animate-shimmer";

/**
 * Stat Card Skeleton
 */
export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="group relative bg-gradient-to-br from-slate-50 to-white p-5 md:p-6 rounded-2xl shadow-2xl border-2 border-orange-200 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 animate-pulse" />
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute inset-0 ${shimmerClass}`} style={{ opacity: 0.9 }} />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
      </div>
      <div className="absolute -inset-3 bg-gradient-to-r from-orange-300 via-amber-300 to-orange-300 rounded-2xl opacity-40 blur-xl animate-pulse-slow" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-4 w-28 rounded-lg bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="h-11 w-44 rounded-xl bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="h-4 w-36 rounded-md bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl blur-xl opacity-60 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Chart Skeleton - matches actual chart style
 */
export const ChartSkeleton: React.FC<{ height?: number; type?: 'bar' | 'stacked' }> = ({ height = 320, type = 'bar' }) => {
  return (
    <div className="relative w-full bg-white rounded-xl overflow-hidden" style={{ height: `${height}px` }}>
      <div className={`absolute inset-0 ${shimmerClass}`} style={{ opacity: 0.15 }} />
      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-px bg-slate-200" style={{ opacity: 0.5 }} />
        ))}
      </div>
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-2">
        {[...Array(7)].map((_, i) => {
          const heights = [65, 45, 80, 35, 70, 50, 60];
          const baseColor = type === 'stacked' 
            ? ['#78909c', '#9ccc65', '#42a5f5', '#ec407a', '#8b5cf6'][i % 5]
            : '#22c55e';
          return (
            <div
              key={i}
              className="rounded-t-md animate-pulse"
              style={{ 
                width: '12%',
                height: `${heights[i]}%`,
                backgroundColor: baseColor,
                opacity: 0.3,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.5s'
              }}
            />
          );
        })}
      </div>
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Table/List Skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="relative flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className={`absolute inset-0 ${shimmerClass} opacity-20`} />
          <div className="relative z-10 flex items-center gap-4 w-full">
            <div className={`w-12 h-12 rounded-xl ${shimmerClass} flex-shrink-0`} />
            <div className="flex-1 space-y-2 min-w-0">
              <div className={`h-4 w-3/4 rounded-md ${shimmerClass}`} />
              <div className={`h-3 w-1/2 rounded-md ${shimmerClass}`} />
            </div>
            <div className={`h-6 w-20 rounded-lg ${shimmerClass} flex-shrink-0`} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Chart Loading Skeleton
 */
export const ChartLoadingSkeleton: React.FC<{ type?: 'bar' | 'line' | 'stacked' }> = ({ type = 'bar' }) => {
  if (type === 'line') {
    return (
      <div className="relative w-full h-full bg-white rounded-xl overflow-hidden">
        <div className={`absolute inset-0 ${shimmerClass}`} style={{ opacity: 0.15 }} />
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-px bg-slate-200" style={{ opacity: 0.5 }} />
          ))}
        </div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <path
            d="M 40 200 Q 100 150, 160 120 T 280 80 T 360 60"
            stroke="#22c55e"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
            className="animate-pulse"
          />
        </svg>
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Loading...</span>
          </div>
        </div>
      </div>
    );
  }
  return <ChartSkeleton height={320} type={type === 'stacked' ? 'stacked' : 'bar'} />;
};

