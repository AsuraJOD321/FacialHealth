# src/face_detector.py
import cv2
import numpy as np

_MP_LEGACY = False
try:
    import mediapipe as mp
    _ = mp.solutions.face_mesh
    _ = mp.solutions.face_detection
    _MP_LEGACY = True
except Exception:
    pass

_REGION_INDICES = {
    'left_eye':      [33, 160, 158, 133, 153, 144, 163, 7],
    'right_eye':     [362, 385, 387, 263, 373, 380, 398, 249],
    'left_eyebrow':  [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
    'right_eyebrow': [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
    'nose':          [1, 2, 5, 4, 19, 94, 164, 0, 11, 12, 13, 14, 15, 16, 17, 18],
    'mouth':         [61, 185, 40, 39, 37, 0, 267, 269, 270, 409,
                      291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
    'jaw':           [10, 338, 297, 332, 284, 251, 389, 356, 454,
                      323, 361, 288, 397, 365, 379, 378, 400, 377,
                      152, 148, 176, 149, 150, 136, 172, 58, 132,
                      93, 234, 127, 162, 21, 54, 103, 67, 109],
}


class FaceDetector:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self._face_mesh      = None
        self._face_detection = None

        if _MP_LEGACY:
            try:
                import mediapipe as mp
                self._face_mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self._face_detection = mp.solutions.face_detection.FaceDetection(
                    model_selection=0,
                    min_detection_confidence=0.5,
                )
                print("[Landmarks] MediaPipe FaceMesh loaded successfully")
            except Exception as e:
                print(f"[Landmarks] MediaPipe init failed: {e} — using OpenCV")
        else:
            print("[Landmarks] MediaPipe not available — using OpenCV fallback")

    def detect_faces(self, image: np.ndarray) -> list:
        if self._face_detection is not None:
            rgb     = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self._face_detection.process(rgb)
            if results.detections:
                h, w = image.shape[:2]
                faces = []
                for det in results.detections:
                    bb = det.location_data.relative_bounding_box
                    x  = max(0, int(bb.xmin * w))
                    y  = max(0, int(bb.ymin * h))
                    fw = int(bb.width  * w)
                    fh = int(bb.height * h)
                    faces.append({'bbox': (x, y, fw, fh)})
                if faces:
                    return faces

        gray  = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)
        return [{'bbox': (int(x), int(y), int(w), int(h))} for (x, y, w, h) in faces]

    def get_face_landmarks(self, image: np.ndarray):
        if self._face_mesh is None:
            return None
        h, w    = image.shape[:2]
        rgb     = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self._face_mesh.process(rgb)
        if not results.multi_face_landmarks:
            return None
        lm      = results.multi_face_landmarks[0].landmark
        all_pts = [[int(lm[i].x * w), int(lm[i].y * h)] for i in range(len(lm))]
        return {
            region: [all_pts[i] for i in indices if i < len(all_pts)]
            for region, indices in _REGION_INDICES.items()
        }

    def extract_face_roi(self, image: np.ndarray):
        """Return the face region of interest for YOLO to analyze."""
        faces = self.detect_faces(image)
        if not faces:
            return None, None
        x, y, w, h = faces[0]['bbox']
        return image[y:y + h, x:x + w], faces[0]['bbox']

    def draw_landmarks(self, image: np.ndarray, landmarks: dict,
                       color: tuple = (0, 255, 0)) -> np.ndarray:
        if not landmarks:
            return image
        overlay = image.copy()
        for pts in landmarks.values():
            for pt in pts:
                cv2.circle(overlay, (int(pt[0]), int(pt[1])), 2, color, -1)
        return overlay

    def highlight_defects(self, image, defect_regions, defect_type):
        return image

    def analyze_face_regions(self, image, landmarks, skin_analysis=None):
        return []

    def create_analysis_overlay(self, image: np.ndarray, landmarks,
                                 skin_result, eye_results=None) -> np.ndarray:
        overlay = image.copy()
        faces   = self.detect_faces(image)
        if faces:
            x, y, w, h = faces[0]['bbox']
            cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 255, 0), 2)
            score = 100 - (skin_result.get('severity_score', 0) if skin_result else 0)
            score = max(0, min(100, score))
            cv2.putText(overlay, f"Score: {score}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        if landmarks:
            overlay = self.draw_landmarks(overlay, landmarks)
        return overlay