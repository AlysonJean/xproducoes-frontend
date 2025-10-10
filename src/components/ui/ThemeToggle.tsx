import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../utils/logger';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { toggleTheme, isDark, theme, resolvedTheme } = useTheme();

  const handleToggle = () => {
    logger.debug('Theme toggle clicked', 'ThemeToggle', { theme, resolvedTheme, isDark });
    toggleTheme();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-foreground">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
      
      <button
        onClick={handleToggle}
        className={`
          relative w-11 h-6 rounded-full p-1 transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${isDark 
            ? 'bg-primary hover:bg-primary/90' 
            : 'bg-primary hover:bg-primary/90'
          }
        `}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        {/* Toggle Circle */}
        <div
          className={`
            w-4 h-4 bg-card rounded-full shadow-md transform transition-transform duration-300 ease-in-out
            flex items-center justify-center
            ${isDark ? 'translate-x-5' : 'translate-x-0'}
          `}
        >
          {/* Icon */}
          {isDark ? (
            <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
      </button>
      
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isDark ? 'Claro' : 'Escuro'}
        </span>
      )}
    </div>
  );
}

export default ThemeToggle;
