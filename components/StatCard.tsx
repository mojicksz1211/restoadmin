import React from 'react';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Legacy: single trend string (e.g. "+12.5%") */
  trend?: string;
  /** Amount change vs previous period (e.g. -685700). When set, shown with changePercent. */
  changeAmount?: number;
  /** Percent change vs previous period (e.g. -11.91). Shown with changeAmount. */
  changePercent?: number;
  /** If true, format changeAmount as currency (₱). Default true when changeAmount is provided. */
  formatChangeAsCurrency?: boolean;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  changeAmount,
  changePercent,
  formatChangeAsCurrency = true,
  color,
}) => {
  const { t } = useTranslation('common');
  const hasChange = changeAmount !== undefined && changeAmount !== null;
  const isPositive = (hasChange && changeAmount > 0) || (trend?.startsWith('+'));
  const isNegative = (hasChange && changeAmount < 0) || (trend?.startsWith('-'));
  const trendClass = isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-slate-500';

  const sign = changeAmount != null && changeAmount > 0 ? '+' : changeAmount != null && changeAmount < 0 ? '-' : '';
  const pctSign = changePercent != null && changePercent > 0 ? '+' : '';
  const changeLabel =
    hasChange && changePercent !== undefined && changePercent !== null
      ? formatChangeAsCurrency
        ? `${sign}₱${Math.abs(changeAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pctSign}${changePercent.toFixed(2)}%)`
        : `${sign}${(changeAmount ?? 0).toLocaleString()} (${pctSign}${changePercent.toFixed(2)}%)`
      : trend;

  // Map color classes to gradient backgrounds for premium look
  const getGradientClass = (colorClass: string) => {
    if (colorClass.includes('green')) return 'from-emerald-500 to-green-600';
    if (colorClass.includes('blue')) return 'from-blue-500 to-blue-700';
    if (colorClass.includes('orange')) return 'from-orange-500 to-amber-600';
    if (colorClass.includes('amber')) return 'from-amber-500 to-orange-500';
    if (colorClass.includes('emerald')) return 'from-emerald-500 to-teal-600';
    if (colorClass.includes('slate')) return 'from-slate-500 to-slate-700';
    return 'from-blue-500 to-blue-700';
  };

  const gradientClass = getGradientClass(color);

  // Calculate responsive font size based on value length to prevent wrapping
  // This ensures all cards maintain consistent, readable display regardless of value size
  const valueStr = String(value);
  const valueLength = valueStr.length;
  let fontSizeClass = 'text-2xl md:text-[28px]';
  
  // Progressive font size reduction to ensure numbers stay on one line
  // Handles all ranges: hundreds, thousands, millions, billions
  // Applied consistently to ALL cards automatically
  if (valueLength > 20) {
    // Billions: ₱10,000,000,000.00 (22 chars)
    fontSizeClass = 'text-sm md:text-[14px]';
  } else if (valueLength > 18) {
    // Large millions: ₱999,999,999.99 (19 chars)
    fontSizeClass = 'text-base md:text-[16px]';
  } else if (valueLength > 15) {
    // Medium millions: ₱99,999,999.99 (16 chars)
    fontSizeClass = 'text-lg md:text-[18px]';
  } else if (valueLength > 12) {
    // Small millions: ₱9,999,999.99 (13 chars)
    fontSizeClass = 'text-lg md:text-[20px]';
  } else if (valueLength > 10) {
    // Large thousands: ₱999,999.99 (11 chars)
    fontSizeClass = 'text-xl md:text-[22px]';
  } else if (valueLength > 8) {
    // Medium thousands: ₱99,999.99 (9 chars)
    fontSizeClass = 'text-xl md:text-[24px]';
  }
  // Default: Small values (≤8 chars) use full size 28px

  return (
    <div className="group relative bg-white p-5 md:p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Premium gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass}`} />
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      <div className="relative flex items-start justify-between gap-2 md:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.05em] mb-3 leading-tight">{title}</p>
          <div className="mb-3 min-h-[32px] flex items-center">
            <h3 className={`${fontSizeClass} font-bold text-slate-900 leading-none tabular-nums whitespace-nowrap`}>
              {value}
            </h3>
          </div>
          {(changeLabel != null && changeLabel !== '') && (
            <div className="flex flex-col gap-1 mt-2">
              <p className={`text-xs font-semibold leading-tight ${trendClass} tabular-nums`}>
                {changeLabel}
              </p>
              <span className="text-[10px] text-slate-500 font-medium leading-tight">{t('compared_to_last_month')}</span>
            </div>
          )}
        </div>
        
        {/* Premium icon container with gradient */}
        <div className="relative flex-shrink-0 mt-1 self-start">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} rounded-2xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity`} />
          <div className={`relative p-3 md:p-3.5 rounded-2xl bg-gradient-to-br ${gradientClass} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-sm flex-shrink-0" />
          </div>
        </div>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

export default StatCard;
