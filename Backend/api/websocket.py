# api/websocket.py
import cv2
import numpy as np
import base64
import logging
from flask_socketio import emit

logger = logging.getLogger(__name__)

CONDITION_COLORS_BGR = {
    'Acne':           (0,   0,   220),
    'Blackheads':     (80,  80,  80),
    'Dark-Spots':     (180, 60,  200),
    'Dry-Skin':       (50,  120, 200),
    'Enlarged-Pores': (200, 180, 50),
    'Eyebags':        (200, 80,  200),
    'Oily-Skin':      (0,   200, 200),
    'Skin-Redness':   (0,   50,  220),
    'Whiteheads':     (180, 180, 180),
    'Wrinkles':       (50,  130, 200),
}

LIVE_MIN_CONF = 0.25


def predict_on_face(image, faces, skin_analyzer):
    """Run YOLO on padded face crop, offset boxes to full image coords."""
    if not faces:
        return skin_analyzer._fallback()

    fx, fy, fw, fh = faces[0]['bbox']
    h_img, w_img   = image.shape[:2]

    pad_x = int(fw * 0.08)
    pad_y = int(fh * 0.08)
    x1 = max(0, fx - pad_x)
    y1 = max(0, fy - pad_y)
    x2 = min(w_img, fx + fw + pad_x)
    y2 = min(h_img, fy + fh + pad_y)

    face_crop = image[y1:y2, x1:x2]
    if face_crop.size == 0:
        return skin_analyzer._fallback()

    result = skin_analyzer.predict(face_crop)

    detections = [d for d in result.get('detections', []) if d['confidence'] >= LIVE_MIN_CONF]

    for det in detections:
        bx, by, bw, bh = det['bbox']
        det['bbox'] = [x1 + bx, y1 + by, bw, bh]

    result['detections'] = detections
    if detections:
        result['predicted_class'] = detections[0]['class']
        result['confidence']      = detections[0]['confidence']
    return result


def draw_label(overlay, text, x1, y1, color, font_scale=0.45):
    """Draw a label above a bounding box, clamped to image bounds."""
    h, w = overlay.shape[:2]
    (lw, lh), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
  
    lx = max(0, min(x1, w - lw - 6))
    ly = max(lh + 4, y1 - 4)
    cv2.rectangle(overlay, (lx, ly - lh - 3), (lx + lw + 4, ly + 2), color, -1)
    cv2.putText(overlay, text, (lx + 2, ly - 1),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 1)


def init_websocket(socketio, face_detector, skin_analyzer, result_aggregator):

    @socketio.on('connect')
    def handle_connect():
        emit('connected', {'message': 'Connected'})

    @socketio.on('disconnect')
    def handle_disconnect():
        pass

    @socketio.on('analyze_frame')
    def handle_analyze_frame(data):
        try:
            image_data = data.get('image', '')
            if not image_data:
                emit('analysis_result', {'has_face': False, 'error': 'No image'})
                return

            if ',' in image_data:
                image_data = image_data.split(',')[1]

            image_bytes = base64.b64decode(image_data)
            nparr  = np.frombuffer(image_bytes, np.uint8)
            image  = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                emit('analysis_result', {'has_face': False, 'error': 'Invalid image'})
                return

            h_img, w_img = image.shape[:2]

            faces = face_detector.detect_faces(image)
            if not faces:
                emit('analysis_result', {'has_face': False, 'face_count': 0})
                return

            x, y, w, h = faces[0]['bbox']
            landmarks   = face_detector.get_face_landmarks(image)

            skin_result = predict_on_face(image, faces, skin_analyzer)
            combined    = result_aggregator.combine_results(skin_result)

            overlay = image.copy()

            cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 220, 0), 2)

          
            if landmarks:
                region_colors = {
                    'jaw':           (200, 200, 200),
                    'left_eyebrow':  (0,   165, 255),
                    'right_eyebrow': (0,   165, 255),
                    'nose':          (0,   220, 100),
                    'left_eye':      (80,  80,  255),
                    'right_eye':     (80,  80,  255),
                    'mouth':         (200, 0,   200),
                }
                for region, pts in landmarks.items():
                    color = region_colors.get(region, (255, 255, 255))
                    for pt in pts:
                        cv2.circle(overlay, (int(pt[0]), int(pt[1])), 2, color, -1)
                    if len(pts) > 1:
                        for i in range(len(pts) - 1):
                            cv2.line(overlay,
                                     (int(pts[i][0]),   int(pts[i][1])),
                                     (int(pts[i+1][0]), int(pts[i+1][1])),
                                     color, 1)
                        if region in ('left_eye', 'right_eye', 'mouth'):
                            cv2.line(overlay,
                                     (int(pts[-1][0]), int(pts[-1][1])),
                                     (int(pts[0][0]),  int(pts[0][1])),
                                     color, 1)

            used_label_rects = []

            for det in skin_result.get('detections', []):
                bx, by, bw, bh = det['bbox']
                x1 = max(0, bx);            y1 = max(0, by)
                x2 = min(w_img, bx + bw);   y2 = min(h_img, by + bh)

                # Skip tiny boxes (noise)
                if (x2 - x1) < 15 or (y2 - y1) < 15:
                    continue

                color = CONDITION_COLORS_BGR.get(det['class'], (0, 220, 220))

                cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)

                # Subtle fill
                sub = overlay[y1:y2, x1:x2]
                if sub.size > 0:
                    colored = np.full_like(sub, color)
                    cv2.addWeighted(sub, 0.88, colored, 0.12, 0, sub)
                    overlay[y1:y2, x1:x2] = sub

                label = f"{det['class']} {int(det['confidence']*100)}%"
                draw_label(overlay, label, x1, y1, color)


            score = combined.get('overall_health_score', 0)
            score_color = (0, 200, 0) if score >= 80 else \
                          (0, 165, 255) if score >= 60 else \
                          (0, 100, 255) if score >= 40 else \
                          (0, 0, 220)
            # Badge background
            cv2.rectangle(overlay, (6, 6), (185, 36), (20, 20, 20), -1)
            cv2.rectangle(overlay, (6, 6), (185, 36), score_color, 1)
            cv2.putText(overlay, f"Health: {score}/100", (12, 27),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, score_color, 2)

            _, buffer   = cv2.imencode('.jpg', overlay, [cv2.IMWRITE_JPEG_QUALITY, 82])
            overlay_b64 = base64.b64encode(buffer).decode('utf-8')

            emit('analysis_result', {
                'has_face':        True,
                'face_count':      1,
                'face_box':        [x, y, w, h],
                'landmarks':       landmarks,
                'skin_analysis':   skin_result,
                'combined':        combined,
                'annotated_image': f'data:image/jpeg;base64,{overlay_b64}',
            })

        except Exception as e:
            logger.error(f"Frame analysis error: {e}")
            emit('analysis_error', {'error': str(e)})

    return socketio