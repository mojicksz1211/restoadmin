import React from 'react';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  const { t } = useTranslation('common');
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
            {trend} {t('compared_to_last_month')}
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
