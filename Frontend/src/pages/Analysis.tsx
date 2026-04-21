// src/pages/Analysis.tsx
import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeImage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Camera, Loader2, ImageIcon, Sparkles, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Webcam from "react-webcam";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const Analysis = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveResult, setLiveResult] = useState<any>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { "image/*": [".jpg", ".jpeg", ".png"] }, 
    maxFiles: 1 
  });

  const handleAnalyzeUpload = async () => {
    if (!preview) {
      toast({ title: "No Image", description: "Please upload an image first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const base64 = preview.includes(",") ? preview.split(",")[1] : preview;
      const res = await analyzeImage(base64);
      sessionStorage.setItem("analysis_result", JSON.stringify(res.data));
      sessionStorage.setItem("analysis_image", preview);
      navigate("/results/latest");
    } catch (err: any) {
      toast({ 
        title: "Analysis Failed", 
        description: err.response?.data?.error || "Something went wrong", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setLoading(true);
      try {
        const base64 = imageSrc.includes(",") ? imageSrc.split(",")[1] : imageSrc;
        const res = await analyzeImage(base64);
        sessionStorage.setItem("analysis_result", JSON.stringify(res.data));
        sessionStorage.setItem("analysis_image", imageSrc);
        navigate("/results/latest");
      } catch (err: any) {
        toast({ 
          title: "Analysis Failed", 
          description: err.response?.data?.error || "Something went wrong", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getConditionIcon = (condition: string) => {
    const icons: Record<string, string> = {
      acne: '🔴',
      blackheads: '⚫',
      darkspots: '🌑',
      dry: '💧',
      hyperpigmentation: '🌙',
      normal: '✅',
      oily: '✨'
    };
    return icons[condition] || '⚠️';
  };

  const getSkinDisplay = (condition: string) => {
    const map: Record<string, string> = {
      acne: "Acne",
      blackheads: "Blackheads",
      darkspots: "Dark Spots",
      dry: "Dry Skin",
      hyperpigmentation: "Hyperpigmentation",
      normal: "Normal",
      oily: "Oily Skin"
    };
    return map[condition] || condition;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Facial Health Analysis</h1>
        <p className="text-muted-foreground mb-8">Upload a photo or use webcam to analyze your skin condition</p>
      </motion.div>

      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2" /> Upload Image</TabsTrigger>
          <TabsTrigger value="webcam"><Camera className="h-4 w-4 mr-2" /> Live Webcam</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p>{isDragActive ? "Drop your image here..." : "Drag & drop an image, or click to select"}</p>
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG (max 10MB)</p>
          </div>

          {preview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Preview</p>
                  <img src={preview} alt="Preview" className="rounded-lg w-full max-h-80 object-contain" />
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="mt-6">
            <Button onClick={handleAnalyzeUpload} disabled={!preview || loading} className="w-full py-6 text-lg" size="lg">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing...</> : "Analyze Image"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="webcam">
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-secondary aspect-video">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user" }}
              />
            </div>
            
            <Button onClick={captureAndAnalyze} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</> : <><Camera className="h-4 w-4 mr-2" /> Capture & Analyze</>}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;