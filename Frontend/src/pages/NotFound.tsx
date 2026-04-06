import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
    <FileQuestion className="h-16 w-16 text-muted-foreground mb-6" />
    <h1 className="font-display text-5xl font-bold mb-2">404</h1>
    <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
    <Link to="/"><Button>Go Home</Button></Link>
  </div>
);

export default NotFound;
