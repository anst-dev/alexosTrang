import React from 'react';
import * as LucideIcons from 'lucide-react';

// Map Material Symbols names to Lucide React icons
const iconMap: Record<string, keyof typeof LucideIcons> = {
  // Navigation
  'menu': 'Menu',
  'close': 'X',
  'arrow_forward': 'ArrowRight',
  'arrow_back': 'ArrowLeft',
  'home': 'Home',
  
  // Actions
  'add': 'Plus',
  'edit': 'Pencil',
  'edit_note': 'FileEdit',
  'delete': 'Trash2',
  'check': 'Check',
  'check_circle': 'CheckCircle',
  'send': 'Send',
  'restart_alt': 'RotateCcw',
  'refresh': 'RefreshCw',
  'play_arrow': 'Play',
  'pause': 'Pause',
  'power_settings_new': 'Power',
  'copy': 'Copy',
  'minus': 'Minus',
  'chevron_down': 'ChevronDown',
  'chevron_up': 'ChevronUp',
  
  // Objects
  'favorite': 'Heart',
  'lightbulb': 'Lightbulb',
  'bolt': 'Zap',
  'psychology': 'Brain',
  'emoji_events': 'Trophy',
  'local_fire_department': 'Flame',
  'priority_high': 'AlertCircle',
  
  // Calendar & Time
  'calendar_today': 'Calendar',
  'calendar_month': 'CalendarDays',
  'schedule': 'Clock',
  'history': 'History',
  'hourglass_empty': 'Hourglass',
  
  // Views
  'dashboard': 'LayoutDashboard',
  'flag': 'Flag',
  'inbox': 'Inbox',
  'check_box': 'CheckSquare',
  'timer': 'Timer',
  'book': 'BookOpen',
  
  // Status
  'sentiment_satisfied': 'Smile',
  'sentiment_neutral': 'Meh',
  'sentiment_dissatisfied': 'Frown',
  'sentiment_very_satisfied': 'Laugh',
  'sentiment_very_dissatisfied': 'Angry',
};

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', size }) => {
  const lucideIconName = iconMap[name];
  
  if (lucideIconName && LucideIcons[lucideIconName]) {
    const LucideIcon = LucideIcons[lucideIconName] as React.ComponentType<{
      className?: string;
      size?: number;
    }>;
    
    // Extract size from className if not provided
    let iconSize = size;
    if (!iconSize) {
      if (className.includes('text-4xl')) iconSize = 36;
      else if (className.includes('text-3xl')) iconSize = 30;
      else if (className.includes('text-2xl')) iconSize = 24;
      else if (className.includes('text-xl')) iconSize = 20;
      else if (className.includes('text-lg')) iconSize = 18;
      else if (className.includes('text-sm')) iconSize = 14;
      else if (className.includes('text-xs')) iconSize = 12;
      else iconSize = 16;
    }
    
    // Filter out text-size classes for lucide icons
    const filteredClassName = className
      .replace(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl)/g, '')
      .trim();
    
    return <LucideIcon className={filteredClassName} size={iconSize} />;
  }
  
  // Fallback to Material Symbols with system font emoji fallback
  return (
    <span 
      className={`material-symbols-outlined ${className}`}
      style={{ 
        fontFamily: "'Material Symbols Outlined', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif" 
      }}
    >
      {name}
    </span>
  );
};

export default Icon;
