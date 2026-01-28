import React from 'react';
import { Temperature } from '../types';
import { Snowflake, Flame } from 'lucide-react';

interface TemperatureToggleProps {
  value: Temperature;
  onChange: (temp: Temperature) => void;
}

export const TemperatureToggle: React.FC<TemperatureToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex bg-toss-grey-100 rounded-xl p-1 w-full h-10">
      <button
        onClick={() => onChange('HOT')}
        className={`flex-1 flex items-center justify-center rounded-lg transition-all duration-200 ${
          value === 'HOT'
            ? 'bg-toss-red text-white shadow-sm font-bold'
            : 'text-toss-grey-400 hover:text-toss-grey-600'
        }`}
        title="따뜻하게 (HOT)"
        aria-label="Hot"
      >
        <Flame size={18} fill={value === 'HOT' ? "currentColor" : "none"} />
      </button>
      <button
        onClick={() => onChange('ICE')}
        className={`flex-1 flex items-center justify-center rounded-lg transition-all duration-200 ${
          value === 'ICE'
            ? 'bg-toss-blue text-white shadow-sm font-bold'
            : 'text-toss-grey-400 hover:text-toss-grey-600'
        }`}
        title="차갑게 (ICE)"
        aria-label="Ice"
      >
        <Snowflake size={18} fill={value === 'ICE' ? "currentColor" : "none"} />
      </button>
    </div>
  );
};