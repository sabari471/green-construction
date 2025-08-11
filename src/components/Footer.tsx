import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Recycle, Mail, Phone, MapPin, Linkedin, Twitter, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <Recycle className="h-6 w-6 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold">GreenConstructHub</span>
            </div>
            <p className="text-primary-foreground/80 leading-relaxed">
              Building a sustainable future through circular construction materials and intelligent forecasting.
            </p>
            <div className="flex space-x-3">
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:text-accent">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:text-accent">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:text-accent">
                <Github className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li><a href="#marketplace" className="text-primary-foreground/80 hover:text-accent transition-colors">Marketplace</a></li>
              <li><a href="#forecast" className="text-primary-foreground/80 hover:text-accent transition-colors">Forecast Tool</a></li>
              <li><a href="#community" className="text-primary-foreground/80 hover:text-accent transition-colors">Community</a></li>
              <li><a href="#api" className="text-primary-foreground/80 hover:text-accent transition-colors">API Access</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#docs" className="text-primary-foreground/80 hover:text-accent transition-colors">Documentation</a></li>
              <li><a href="#guides" className="text-primary-foreground/80 hover:text-accent transition-colors">User Guides</a></li>
              <li><a href="#blog" className="text-primary-foreground/80 hover:text-accent transition-colors">Blog</a></li>
              <li><a href="#support" className="text-primary-foreground/80 hover:text-accent transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center text-primary-foreground/80">
                <Mail className="h-4 w-4 mr-2" />
                hello@greenconstructhub.com
              </li>
              <li className="flex items-center text-primary-foreground/80">
                <Phone className="h-4 w-4 mr-2" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center text-primary-foreground/80">
                <MapPin className="h-4 w-4 mr-2" />
                London, UK
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-primary-foreground/20" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-6 text-sm text-primary-foreground/80">
            <a href="#privacy" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-accent transition-colors">Terms of Service</a>
            <a href="#cookies" className="hover:text-accent transition-colors">Cookie Policy</a>
            <a href="#legal" className="hover:text-accent transition-colors">Legal</a>
          </div>
          <p className="text-sm text-primary-foreground/80">
            © 2024 GreenConstructHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;