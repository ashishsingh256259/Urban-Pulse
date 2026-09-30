import React from 'react';

interface UrbanPulseLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
  variant?: 'light' | 'dark' | 'color';
}

export const UrbanPulseLogo: React.FC<UrbanPulseLogoProps> = ({
  className = "w-9 h-9",
  size,
  showText = false,
  textClassName = "text-slate-900 font-black tracking-tight text-base sm:text-lg",
  subtitleClassName = "text-[10px] font-mono text-blue-600 font-bold tracking-wider uppercase -mt-0.5",
}) => {
  const style = size ? { width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size } : undefined;

  const logoImg = (
    <img 
      src="/logo.svg" 
      alt="UrbanPulse Guardian Logo" 
      className={`object-contain shrink-0 transition-transform duration-200 hover:scale-105 ${className}`}
      style={style}
    />
  );

  if (!showText) {
    return logoImg;
  }

  return (
    <div className="flex items-center gap-2.5 select-none">
      {logoImg}
      <div className="flex flex-col text-left leading-none">
        <span className={textClassName}>
          UrbanPulse
        </span>
        <span className={subtitleClassName}>
          GUARDIAN AI
        </span>
      </div>
    </div>
  );
};

export default UrbanPulseLogo;
