import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface LanguageToggleProps {
  className?: string;
  variant?: 'pill' | 'compact' | 'segmented';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ 
  className = '',
  variant = 'pill'
}) => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  if (variant === 'segmented') {
    return (
      <div 
        className={`inline-flex items-center bg-[#F1F5F9] p-0.5 rounded-xl border border-[#CBD5E1] shadow-2xs ${className}`}
        title={t('lang.switchTooltip', 'Switch Language / भाषा बदलें')}
        role="group"
        aria-label="Language selection"
      >
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-white text-[#2563EB] shadow-2xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
          aria-pressed={language === 'en'}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('hi')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            language === 'hi'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
          aria-pressed={language === 'hi'}
        >
          हिंदी
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      id="global-language-toggle"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs group ${
        language === 'hi'
          ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] hover:bg-[#DBEAFE]'
          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
      } ${className}`}
      title={t('lang.switchTooltip', 'Switch Language / भाषा बदलें')}
      aria-label="Toggle language between English and Hindi"
    >
      <Globe className={`w-3.5 h-3.5 transition-colors ${language === 'hi' ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#2563EB]'}`} />
      <span className="font-sans">
        {language === 'en' ? 'English' : 'हिंदी'}
      </span>
      <span className="text-[9.5px] font-mono font-bold text-[#94A3B8] group-hover:text-[#64748B]">
        {language === 'en' ? '→ HI' : '→ EN'}
      </span>
    </button>
  );
};

export default LanguageToggle;
