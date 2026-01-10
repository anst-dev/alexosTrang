import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg bg-white border-4 border-neo-black shadow-hard-lg animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-neo-black bg-gray-50">
          <h2 className="text-xl font-display font-black uppercase flex items-center gap-2">
            <Icon name="edit" size={20} />
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-neo-red hover:text-white border-2 border-neo-black transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Form Input Component
interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'date';
  required?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder = '', 
  type = 'text',
  required = false 
}) => (
  <div className="mb-4">
    <label className="block text-xs font-bold font-mono uppercase mb-2">
      {label} {required && <span className="text-neo-red">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 border-2 border-neo-black font-mono focus:outline-none focus:bg-neo-yellow/20 transition-colors"
      required={required}
    />
  </div>
);

// Form Select Component
interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, value, onChange, options }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold font-mono uppercase mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 border-2 border-neo-black font-mono focus:outline-none focus:bg-neo-yellow/20 transition-colors bg-white"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

// Form Color Select Component (với preview màu sắc)
interface FormColorSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export const FormColorSelect: React.FC<FormColorSelectProps> = ({ label, value, onChange, options }) => {
  // Map tên màu sang tiếng Việt để hiển thị
  const colorNameMap: Record<string, string> = {
    'bg-neo-black': 'Đen',
    'bg-neo-blue': 'Xanh dương',
    'bg-neo-purple': 'Tím',
    'bg-neo-orange': 'Cam',
    'bg-neo-lime': 'Xanh lá',
    'bg-neo-red': 'Đỏ',
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold font-mono uppercase mb-2">{label}</label>
      <div className="grid grid-cols-3 gap-3">
        {options.map(colorClass => (
          <button
            key={colorClass}
            type="button"
            onClick={() => onChange(colorClass)}
            className={`
              relative p-4 border-4 transition-all
              ${value === colorClass ? 'border-neo-black shadow-hard scale-105' : 'border-gray-300 hover:border-gray-400 hover:scale-102'}
              ${colorClass}
              flex flex-col items-center justify-center gap-2 text-white font-bold text-xs uppercase
            `}
            title={colorNameMap[colorClass] || colorClass}
          >
            {/* Checkmark nếu được chọn */}
            {value === colorClass && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-white border-2 border-neo-black flex items-center justify-center">
                <Icon name="check" size={12} className="text-black" />
              </div>
            )}
            {/* Tên màu */}
            <span className={`text-shadow ${colorClass === 'bg-neo-lime' || colorClass === 'bg-neo-orange' ? 'text-black' : 'text-white'}`}>
              {colorNameMap[colorClass] || colorClass}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Form Textarea Component
interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder = '',
  rows = 4 
}) => (
  <div className="mb-4">
    <label className="block text-xs font-bold font-mono uppercase mb-2">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full p-3 border-2 border-neo-black font-mono focus:outline-none focus:bg-neo-yellow/20 transition-colors resize-none"
    />
  </div>
);

// Form Actions Component
interface FormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  onCancel, 
  onSubmit, 
  submitLabel = 'Lưu',
  cancelLabel = 'Hủy' 
}) => (
  <div className="flex gap-4 mt-6 pt-4 border-t-2 border-dashed border-gray-200">
    <button
      onClick={onCancel}
      className="flex-1 py-3 border-2 border-neo-black font-bold uppercase bg-white hover:bg-gray-100 transition-colors"
    >
      {cancelLabel}
    </button>
    <button
      onClick={onSubmit}
      className="flex-1 py-3 border-2 border-neo-black font-bold uppercase bg-neo-black text-white hover:bg-neo-lime hover:text-black transition-colors shadow-hard hover:shadow-none"
    >
      {submitLabel}
    </button>
  </div>
);

// ============================================
// Toast Component
// ============================================
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-neo-lime', border: 'border-neo-black', icon: 'check_circle' },
  error: { bg: 'bg-neo-red text-white', border: 'border-neo-black', icon: 'error' },
  warning: { bg: 'bg-neo-orange', border: 'border-neo-black', icon: 'warning' },
  info: { bg: 'bg-neo-blue text-white', border: 'border-neo-black', icon: 'info' },
};

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const style = toastStyles[type];

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-5 duration-300">
      <div className={`flex items-center gap-3 px-5 py-4 border-4 ${style.border} ${style.bg} shadow-hard-lg min-w-[280px] max-w-md`}>
        <Icon name={style.icon} size={24} />
        <p className="font-mono font-bold text-sm flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center hover:bg-black/10 transition-colors"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// Input Modal Component (thay thế prompt)
// ============================================
interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: 'text' | 'number';
  submitLabel?: string;
  cancelLabel?: string;
}

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder = '',
  defaultValue = '',
  inputType = 'text',
  submitLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
}) => {
  const [value, setValue] = React.useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = () => {
    onSubmit(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white border-4 border-neo-black shadow-hard-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-neo-black bg-neo-yellow">
          <h2 className="text-lg font-display font-black uppercase flex items-center gap-2">
            <Icon name="edit" size={20} />
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-neo-red hover:text-white border-2 border-neo-black transition-colors bg-white"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <input
            ref={inputRef}
            type={inputType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-4 border-4 border-neo-black font-mono text-lg focus:outline-none focus:border-neo-blue transition-colors"
          />
          
          <div className="flex gap-4 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-4 border-neo-black font-bold uppercase bg-white hover:bg-gray-100 transition-colors shadow-hard hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 border-4 border-neo-black font-bold uppercase bg-neo-black text-white hover:bg-neo-lime hover:text-black transition-colors shadow-hard hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
