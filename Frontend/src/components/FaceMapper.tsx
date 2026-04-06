import React, { useRef, useEffect } from 'react';

interface Issue {
  type: string;
  condition: string;
  confidence: number;
  region: string;
  bbox: number[];
  color: string;
  eye?: string;
}

interface FaceMapData {
  face_box: number[];
  landmarks: {
    left_eye: number[][];
    right_eye: number[][];
    nose: number[][];
    mouth: number[][];
    left_eyebrow: number[][];
    right_eyebrow: number[][];
  };
  issues: Issue[];
}

interface FaceMapperProps {
  imageSrc?: string;
  faceMap: FaceMapData | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
  videoElement?: HTMLVideoElement | null;
}

const FaceMapper: React.FC<FaceMapperProps> = ({ imageSrc, faceMap, videoRef, videoElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const animationRef = useRef<number>();

  const getDisplayName = (condition: string): string => {
    const names: Record<string, string> = {
      'acne': '🔴 Acne',
      'dry': '💧 Dry Skin',
      'oily': '✨ Oily Skin',
      'blackheads': '⚫ Blackheads',
      'darkspots': '🔘 Dark Spots',
      'hyperpigmentation': '🟤 Hyperpigmentation',
      'wrinkles': '📐 Fine Lines',
      'Darkcircle': '🌙 Dark Circles',
      'Conjunctivitis': '👁️ Red Eye'
    };
    return names[condition] || condition;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Get source element
    let sourceElement: HTMLImageElement | HTMLVideoElement | null = null;
    let sourceWidth = 0, sourceHeight = 0;

    if (videoElement && videoElement.videoWidth > 0) {
      sourceElement = videoElement;
      sourceWidth = videoElement.videoWidth;
      sourceHeight = videoElement.videoHeight;
    } else if (imgRef.current && imgRef.current.complete) {
      sourceElement = imgRef.current;
      sourceWidth = imgRef.current.width;
      sourceHeight = imgRef.current.height;
    } else if (videoRef?.current?.videoWidth) {
      sourceElement = videoRef.current;
      sourceWidth = videoRef.current.videoWidth;
      sourceHeight = videoRef.current.videoHeight;
    }

    if (!sourceElement || sourceWidth === 0) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Set canvas size
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';

    // Draw the source image/video frame
    ctx.drawImage(sourceElement, 0, 0, sourceWidth, sourceHeight);

    if (!faceMap) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Draw face bounding box
    const [fx, fy, fw, fh] = faceMap.face_box;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.strokeRect(fx, fy, fw, fh);

    // Draw landmarks
    const drawLandmarks = (points: number[][], color: string, radius: number = 3) => {
      ctx.fillStyle = color;
      points.forEach(point => {
        if (point && point.length >= 2) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    };

    // Draw all landmarks
    if (faceMap.landmarks) {
      drawLandmarks(faceMap.landmarks.left_eye || [], '#3b82f6', 4);
      drawLandmarks(faceMap.landmarks.right_eye || [], '#3b82f6', 4);
      drawLandmarks(faceMap.landmarks.nose || [], '#f97316', 4);
      drawLandmarks(faceMap.landmarks.mouth || [], '#ec4899', 3);
      drawLandmarks(faceMap.landmarks.left_eyebrow || [], '#a855f7', 3);
      drawLandmarks(faceMap.landmarks.right_eyebrow || [], '#a855f7', 3);
    }

    // Draw issues
    if (faceMap.issues && faceMap.issues.length > 0) {
      faceMap.issues.forEach(issue => {
        const [ix, iy, iw, ih] = issue.bbox;
        if (!ix || !iy || !iw || !ih) return;

        // Draw colored box
        ctx.strokeStyle = issue.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(ix, iy, iw, ih);

        // Draw semi-transparent fill
        ctx.fillStyle = issue.color + '40';
        ctx.fillRect(ix, iy, iw, ih);

        // Draw label
        const label = getDisplayName(issue.condition);
        ctx.font = 'bold 14px sans-serif';
        const metrics = ctx.measureText(label);
        const labelWidth = metrics.width + 12;
        const labelHeight = 24;

        // Label background
        ctx.fillStyle = issue.color;
        ctx.fillRect(ix, iy - labelHeight, labelWidth, labelHeight);

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, ix + 6, iy - 8);

        // Connecting line
        ctx.beginPath();
        ctx.moveTo(ix + iw / 2, iy);
        ctx.lineTo(ix + iw / 2, iy - labelHeight);
        ctx.strokeStyle = issue.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw legend
    const legendX = sourceWidth - 160;
    const legendY = 20;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(legendX - 5, legendY - 5, 155, 130);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('Legend', legendX, legendY + 12);

    const conditions = [
      { name: 'Acne', color: '#ef4444' },
      { name: 'Dry Skin', color: '#f97316' },
      { name: 'Oily Skin', color: '#eab308' },
      { name: 'Dark Circles', color: '#8b5cf6' },
      { name: 'Red Eye', color: '#ec4899' }
    ];

    ctx.font = '11px sans-serif';
    conditions.forEach((cond, i) => {
      ctx.fillStyle = cond.color;
      ctx.fillRect(legendX, legendY + 20 + i * 18, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(cond.name, legendX + 18, legendY + 30 + i * 18);
    });

    animationRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [faceMap, imageSrc, videoElement, videoRef]);

  return (
    <div className="relative">
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Face analysis"
          className="hidden"
          crossOrigin="anonymous"
        />
      )}
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg shadow-lg"
        style={{ maxHeight: '500px', objectFit: 'contain' }}
      />
    </div>
  );
};

export default FaceMapper;