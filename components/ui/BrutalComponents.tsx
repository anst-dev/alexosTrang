import React, { useState } from 'react';
import { Icon } from './Icon';

interface BrutalCardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  icon?: string;
  noPadding?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  className = '',
  title,
  icon,
  noPadding = false,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-white border-4 border-neo-black shadow-hard flex flex-col overflow-hidden ${className}`}>
      {title && (
        <div className="border-b-4 border-neo-black p-4 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xl font-display uppercase tracking-tight flex items-center gap-3">
            {icon && <Icon name={icon} size={20} />}
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-6 h-6 border-2 border-neo-black bg-white hover:bg-neo-lime flex items-center justify-center transition-all"
                title={isCollapsed ? "Mở rộng" : "Thu nhỏ"}
              >
                <Icon name={isCollapsed ? "chevron_down" : "minus"} size={14} />
              </button>
            )}
            <div className="flex gap-1">
               <div className="w-3 h-3 bg-neo-black rounded-none"></div>
               <div className="w-3 h-3 border-2 border-neo-black rounded-none"></div>
            </div>
          </div>
        </div>
      )}
      {!isCollapsed && (
        <div className={noPadding ? '' : 'p-6'}>
          {children}
        </div>
      )}
    </div>
  );
};

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  icon?: string;
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  icon,
  ...props 
}) => {
  const baseStyles = "font-mono font-bold uppercase border-2 border-neo-black shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 px-6 py-3";
  
  const variants = {
    primary: "bg-neo-black text-white hover:bg-neutral-800",
    secondary: "bg-white text-neo-black hover:bg-gray-100",
    accent: "bg-neo-lime text-neo-black hover:bg-lime-400",
    danger: "bg-neo-red text-white hover:bg-red-600",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
};

export const ProgressBar: React.FC<{ progress: number; colorClass?: string; heightClass?: string }> = ({ 
  progress, 
  colorClass = 'bg-neo-black',
  heightClass = 'h-6' 
}) => {
  return (
    <div className={`w-full border-2 border-neo-black bg-white p-1 ${heightClass}`}>
      <div 
        className={`h-full ${colorClass} transition-all duration-500`} 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};
