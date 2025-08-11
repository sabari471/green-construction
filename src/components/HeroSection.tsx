import { Button } from "@/components/ui/button";
import { ArrowRight, Recycle, TrendingUp, Users } from "lucide-react";
import heroImage from "@/assets/hero-construction.jpg";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Sustainable construction materials and circular economy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            Building a 
            <span className="bg-gradient-to-r from-accent to-success bg-clip-text text-transparent"> Sustainable </span>
            Future
          </h1>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 leading-relaxed">
            The world's first marketplace for circular construction materials, powered by intelligent forecasting and a thriving community of civil engineers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg"
            >
              Explore Marketplace
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              View Forecast Tool
            </Button>
          </div>

          {/* Quick Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 text-primary-foreground/90">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Recycle className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Circular Marketplace</h3>
                <p className="text-sm opacity-80">Reusable materials</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-primary-foreground/90">
              <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Forecasting</h3>
                <p className="text-sm opacity-80">Cost predictions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-primary-foreground/90">
              <div className="w-12 h-12 bg-warning rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-warning-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Expert Community</h3>
                <p className="text-sm opacity-80">Civil engineers</p>
              </div>
            </div>
          </div>
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