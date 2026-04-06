import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
    <ShieldX className="h-16 w-16 text-destructive mb-6" />
    <h1 className="font-display text-3xl font-bold mb-2">Unauthorized</h1>
    <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
    <Link to="/"><Button>Go Home</Button></Link>
  </div>
);

export default Unauthorized;
