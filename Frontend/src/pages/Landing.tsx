import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Eye, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Activity, title: "Skin Analysis", desc: "AI-powered detection of skin conditions with personalized recommendations." },
  { icon: Eye, title: "Eye Health", desc: "Comprehensive assessment of eye conditions for both eyes." },
  { icon: Shield, title: "Health Score", desc: "Overall facial health score based on multiple analysis factors." },
  { icon: Sparkles, title: "Smart Insights", desc: "Get actionable recommendations to improve your facial health." },
];

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-24 md:py-36 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" /> AI-Powered Facial Health Analysis
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Understand Your{" "}
              <span className="bg-clip-text text-transparent gradient-primary">Facial Health</span>{" "}
              in Seconds
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Upload a photo or use your webcam to get instant AI analysis of your skin and eye health, 
              complete with personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 w-full sm:w-auto">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="font-semibold px-8 w-full sm:w-auto">
                  Login
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Advanced AI analyzes your facial features to provide comprehensive health insights.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} FaceHealth. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
