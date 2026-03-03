import { Navbar } from "@/components/Navbar";
import Aurora from "@/components/ui/Aurora/Aurora";
import SplashCursor from "@/components/ui/SplashCursor/SplashCursor";
import { HeroSection } from "@/components/HeroSection";
import { StatsSection } from "@/components/StatsSection";
import { AboutSection } from "@/components/AboutSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { WhySection } from "@/components/WhySection";
import { UploadSection } from "@/components/UploadSection";
import { SecuritySection } from "@/components/SecuritySection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden relative dark">
      {/* Aurora Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Aurora
          colorStops={["#00FFFF", "#FF00FF", "#00FF00"]}
          blend={0.7}
          amplitude={1.4}
          speed={0.5}
        />
      </div>

      {/* Splash Cursor Effect — Landing page only */}
      <SplashCursor />

      {/* Content Layer */}
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <FeaturesSection />
        <WhySection />
        <UploadSection />
        <SecuritySection />
        <TestimonialsSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
