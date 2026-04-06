// src/pages/Feedback.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitFeedback } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Feedback = () => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ rating, comment });
      toast({ title: "Thank you!", description: "Your feedback has been submitted." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Submission failed", description: error.response?.data?.error || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="font-display text-3xl font-bold">Submit Feedback</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle>We value your opinion</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${(hoverRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Tell us about your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Feedback;