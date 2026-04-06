// src/pages/Analysis.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeImage } from "@/lib/api";
import { wsService } from "@/lib/websocket";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, Camera, Loader2, ImageIcon, Eye, Sparkles, 
  AlertCircle, Activity, CheckCircle, Moon, Sun, 
  Droplets, Zap, Shield, Users, Target, Map 
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import Webcam from "react-webcam";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AnalysisResult {
  has_face: boolean;
  face_count: number;
  face_bbox?: { x: number; y: number; w: number; h: number };
  skin_analysis?: {
    predicted_class: string;
    confidence: number;
    severity_score: number;
  };
  left_eye?: {
    predicted_class: string;
    confidence: number;
    severity_score: number;
  };
  right_eye?: {
    predicted_class: string;
    confidence: number;
    severity_score: number;
  };
  combined?: {
    overall_health_score: number;
    health_status: string;
    detected_issues: Array<{
      type: string;
      eye?: string;
      condition: string;
      confidence: number;
    }>;
    recommendations: string[];
  };
  annotated_image?: string;
  landmarks_available?: boolean;
  analysis_id?: number;
}

const Analysis = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  
  // Upload mode state
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Live analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const [activeTab, setActiveTab] = useState("upload");

  // WebSocket for live analysis
  useEffect(() => {
    if (token && isAnalyzing && activeTab === "webcam") {
      wsService.connect(token);
      
      wsService.on('analysis_result', (result: AnalysisResult) => {
        setLiveResult(result);
        
        // Calculate FPS
        frameCountRef.current++;
        const now = Date.now();
        if (now - lastTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }
      });
      
      wsService.on('analysis_error', (error) => {
        console.error('Analysis error:', error);
        toast({ 
          title: "Analysis Error", 
          description: error.error || "Failed to analyze frame", 
          variant: "destructive" 
        });
      });
      
      return () => {
        wsService.disconnect();
        wsService.removeAllListeners();
      };
    }
  }, [token, isAnalyzing, activeTab]);

  // Capture and analyze frames for live mode
  useEffect(() => {
    if (!isAnalyzing || activeTab !== "webcam") return;
    
    const interval = setInterval(() => {
      if (webcamRef.current && isAnalyzing) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          wsService.analyzeFrame(imageSrc);
        }
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isAnalyzing, activeTab]);

  // Upload mode handlers
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    // Check file size (max 10MB)
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return "🌟";
    if (score >= 60) return "👍";
    if (score >= 40) return "⚠️";
    return "🔴";
  };

  const getConditionIcon = (condition: string) => {
    const icons: Record<string, string> = {
      acne: '🔴',
      blackheads: '⚫',
      dry: '💧',
      oily: '✨',
      hyperpigmentation: '🌑',
      wrinkles: '📏',
      Darkcircle: '🌙',
      Conjunctivitis: '👁️',
      normal: '✅'
    };
    return icons[condition.toLowerCase()] || '⚠️';
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      acne: 'bg-red-100 text-red-700 border-red-200',
      blackheads: 'bg-gray-100 text-gray-700 border-gray-200',
      dry: 'bg-blue-100 text-blue-700 border-blue-200',
      oily: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      hyperpigmentation: 'bg-purple-100 text-purple-700 border-purple-200',
      wrinkles: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      Darkcircle: 'bg-violet-100 text-violet-700 border-violet-200',
      Conjunctivitis: 'bg-pink-100 text-pink-700 border-pink-200',
      normal: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[condition] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getHealthStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Excellent': 'bg-green-500',
      'Good': 'bg-blue-500',
      'Fair': 'bg-yellow-500',
      'Needs Attention': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Facial Health Analysis
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload a photo for detailed analysis or use live webcam for real-time AI detection with face landmarks
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        if (v !== "webcam" && isAnalyzing) {
          setIsAnalyzing(false);
          wsService.disconnect();
        }
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Image
          </TabsTrigger>
          <TabsTrigger value="webcam" className="gap-2">
            <Camera className="h-4 w-4" /> Live Analysis
          </TabsTrigger>
        </TabsList>

        {/* Upload Mode */}
        <TabsContent value="upload">
          <div className="max-w-2xl mx-auto">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-border hover:border-primary/50 hover:bg-secondary/30"}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <ImageIcon className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? "Drop your image here..." : "Drag & drop an image"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to select from your computer
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG (max 10MB)
                </p>
              </div>
            </div>

            <AnimatePresence>
              {preview && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6"
                >
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Preview
                      </p>
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="rounded-lg w-full max-h-96 object-contain bg-secondary/30" 
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6">
              <Button 
                onClick={handleAnalyzeUpload} 
                disabled={!preview || loading} 
                className="w-full py-6 text-lg gap-2"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Analyze Image</>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Live Analysis Mode */}
        <TabsContent value="webcam">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Webcam Feed */}
            <div className="lg:col-span-2 space-y-3">
              <Card className="overflow-hidden shadow-lg">
                <CardContent className="p-0 relative">
                  <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ facingMode: "user" }}
                    />
                    {liveResult?.annotated_image && showOverlay && (
                      <img
                        src={liveResult.annotated_image}
                        alt="Analysis Overlay with Landmarks"
                        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                      />
                    )}
                    {!isAnalyzing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="text-center text-white">
                          <Camera className="h-16 w-16 mx-auto mb-3 opacity-50" />
                          <p className="text-lg font-medium">Ready for Analysis</p>
                          <p className="text-sm opacity-75 mt-1">Click Start to begin</p>
                        </div>
                      </div>
                    )}
                    {isAnalyzing && !liveResult?.has_face && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="text-center text-white">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                          <p className="font-medium">No Face Detected</p>
                          <p className="text-sm opacity-75 mt-1">Please look at the camera</p>
                        </div>
                      </div>
                    )}
                    {isAnalyzing && liveResult?.has_face && (
                      <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Face Detected
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-mono">
                    {fps} fps
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (!isAnalyzing) {
                      setIsAnalyzing(true);
                    } else {
                      setIsAnalyzing(false);
                      wsService.disconnect();
                      setLiveResult(null);
                    }
                  }}
                  variant={isAnalyzing ? "destructive" : "default"}
                  className="flex-1 gap-2 h-12"
                >
                  {isAnalyzing ? (
                    <><Activity className="h-4 w-4 animate-pulse" /> Stop Analysis</>
                  ) : (
                    <><Camera className="h-4 w-4" /> Start Live Analysis</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOverlay(!showOverlay)}
                  disabled={!isAnalyzing}
                  className="gap-2 h-12"
                >
                  <Map className="h-4 w-4" />
                  {showOverlay ? 'Hide' : 'Show'} Landmarks
                </Button>
              </div>

              {liveResult?.landmarks_available && (
                <div className="text-xs text-center text-muted-foreground">
                  <Target className="h-3 w-3 inline mr-1" />
                  68 facial landmarks active - Face detection with dlib
                </div>
              )}
            </div>

            {/* Live Results Panel */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {liveResult?.combined ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Health Score Card */}
                    <Card className="overflow-hidden">
                      <CardContent className="p-5 text-center">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">Health Score</span>
                          <span className="text-2xl">{getScoreEmoji(liveResult.combined.overall_health_score)}</span>
                        </div>
                        <div className={`text-5xl font-bold mb-2 ${getScoreColor(liveResult.combined.overall_health_score)}`}>
                          {liveResult.combined.overall_health_score}
                          <span className="text-xl">/100</span>
                        </div>
                        <Progress 
                          value={liveResult.combined.overall_health_score} 
                          className="h-2 mb-3" 
                        />
                        <Badge className={`${getHealthStatusColor(liveResult.combined.health_status)} text-white`}>
                          {liveResult.combined.health_status}
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* Detected Issues */}
                    {liveResult.combined.detected_issues?.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold flex items-center gap-2 mb-3">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            Detected Issues
                            <Badge variant="secondary" className="ml-auto">
                              {liveResult.combined.detected_issues.length}
                            </Badge>
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {liveResult.combined.detected_issues.map((issue, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex items-center justify-between text-sm p-2 rounded-lg border ${getConditionColor(issue.condition)}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">{getConditionIcon(issue.condition)}</span>
                                  <span className="capitalize font-medium">
                                    {issue.type === 'skin' ? 'Skin' : `${issue.eye} Eye`}
                                  </span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="capitalize">{issue.condition}</span>
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {Math.round((issue.confidence || 0) * 100)}%
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Eye Health Summary */}
                    {(liveResult.left_eye || liveResult.right_eye) && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold flex items-center gap-2 mb-3">
                            <Eye className="h-4 w-4 text-primary" />
                            Eye Health
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 rounded-lg bg-secondary/30">
                              <p className="text-xs text-muted-foreground mb-1">Left Eye</p>
                              <p className="font-medium capitalize flex items-center justify-center gap-1">
                                {getConditionIcon(liveResult.left_eye?.predicted_class || 'Normal')}
                                {liveResult.left_eye?.predicted_class || 'Normal'}
                              </p>
                              {liveResult.left_eye?.confidence && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.round(liveResult.left_eye.confidence * 100)}% confidence
                                </p>
                              )}
                            </div>
                            <div className="text-center p-2 rounded-lg bg-secondary/30">
                              <p className="text-xs text-muted-foreground mb-1">Right Eye</p>
                              <p className="font-medium capitalize flex items-center justify-center gap-1">
                                {getConditionIcon(liveResult.right_eye?.predicted_class || 'Normal')}
                                {liveResult.right_eye?.predicted_class || 'Normal'}
                              </p>
                              {liveResult.right_eye?.confidence && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.round(liveResult.right_eye.confidence * 100)}% confidence
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Skin Analysis */}
                    {liveResult.skin_analysis && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold flex items-center gap-2 mb-3">
                            <Droplets className="h-4 w-4 text-primary" />
                            Skin Analysis
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Condition</p>
                              <p className="font-medium capitalize text-lg flex items-center gap-2">
                                {getConditionIcon(liveResult.skin_analysis.predicted_class)}
                                {liveResult.skin_analysis.predicted_class}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Confidence</p>
                              <p className="font-medium">
                                {Math.round((liveResult.skin_analysis.confidence || 0) * 100)}%
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={(liveResult.skin_analysis.confidence || 0) * 100} 
                            className="h-1 mt-3" 
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {liveResult.combined.recommendations?.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-semibold flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            Daily Care Tips
                          </h3>
                          <ul className="space-y-2">
                            {liveResult.combined.recommendations.slice(0, 4).map((rec, idx) => (
                              <motion.li 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="text-primary mt-0.5">•</span>
                                <span>{rec}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Face Statistics */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-primary" />
                          Face Statistics
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Faces Detected:</span>
                            <span className="font-semibold">{liveResult.face_count || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Landmarks:</span>
                            <span className="font-semibold flex items-center gap-1">
                              {liveResult.landmarks_available ? (
                                <><CheckCircle className="h-3 w-3 text-green-500" /> 68 points active</>
                              ) : (
                                'Not available'
                              )}
                            </span>
                          </div>
                          {liveResult.analysis_id && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Analysis ID:</span>
                              <span className="font-mono text-xs">#{liveResult.analysis_id}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card>
                      <CardContent className="p-12 text-center text-muted-foreground">
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                            <p className="font-medium">Analyzing your face...</p>
                            <p className="text-sm mt-1">Detecting face, skin, and eye conditions</p>
                          </>
                        ) : (
                          <>
                            <Camera className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="font-medium">Ready for Live Analysis</p>
                            <p className="text-sm mt-1">Click "Start Live Analysis" to begin</p>
                            <p className="text-xs mt-3 text-muted-foreground">
                              Features: Face detection • 68 landmarks • Skin analysis • Eye health
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;