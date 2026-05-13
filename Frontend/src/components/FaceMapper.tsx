// src/components/FaceMapper.tsx
import React, { useRef, useEffect } from 'react';

interface Detection {
  class:      string;
  confidence: number;
  bbox:       number[];
}

interface Landmarks {
  jaw:           number[][];
  right_eyebrow: number[][];
  left_eyebrow:  number[][];
  nose:          number[][];
  right_eye:     number[][];
  left_eye:      number[][];
  mouth:         number[][];
}

interface FaceMapData {
  face_box:   number[];
  landmarks:  Landmarks | null;
  detections: Detection[];
}

interface FaceMapperProps {
  imageSrc?:     string;
  faceMap:       FaceMapData | null;
  videoRef?:     React.RefObject<HTMLVideoElement>;
  videoElement?: HTMLVideoElement | null;
}

// Colors per condition (matches websocket.py)
const CONDITION_COLORS: Record<string, string> = {
  'Acne':           '#ff2222',
  'Blackheads':     '#444444',
  'Dark Spots':     '#7b3fa0',
  'Dry Skin':       '#c87832',
  'Enlarged Pores': '#64b4ff',
  'Eyebags':        '#8c50c8',
  'Oily Skin':      '#00c8c8',
  'Skin Redness':   '#ff3200',
  'Whiteheads':     '#c8c8c8',
  'Wrinkles':       '#966432',
};

const LANDMARK_COLORS: Record<string, string> = {
  jaw:           'rgba(180,180,180,0.8)',
  left_eyebrow:  '#ff9500',
  right_eyebrow: '#ff9500',
  nose:          '#00e676',
  left_eye:      '#ff5050',
  right_eye:     '#ff5050',
  mouth:         '#cc00cc',
};

function drawDots(ctx: CanvasRenderingContext2D, pts: number[][], color: string, r = 2) {
  ctx.fillStyle = color;
  pts.forEach(p => {
    if (p?.length >= 2) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

function drawLine(ctx: CanvasRenderingContext2D, pts: number[][], color: string, close = false) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  ctx.stroke();
}

const FaceMapper: React.FC<FaceMapperProps> = ({ imageSrc, faceMap, videoRef, videoElement }) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const imgRef      = useRef<HTMLImageElement>(null);
  const animRef     = useRef<number>();
  const isVideoMode = Boolean(videoElement || videoRef?.current);

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let src: HTMLImageElement | HTMLVideoElement | null = null;
    let sw = 0, sh = 0;

    if (videoElement && videoElement.videoWidth > 0) {
      src = videoElement; sw = videoElement.videoWidth; sh = videoElement.videoHeight;
    } else if (videoRef?.current?.videoWidth) {
      src = videoRef.current; sw = videoRef.current.videoWidth; sh = videoRef.current.videoHeight;
    } else if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      src = imgRef.current; sw = imgRef.current.naturalWidth; sh = imgRef.current.naturalHeight;
    }

    if (!src || sw === 0) {
      if (isVideoMode) animRef.current = requestAnimationFrame(draw);
      return;
    }

    canvas.width  = sw;
    canvas.height = sh;
    canvas.style.width  = '100%';
    canvas.style.height = 'auto';
    ctx.drawImage(src, 0, 0, sw, sh);

    if (!faceMap) {
      if (isVideoMode) animRef.current = requestAnimationFrame(draw);
      return;
    }

    // ── Face bounding box ───────────────────────────────────────────
    if (faceMap.face_box?.length === 4) {
      const [fx, fy, fw, fh] = faceMap.face_box;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth   = 2;
      ctx.strokeRect(fx, fy, fw, fh);
    }

    // ── MediaPipe landmarks ─────────────────────────────────────────
    if (faceMap.landmarks) {
      const lm = faceMap.landmarks;

      drawDots(ctx, lm.jaw,           LANDMARK_COLORS.jaw,           1.5);
      drawDots(ctx, lm.left_eyebrow,  LANDMARK_COLORS.left_eyebrow,  2);
      drawDots(ctx, lm.right_eyebrow, LANDMARK_COLORS.right_eyebrow, 2);
      drawLine(ctx, lm.left_eyebrow,  LANDMARK_COLORS.left_eyebrow);
      drawLine(ctx, lm.right_eyebrow, LANDMARK_COLORS.right_eyebrow);

      drawDots(ctx, lm.nose, LANDMARK_COLORS.nose, 2);
      drawLine(ctx, lm.nose, LANDMARK_COLORS.nose);

      drawDots(ctx, lm.left_eye,  LANDMARK_COLORS.left_eye,  2);
      drawDots(ctx, lm.right_eye, LANDMARK_COLORS.right_eye, 2);
      drawLine(ctx, lm.left_eye,  LANDMARK_COLORS.left_eye,  true);
      drawLine(ctx, lm.right_eye, LANDMARK_COLORS.right_eye, true);

      drawDots(ctx, lm.mouth, LANDMARK_COLORS.mouth, 2);
      drawLine(ctx, lm.mouth, LANDMARK_COLORS.mouth, true);
    }

    // ── YOLO detection boxes ────────────────────────────────────────
    if (faceMap.detections?.length) {
      faceMap.detections.forEach(det => {
        const [bx, by, bw, bh] = det.bbox ?? [];
        if (!bw || !bh) return;

        // If we have a face_box, offset the detection coords
        const [fx, fy] = faceMap.face_box?.length === 4
          ? [faceMap.face_box[0], faceMap.face_box[1]]
          : [0, 0];

        const x1 = fx + bx;
        const y1 = fy + by;
        const x2 = x1 + bw;
        const y2 = y1 + bh;

        const color = CONDITION_COLORS[det.class] || '#ffff00';

        // Box
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2.5;
        ctx.strokeRect(x1, y1, bw, bh);

        // Semi-transparent fill
        ctx.fillStyle = color + '22';
        ctx.fillRect(x1, y1, bw, bh);

        // Label background
        const label = `${det.class} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 12px sans-serif';
        const labelW = ctx.measureText(label).width + 10;
        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - 20, labelW, 20);

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x1 + 5, y1 - 5);
      });
    }

    // ── Legend ──────────────────────────────────────────────────────
    if (faceMap.landmarks || faceMap.detections?.length) {
      const legendItems = [
        { label: 'Eyes',      color: LANDMARK_COLORS.left_eye },
        { label: 'Eyebrows',  color: LANDMARK_COLORS.left_eyebrow },
        { label: 'Nose',      color: LANDMARK_COLORS.nose },
        { label: 'Mouth',     color: LANDMARK_COLORS.mouth },
        { label: 'Jaw',       color: LANDMARK_COLORS.jaw },
      ];
      const lx   = sw - 120;
      const ly   = 10;
      const rowH = 18;
      const boxH = legendItems.length * rowH + 22;

      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lx - 6, ly, 125, boxH, 6);
      else ctx.rect(lx - 6, ly, 125, boxH);
      ctx.fill();

      ctx.font      = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Landmarks', lx, ly + 14);

      legendItems.forEach((item, i) => {
        const cy = ly + 22 + i * rowH;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(lx + 5, cy + 3, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText(item.label, lx + 16, cy + 7);
      });
    }

    if (isVideoMode) animRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    if (isVideoMode) {
      animRef.current = requestAnimationFrame(draw);
    } else if (imgRef.current) {
      if (imgRef.current.complete) draw();
      else imgRef.current.onload = () => draw();
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [faceMap, imageSrc, videoElement, videoRef, isVideoMode]);

  return (
    <div className="relative">
      {imageSrc && (
        <img ref={imgRef} src={imageSrc} alt="Face analysis"
          className="hidden" crossOrigin="anonymous" />
      )}
      <canvas ref={canvasRef} className="w-full rounded-lg shadow-lg" />
    </div>
  );
};

export default FaceMapper;
