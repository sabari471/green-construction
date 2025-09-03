import React from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'rotate' | 'flip';
  delay?: number;
  duration?: number;
  className?: string;
  triggerOnce?: boolean;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 600,
  className = '',
  triggerOnce = true,
}) => {
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
    triggerOnce,
    delay,
  });

  const getTransformClass = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return 'translate-y-16 opacity-0';
        case 'down':
          return '-translate-y-16 opacity-0';
        case 'left':
          return 'translate-x-16 opacity-0';
        case 'right':
          return '-translate-x-16 opacity-0';
        case 'scale':
          return 'scale-95 opacity-0';
        case 'rotate':
          return 'rotate-3 scale-95 opacity-0';
        case 'flip':
          return 'rotateX-90 opacity-0';
        default:
          return 'translate-y-16 opacity-0';
      }
    }
    return 'translate-y-0 translate-x-0 scale-100 rotate-0 opacity-100';
  };

  const getDuration = () => {
    switch (duration) {
      case 300:
        return 'duration-300';
      case 500:
        return 'duration-500';
      case 700:
        return 'duration-700';
      case 1000:
        return 'duration-1000';
      default:
        return 'duration-600';
    }
  };

  return (
    <div
      ref={elementRef}
      className={`transform transition-all ${getDuration()} ease-out ${getTransformClass()} ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;