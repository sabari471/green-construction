import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Recycle, TrendingUp, Users, Info, LogIn } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Recycle className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary">GreenConstructHub</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-foreground hover:text-primary transition-colors">
              Home
            </a>
            <a href="#marketplace" className="text-foreground hover:text-primary transition-colors flex items-center">
              <Recycle className="h-4 w-4 mr-1" />
              Marketplace
            </a>
            <a href="#forecast" className="text-foreground hover:text-primary transition-colors flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Forecast Tool
            </a>
            <a href="#community" className="text-foreground hover:text-primary transition-colors flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Community
            </a>
            <a href="#about" className="text-foreground hover:text-primary transition-colors flex items-center">
              <Info className="h-4 w-4 mr-1" />
              About
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="ghost" size="sm">
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent-hover text-accent-foreground">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <a href="#home" className="text-foreground hover:text-primary transition-colors py-2">
                Home
              </a>
              <a href="#marketplace" className="text-foreground hover:text-primary transition-colors py-2 flex items-center">
                <Recycle className="h-4 w-4 mr-2" />
                Marketplace
              </a>
              <a href="#forecast" className="text-foreground hover:text-primary transition-colors py-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Forecast Tool
              </a>
              <a href="#community" className="text-foreground hover:text-primary transition-colors py-2 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Community
              </a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors py-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                About
              </a>
              <div className="flex flex-col space-y-2 pt-4 border-t">
                <Button variant="ghost" size="sm" className="justify-start">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button size="sm" className="bg-accent hover:bg-accent-hover text-accent-foreground">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;