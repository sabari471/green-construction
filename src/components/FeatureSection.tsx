import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Recycle, TrendingUp, Users, Leaf, Calculator, MessageSquare, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Recycle,
    title: "Circular Marketplace",
    description: "Buy and sell reclaimed construction materials with detailed sustainability scores and verified quality standards.",
    features: ["Material authentication", "CO₂ impact tracking", "Seller verification", "Quality assurance"],
    color: "bg-accent",
    route: "/marketplace"
  },
  {
    icon: TrendingUp,
    title: "Cost Forecasting Tool", 
    description: "AI-powered predictions for material costs with regional comparisons and uncertainty analysis.",
    features: ["Regional price trends", "Forecast accuracy", "Alternative suggestions", "Export reports"],
    color: "bg-success",
    route: "/forecast"
  },
  {
    icon: Users,
    title: "Engineering Community",
    description: "Connect with civil engineers worldwide to share knowledge, best practices, and sustainable solutions.",
    features: ["Expert forums", "Knowledge sharing", "Project collaboration", "Professional networking"],
    color: "bg-warning",
    route: "/community"
  }
];

const FeatureSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            What We Offer
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Comprehensive tools and services for sustainable construction and circular economy practices
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
              <div className={`absolute top-0 left-0 w-full h-1 ${feature.color}`} />
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      {item}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => navigate(feature.route)}
                >
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Impact Stats */}
        <div className="mt-12 sm:mt-16 lg:mt-20 bg-gradient-to-r from-primary to-accent rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground mb-6 sm:mb-8">
            Our Environmental Impact
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="text-primary-foreground">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">2.5M</div>
              <div className="text-xs sm:text-sm text-primary-foreground/80">Tons CO₂ Saved</div>
            </div>
            <div className="text-primary-foreground">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">15K</div>
              <div className="text-xs sm:text-sm text-primary-foreground/80">Materials Listed</div>
            </div>
            <div className="text-primary-foreground">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">8.2K</div>
              <div className="text-xs sm:text-sm text-primary-foreground/80">Active Engineers</div>
            </div>
            <div className="text-primary-foreground">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2">95%</div>
              <div className="text-xs sm:text-sm text-primary-foreground/80">Forecast Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;