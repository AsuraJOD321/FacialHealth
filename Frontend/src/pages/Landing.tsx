// src/pages/Landing.tsx
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Eye, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Landing = () => {
  const { user } = useAuth();

  const features = [
    { icon: Activity, title: "Skin Analysis", desc: "AI-powered detection of skin conditions with personalized recommendations." },
    { icon: Eye, title: "Face Detection", desc: "Advanced face detection technology for accurate analysis." },
    { icon: Shield, title: "Health Score", desc: "Overall facial health score based on analysis factors." },
    { icon: Sparkles, title: "Smart Insights", desc: "Get actionable recommendations to improve your skin health." },
  ];

  return (
    <div className="min-h-screen">
      {/* Navbar for non-logged in users */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Activity className="h-6 w-6" />
            FaceHealth
          </Link>
          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            ) : (
              <Link to="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-24 md:py-36 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" /> AI-Powered Skin Health Analysis
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Understand Your{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Skin Health</span>{" "}
              in Seconds
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Upload a photo to get instant AI analysis of your skin condition, 
              complete with personalized recommendations and health score.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="px-8 w-full sm:w-auto">
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="px-8 w-full sm:w-auto">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="px-8 w-full sm:w-auto">
                      Login
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Advanced AI analyzes your facial features to provide comprehensive skin health insights.</p>
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
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
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