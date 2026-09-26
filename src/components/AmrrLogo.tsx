import React from 'react';

interface AmrrLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'dark' | 'light' | 'monochrome';
}

export const AmrrLogo: React.FC<AmrrLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
}) => {
  const sizeClasses = {
    xs: {
      text: 'text-lg font-black tracking-[-0.03em]',
      dot: 'w-2 h-2 ml-0.5 mb-0.5'
    },
    sm: {
      text: 'text-xl sm:text-2xl font-black tracking-[-0.03em]',
      dot: 'w-2.5 h-2.5 ml-1 mb-0.5'
    },
    md: {
      text: 'text-2xl sm:text-3xl font-black tracking-[-0.03em]',
      dot: 'w-3 h-3 ml-1 mb-1'
    },
    lg: {
      text: 'text-4xl sm:text-5xl font-black tracking-[-0.04em]',
      dot: 'w-4 h-4 ml-1.5 mb-1.5'
    },
    xl: {
      text: 'text-5xl sm:text-6xl md:text-7xl font-black tracking-[-0.04em]',
      dot: 'w-5 sm:w-6 h-5 sm:h-6 ml-2 mb-2'
    },
    hero: {
      text: 'text-6xl sm:text-8xl md:text-9xl font-black tracking-[-0.04em]',
      dot: 'w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 ml-2.5 sm:ml-3 mb-2 sm:mb-3'
    }
  }[size];

  const variantStyles = {
    dark: {
      main: 'text-black',
      dot: 'bg-black'
    },
    light: {
      main: 'text-white',
      dot: 'bg-white'
    },
    monochrome: {
      main: 'text-current',
      dot: 'bg-current'
    }
  }[variant] || {
    main: 'text-black',
    dot: 'bg-black'
  };

  return (
    <div className={`inline-flex items-baseline select-none ${className}`}>
      {/* AMRR Wordmark */}
      <span 
        className={`font-black uppercase leading-none font-['Montserrat',sans-serif] ${sizeClasses.text} ${variantStyles.main}`}
        style={{ letterSpacing: '-0.02em' }}
      >
        AMRR
      </span>
      {/* Precision Circular Dot */}
      <span 
        className={`rounded-full shrink-0 ${sizeClasses.dot} ${variantStyles.dot}`}
      />
    </div>
  );
};
