import React from 'react';

export const MobileButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  className = '' 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}) => {
  const baseClasses = "min-h-[48px] px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 touch-manipulation active:scale-95";
  const variantClasses = variant === 'primary' 
    ? "bg-gradient-to-r from-[#f5566d] to-[#fb7185] text-white shadow-lg"
    : "bg-[rgba(63,185,255,0.12)] border border-[rgba(63,185,255,0.35)] text-[#b9e4ff]";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const MobileCard = ({ 
  children, 
  className = '',
  selected = false 
}: {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
}) => {
  return (
    <div className={`
      rounded-xl border p-4 transition-all duration-200
      ${selected 
        ? 'border-[rgba(63,185,255,0.45)] bg-[rgba(63,185,255,0.12)]' 
        : 'border-[rgba(255,255,255,0.08)] bg-[rgba(15,18,29,0.72)]'
      }
      ${className}
    `}>
      {children}
    </div>
  );
};

export const TVText = ({ 
  size = 'base',
  children,
  className = ''
}: {
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'text-sm lg:text-base',
    base: 'text-base lg:text-lg xl:text-xl',
    lg: 'text-lg lg:text-xl xl:text-2xl',
    xl: 'text-xl lg:text-2xl xl:text-3xl',
    '2xl': 'text-2xl lg:text-3xl xl:text-4xl',
    '3xl': 'text-3xl lg:text-4xl xl:text-5xl'
  };
  
  return <span className={`${sizeClasses[size]} ${className}`}>{children}</span>;
};