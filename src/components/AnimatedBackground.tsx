import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

const AnimatedBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Create initial particles
    const initialParticles: Particle[] = [];
    const colors = ['#1E40AF', '#059669', '#DC2626', '#7C3AED', '#EA580C'];
    
    for (let i = 0; i < 15; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setParticles(initialParticles);

    // Animation loop
    const animateParticles = () => {
      setParticles(prev => prev.map(particle => {
        let newX = particle.x + particle.speedX;
        let newY = particle.y + particle.speedY;
        
        // Wrap around edges
        if (newX > 100) newX = 0;
        if (newX < 0) newX = 100;
        if (newY > 100) newY = 0;
        if (newY < 0) newY = 100;
        
        return {
          ...particle,
          x: newX,
          y: newY
        };
      }));
    };

    const interval = setInterval(animateParticles, 100);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating geometric shapes */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-accent/10 rounded-full animate-pulse" 
             style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-success/10 rounded-lg rotate-45 animate-pulse" 
             style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-3/4 w-20 h-20 bg-warning/10 rounded-full animate-pulse" 
             style={{ animationDelay: '1s', animationDuration: '5s' }} />
      </div>

      {/* Moving gradient orbs */}
      <div className="absolute inset-0">
        <div className="absolute animate-[float_20s_ease-in-out_infinite] opacity-20">
          <div className="w-96 h-96 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-3xl" 
               style={{ 
                 transform: 'translate(-50%, -50%)',
                 left: '20%',
                 top: '30%'
               }} />
        </div>
        <div className="absolute animate-[float_25s_ease-in-out_infinite] opacity-20" 
             style={{ animationDelay: '-10s' }}>
          <div className="w-80 h-80 bg-gradient-to-r from-success/30 to-warning/30 rounded-full blur-3xl" 
               style={{ 
                 transform: 'translate(-50%, -50%)',
                 right: '20%',
                 bottom: '30%'
               }} />
        </div>
      </div>

      {/* Animated particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full transition-all duration-1000 ease-linear"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      {/* Animated grid lines */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
          {Array.from({ length: 96 }).map((_, i) => (
            <div 
              key={i} 
              className="border border-primary/20 animate-pulse" 
              style={{ 
                animationDelay: `${i * 0.1}s`,
                animationDuration: '3s'
              }} 
            />
          ))}
        </div>
      </div>

      {/* Floating construction elements */}
      <div className="absolute inset-0">
        <div className="absolute animate-[slow-float_30s_ease-in-out_infinite] opacity-10" 
             style={{ left: '10%', top: '20%' }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="absolute animate-[slow-float_35s_ease-in-out_infinite] opacity-10" 
             style={{ right: '15%', top: '60%', animationDelay: '-15s' }}>
          <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor" className="text-success">
            <path d="M3 21h18v-2H3v2zM5 17h14v-2H5v2zM7 13h10v-2H7v2zM9 9h6V7H9v2zM11 5h2V3h-2v2z"/>
          </svg>
        </div>
        <div className="absolute animate-[slow-float_40s_ease-in-out_infinite] opacity-10" 
             style={{ left: '70%', top: '25%', animationDelay: '-20s' }}>
          <svg width="45" height="45" viewBox="0 0 24 24" fill="currentColor" className="text-warning">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBackground;