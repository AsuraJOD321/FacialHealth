# src/skin_analyzer.py
import os
import cv2
import numpy as np
import logging

logging.getLogger('ultralytics').setLevel(logging.ERROR)

from .config import SKIN_MODEL_PATH, SKIN_SEVERITY

MIN_CONFIDENCE = 0.10

MAX_DETECTIONS = 10


class SkinAnalyzer:
    def __init__(self):
        self.model        = None
        self.severity_map = SKIN_SEVERITY
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO(SKIN_MODEL_PATH)
            print("[Skin Model] Connected successfully (YOLOv8)")
        except Exception as e:
            print(f"[Skin Model] Not connected — {e}")
            self.model = None

    def predict(self, image):
        """
        Run YOLOv8 on the full image (not just face ROI) for better detection
        of whole-face conditions like Dry-Skin and Oily-Skin.
        """
        try:
            if image is None or image.size == 0:
                return self._fallback()

            if self.model is not None:
                # Run on the image passed in
                results = self.model(image, verbose=False, conf=MIN_CONFIDENCE)[0]
                boxes   = results.boxes

                if boxes is None or len(boxes) == 0:
                    return self._fallback()

                raw = []
                for box in boxes:
                    cls_id  = int(box.cls[0])
                    conf    = float(box.conf[0])
                    name    = self.model.names[cls_id]
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    raw.append({
                        'class':      name,
                        'confidence': round(conf, 3),
                        'bbox':       [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
                    })

                # Sort by confidence descending
                raw.sort(key=lambda d: d['confidence'], reverse=True)

                # Keep best detection per class, show ALL unique classes
                seen_classes = set()
                detections   = []
                for det in raw:
                    if det['class'] not in seen_classes:
                        seen_classes.add(det['class'])
                        detections.append(det)
                    if len(detections) >= MAX_DETECTIONS:
                        break

                if not detections:
                    return self._fallback()

                primary = detections[0]
                return {
                    'predicted_class': primary['class'],
                    'confidence':      primary['confidence'],
                    'severity_score':  self.severity_map.get(primary['class'], 0),
                    'detections':      detections,
                }

            return self._fallback()

        except Exception as e:
            print(f"[Skin Model] Predict error: {e}")
            return self._fallback()

    def _fallback(self):
        return {
            'predicted_class': 'Normal',
            'confidence':      0.5,
            'severity_score':  0,
            'detections':      [],
        }