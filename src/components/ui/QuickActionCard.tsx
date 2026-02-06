import React from 'react';

export interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: {
    content: string | number;
    variant?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
  };
  hasNotification?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted';
  className?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  onClick,
  badge,
  hasNotification = false,
  color = 'primary',
  className = '',
}) => {
  const getColorClasses = (colorType: string) => {
    const colorMap = {
      primary: {
        bg: 'from-primary/15 to-primary/25 border-primary/30 hover:from-primary/20 hover:to-primary/30',
        text: 'text-primary group-hover:text-primary/90',
        icon: 'text-primary',
      },
      secondary: {
        bg: 'from-secondary/15 to-secondary/25 border-secondary/30 hover:from-secondary/20 hover:to-secondary/30',
        text: 'text-secondary group-hover:text-secondary/90',
        icon: 'text-secondary',
      },
      success: {
        bg: 'from-success/15 to-success/25 border-success/30 hover:from-success/20 hover:to-success/30',
        text: 'text-success group-hover:text-success/90',
        icon: 'text-success',
      },
      warning: {
        bg: 'from-warning/15 to-warning/25 border-warning/30 hover:from-warning/20 hover:to-warning/30',
        text: 'text-warning group-hover:text-warning/90',
        icon: 'text-warning',
      },
      info: {
        bg: 'from-info/15 to-info/25 border-info/30 hover:from-info/20 hover:to-info/30',
        text: 'text-info group-hover:text-info/90',
        icon: 'text-info',
      },
      destructive: {
        bg: 'from-destructive/15 to-destructive/25 border-destructive/30 hover:from-destructive/20 hover:to-destructive/30',
        text: 'text-destructive group-hover:text-destructive/90',
        icon: 'text-destructive',
      },
      muted: {
        bg: 'from-muted/40 to-muted/60 border-border hover:from-muted/50 hover:to-muted/70',
        text: 'text-muted-foreground group-hover:text-foreground',
        icon: 'text-muted-foreground group-hover:text-foreground',
      },
    };
    return colorMap[colorType as keyof typeof colorMap] || colorMap.primary;
  };

  const getBadgeClasses = (variant: string) => {
    const badgeMap = {
      default: 'bg-primary/25 text-primary border-primary/40',
      success: 'bg-success/25 text-success border-success/40',
      warning: 'bg-warning/25 text-warning border-warning/40',
      info: 'bg-info/25 text-info border-info/40',
      destructive: 'bg-destructive/25 text-destructive border-destructive/40',
    };
    return badgeMap[variant as keyof typeof badgeMap] || badgeMap.default;
  };

  const colors = getColorClasses(color);

  return (
    <button
      onClick={onClick}
      className={`
        quick-action-card
        relative group
        w-full p-6
        bg-gradient-to-br ${colors.bg}
        backdrop-blur-sm
        rounded-xl border
        hover:shadow-xl hover:shadow-black/10
        hover:scale-[1.02]
        focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2
        transition-all duration-300 ease-out
        text-left
        overflow-hidden
        ${className}
      `}
    >
      {/* Notificação */}
      {hasNotification && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-card notification-pulse" />
      )}

      {/* Badge */}
      {badge && (
        <div className={`
          floating-badge
          absolute top-3 right-3
          px-3 py-1.5
          text-xs font-semibold
          rounded-full border
          backdrop-blur-sm
          ${getBadgeClasses(badge.variant || 'default')}
        `}>
          {badge.content}
        </div>
      )}

      {/* Ícone */}
      <div className={`
        quick-action-card-icon
        mb-4
        ${colors.icon}
        transition-all duration-300
      `}>
        {icon}
      </div>

      {/* Conteúdo */}
      <div className="space-y-3">
        <h4 className={`
          text-lg font-semibold
          ${colors.text}
          transition-colors duration-300
        `}>
          {title}
        </h4>
        
        <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Indicador de hover - shimmer effect */}
      <div className="
        absolute inset-0
        rounded-xl
        bg-gradient-to-r from-transparent via-white/5 to-transparent
        opacity-0 group-hover:opacity-100
        transition-opacity duration-300
        pointer-events-none
      " />

      {/* Borda animada em hover */}
      <div className="
        absolute inset-0
        rounded-xl
        border-2 border-transparent
        group-hover:border-current/10
        transition-all duration-300
        pointer-events-none
      " />
    </button>
  );
};