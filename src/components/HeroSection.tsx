import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-construction.jpg";
import AnimatedBackground from "./AnimatedBackground";
import ScrollReveal from "./ScrollReveal";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Sustainable construction materials and circular economy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-transparent" />
        {/* Animated Background */}
        <AnimatedBackground />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center lg:text-left">
          <ScrollReveal direction="scale" duration={800}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-tight">
              Building a{" "}
              <span className="bg-gradient-to-r from-accent to-success bg-clip-text text-transparent">
                Sustainable
              </span>{" "}
              Future
            </h1>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={200} duration={700}>
            <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/90 mb-6 sm:mb-8 leading-relaxed max-w-3xl mx-auto lg:mx-0">
              The world's first marketplace for circular construction materials, powered by intelligent forecasting and a thriving community of civil engineers.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={400} duration={600}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 justify-center lg:justify-start">
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg w-full sm:w-auto"
              onClick={() => navigate('/marketplace')}
            >
              Explore Marketplace
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto"
              onClick={() => navigate('/forecast')}
            >
              View Forecast Tool
            </Button>
            </div>
          </ScrollReveal>

          {/* Quick Features */}
          <ScrollReveal direction="up" delay={600} duration={800}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto lg:mx-0">
            <div className="flex items-center space-x-3 text-primary-foreground/90 bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <Recycle className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base">Circular Marketplace</h3>
                <p className="text-xs sm:text-sm opacity-80 truncate">Reusable materials</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-primary-foreground/90 bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-success-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base">Smart Forecasting</h3>
                <p className="text-xs sm:text-sm opacity-80 truncate">Cost predictions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-primary-foreground/90 bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-warning-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base">Expert Community</h3>
                <p className="text-xs sm:text-sm opacity-80 truncate">Civil engineers</p>
              </div>
            </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-primary-foreground/50 rounded-full p-1">
          <div className="w-1 h-3 bg-primary-foreground/70 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;