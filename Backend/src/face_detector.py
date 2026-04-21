# src/face_detector.py
import cv2

class FaceDetector:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
    
    def detect_faces(self, image):
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)
        return [{'bbox': (int(x), int(y), int(w), int(h))} for (x, y, w, h) in faces]
    
    def extract_eye_regions(self, image, landmarks=None):
        faces = self.detect_faces(image)
        if not faces:
            return None, None, None, None
        
        x, y, w, h = faces[0]['bbox']
        
        left_eye = image[y + h//3:y + h//2, x + w//6:x + w//3]
        right_eye = image[y + h//3:y + h//2, x + 2*w//3:x + 5*w//6]
        
        return left_eye, right_eye, None, None
    
    def get_face_landmarks(self, image):
        return None
    
    def draw_landmarks(self, image, landmarks, color=(0, 255, 0)):
        return image
    
    def highlight_defects(self, image, defect_regions, defect_type):
        return image
    
    def analyze_face_regions(self, image, landmarks, skin_analysis=None):
        return []
    
    def create_analysis_overlay(self, image, landmarks, skin_result, eye_results):
        overlay = image.copy()
        faces = self.detect_faces(image)
        if faces:
            x, y, w, h = faces[0]['bbox']
            cv2.rectangle(overlay, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            health_score = 100
            if skin_result:
                health_score -= skin_result.get('severity_score', 0)
            
            health_score = max(0, min(100, health_score))
            cv2.putText(overlay, f"Score: {health_score}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return overlay