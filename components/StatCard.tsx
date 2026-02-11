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
  const trendClass = isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-slate-500';

  const sign = changeAmount != null && changeAmount > 0 ? '+' : changeAmount != null && changeAmount < 0 ? '-' : '';
  const pctSign = changePercent != null && changePercent > 0 ? '+' : '';
  const changeLabel =
    hasChange && changePercent !== undefined && changePercent !== null
      ? formatChangeAsCurrency
        ? `${sign}₱${Math.abs(changeAmount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pctSign}${changePercent.toFixed(2)}%)`
        : `${sign}${(changeAmount ?? 0).toLocaleString()} (${pctSign}${changePercent.toFixed(2)}%)`
      : trend;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {(changeLabel != null && changeLabel !== '') && (
          <p className={`text-xs mt-2 font-medium ${trendClass}`}>
            {changeLabel} {t('compared_to_last_month')}
          </p>
        )}
      </div>
      <div className={`p-4 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );
};

export default StatCard;
