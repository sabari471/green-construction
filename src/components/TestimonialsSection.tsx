import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const testimonials = [
  {
    
    content: "GreenConstructHub has revolutionized how we source sustainable materials. The forecasting tool saved us 30% on our last project budget."
  },
  {
    name: "", 
    role: " ",
    company: "EcoConstruct Ltd",
    avatar: "MR",
    rating: 5,
    content: "The community aspect is incredible. I've learned more about circular construction in 6 months than in my previous 5 years of experience."
  },
  {
    name: "Dr. Emily Watson",
    role: "Civil Engineering Professor",
    company: "University of Cambridge",
    avatar: "EW",
    rating: 5,
    content: "An essential platform for the future of construction. My students use it for research and it's becoming industry standard."
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollReveal direction="up" duration={700}>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              What Our Community Says
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trusted by civil engineers, contractors, and sustainability experts worldwide
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal 
              key={index} 
              direction="up" 
              delay={index * 150} 
              duration={600}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 opacity-10">
                <Quote className="h-12 w-12 text-primary" />
              </div>
              
              <CardContent className="p-6">
                {/* Rating */}
                
                
                {/* Content */}
                <p className="text-foreground mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
                
                {/* Author */}
                
              </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* Trust Indicators */}
        <ScrollReveal direction="scale" delay={600} duration={700}>
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground mb-8">Trusted by leading organizations</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-muted-foreground font-semibold">
                UNESCO
              </div>
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-muted-foreground font-semibold">
                ASCE
              </div>
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-muted-foreground font-semibold">
                ICE
              </div>
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-muted-foreground font-semibold">
                FIDIC
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default TestimonialsSection;