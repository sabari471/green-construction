import { Card, CardContent } from "@/components/ui/card";
import { Search, Shield, Truck, Leaf } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Browse & Discover",
    description: "Search our verified marketplace for sustainable construction materials with detailed specifications and environmental impact scores."
  },
  {
    icon: Shield,
    title: "Verify & Connect", 
    description: "Review seller credentials, material certificates, and sustainability metrics. Connect directly with verified suppliers."
  },
  {
    icon: Truck,
    title: "Purchase & Deliver",
    description: "Complete secure transactions with integrated logistics support and real-time tracking for material delivery."
  },
  {
    icon: Leaf,
    title: "Track Impact",
    description: "Monitor your environmental savings with CO₂ certificates and contribute to the circular construction economy."
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple steps to transform your construction projects with sustainable materials
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-accent transform -translate-y-1/2 z-0" />
              )}
              
              <Card className="relative z-10 border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Leaf className="h-4 w-4" />
            <span>Join the Sustainable Construction Movement</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Connect with thousands of engineers and suppliers building a more sustainable future.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;