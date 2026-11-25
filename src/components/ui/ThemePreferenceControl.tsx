import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Theme, useTheme } from '../../context/ThemeContext';

interface ThemePreferenceControlProps {
  compact?: boolean;
  variant?: 'segmented' | 'toggle' | 'icon';
}

const THEME_OPTIONS: ReadonlyArray<{
  value: Theme;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'light', label: 'Terang', Icon: Sun },
  { value: 'dark', label: 'Gelap', Icon: Moon },
];

export const ThemePreferenceControl: React.FC<ThemePreferenceControlProps> = ({
  compact = false,
  variant = 'segmented',
}) => {
  const { theme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  if (variant === 'icon') {
    const isDark = theme === 'dark';
    const nextActionLabel = isDark ? 'Aktifkan Light Mode' : 'Aktifkan Dark Mode';

    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={nextActionLabel}
        title={nextActionLabel}
        className="relative p-2 rounded-xl text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] flex items-center justify-center"
      >
        <span className="relative w-5 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.span
                key="moon"
                initial={shouldReduceMotion ? false : { opacity: 0, rotate: -45, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.7 }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeInOut' }
                }
                className="inline-flex items-center justify-center"
              >
                <Moon className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span
                key="sun"
                initial={shouldReduceMotion ? false : { opacity: 0, rotate: 45, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.7 }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeInOut' }
                }
                className="inline-flex items-center justify-center"
              >
                <Sun className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
    );
  }

  if (variant === 'toggle') {
    const isDark = theme === 'dark';
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        role="switch"
        aria-checked={isDark}
        aria-label="Dark mode"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#262626] ${
          isDark ? 'bg-[#F97316]' : 'bg-[#D1D5DB] dark:bg-[#525252]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Preferensi Tampilan"
      className={`inline-flex items-center rounded-xl border border-[#E5E7EB] dark:border-[#404040] bg-[#F3F4F6] dark:bg-[#303030] p-1 ${
        compact ? 'gap-1' : 'gap-1.5'
      }`}
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            className={`inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer whitespace-nowrap select-none ${
              compact
                ? 'min-h-[36px] px-3 py-1.5 gap-1.5 text-xs'
                : 'min-h-[38px] px-4 py-2 gap-2 text-xs sm:text-sm'
            } ${
              isActive
                ? 'bg-[#F97316] text-white font-semibold shadow-xs'
                : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] font-medium'
            }`}
          >
            <Icon className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
