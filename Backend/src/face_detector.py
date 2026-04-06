# src/face_detector.py
import cv2
import numpy as np
import os

class FaceDetector:
    def __init__(self):
        # Use OpenCV's face detector
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Alternative cascade for better detection
        self.face_cascade_alt = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml'
        )
        
        # Profile face detector for side faces
        self.profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_profileface.xml'
        )
        
        self.landmarks_available = False
        print("✓ Face detector initialized with OpenCV")
    
    def detect_faces(self, image):
        """Detect faces in image using OpenCV"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Try primary cascade
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(50, 50)
        )
        
        # If no faces found, try alternative cascade
        if len(faces) == 0:
            faces = self.face_cascade_alt.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(50, 50)
            )
        
        # If still no faces, try profile cascade
        if len(faces) == 0:
            faces = self.profile_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(50, 50)
            )
        
        return [{'bbox': (int(x), int(y), int(w), int(h))} for (x, y, w, h) in faces]
    
    def get_face_landmarks(self, image):
        """Get simplified facial landmarks based on face proportions"""
        faces = self.detect_faces(image)
        if not faces:
            return None
        
        x, y, w, h = faces[0]['bbox']
        
        # Create landmark points based on face proportions
        landmarks = []
        
        # Face outline - 17 points
        for i in range(17):
            t = i / 16.0
            landmarks.append((int(x + w * t), int(y + h * 0.85)))
        
        # Left eyebrow - 5 points
        for i in range(5):
            t = i / 4.0
            landmarks.append((int(x + w * (0.15 + t * 0.15)), int(y + h * 0.25)))
        
        # Right eyebrow - 5 points
        for i in range(5):
            t = i / 4.0
            landmarks.append((int(x + w * (0.70 + t * 0.15)), int(y + h * 0.25)))
        
        # Nose bridge - 4 points
        for i in range(4):
            t = i / 3.0
            landmarks.append((int(x + w * 0.5), int(y + h * (0.35 + t * 0.1))))
        
        # Nose bottom - 5 points
        for i in range(5):
            t = i / 4.0
            landmarks.append((int(x + w * (0.4 + t * 0.2)), int(y + h * 0.55)))
        
        # Left eye - 6 points
        left_eye_center = (int(x + w * 0.33), int(y + h * 0.4))
        left_eye_radius = int(w * 0.08)
        for i in range(6):
            angle = i * 60 * np.pi / 180
            landmarks.append((
                int(left_eye_center[0] + left_eye_radius * np.cos(angle)),
                int(left_eye_center[1] + left_eye_radius * np.sin(angle))
            ))
        
        # Right eye - 6 points
        right_eye_center = (int(x + w * 0.67), int(y + h * 0.4))
        right_eye_radius = int(w * 0.08)
        for i in range(6):
            angle = i * 60 * np.pi / 180
            landmarks.append((
                int(right_eye_center[0] + right_eye_radius * np.cos(angle)),
                int(right_eye_center[1] + right_eye_radius * np.sin(angle))
            ))
        
        # Outer lips - 12 points
        for i in range(12):
            t = i / 11.0
            landmarks.append((int(x + w * (0.3 + t * 0.4)), int(y + h * 0.65)))
        
        # Inner lips - 8 points
        for i in range(8):
            t = i / 7.0
            landmarks.append((int(x + w * (0.38 + t * 0.24)), int(y + h * 0.68)))
        
        return landmarks
    
    def extract_eye_regions(self, image, landmarks=None):
        """Extract left and right eye regions"""
        faces = self.detect_faces(image)
        if not faces:
            return None, None, None, None
        
        x, y, w, h = faces[0]['bbox']
        
        # Define eye regions (approximate positions)
        left_eye_w = w // 6
        left_eye_h = h // 12
        left_eye_x = x + w // 4
        left_eye_y = y + h // 3
        
        right_eye_w = w // 6
        right_eye_h = h // 12
        right_eye_x = x + 5 * w // 8
        right_eye_y = y + h // 3
        
        # Ensure coordinates are within bounds
        left_eye_x = max(0, left_eye_x)
        left_eye_y = max(0, left_eye_y)
        right_eye_x = max(0, right_eye_x)
        right_eye_y = max(0, right_eye_y)
        
        left_eye_w = min(left_eye_w, image.shape[1] - left_eye_x)
        left_eye_h = min(left_eye_h, image.shape[0] - left_eye_y)
        right_eye_w = min(right_eye_w, image.shape[1] - right_eye_x)
        right_eye_h = min(right_eye_h, image.shape[0] - right_eye_y)
        
        if left_eye_w > 0 and left_eye_h > 0:
            left_eye_img = image[left_eye_y:left_eye_y + left_eye_h,
                                left_eye_x:left_eye_x + left_eye_w]
        else:
            left_eye_img = None
        
        if right_eye_w > 0 and right_eye_h > 0:
            right_eye_img = image[right_eye_y:right_eye_y + right_eye_h,
                                 right_eye_x:right_eye_x + right_eye_w]
        else:
            right_eye_img = None
        
        eye_bboxes = {
            'left': (left_eye_x, left_eye_y, left_eye_w, left_eye_h),
            'right': (right_eye_x, right_eye_y, right_eye_w, right_eye_h)
        }
        
        return left_eye_img, right_eye_img, eye_bboxes, None
    
    def draw_landmarks(self, image, landmarks, color=(0, 255, 0)):
        """Draw facial landmarks on image"""
        if landmarks is None:
            return image
        
        img_copy = image.copy()
        
        # Draw points
        for i, (x, y) in enumerate(landmarks):
            cv2.circle(img_copy, (x, y), 2, color, -1)
        
        return img_copy
    
    def highlight_defects(self, image, defect_regions, defect_type):
        """Highlight detected defects on the face"""
        img_copy = image.copy()
        
        colors = {
            'acne': (0, 0, 255),
            'blackheads': (0, 165, 255),
            'darkspots': (255, 0, 255),
            'dry': (255, 255, 0),
            'oily': (0, 255, 255),
            'hyperpigmentation': (255, 0, 255),
            'Conjunctivitis': (0, 0, 255),
            'Darkcircle': (128, 0, 128)
        }
        
        color = colors.get(defect_type, (0, 255, 0))
        
        for region in defect_regions:
            if len(region) == 4:
                x, y, w, h = region
                x = max(0, x)
                y = max(0, y)
                w = min(w, img_copy.shape[1] - x)
                h = min(h, img_copy.shape[0] - y)
                
                if w > 0 and h > 0:
                    cv2.rectangle(img_copy, (x, y), (x + w, y + h), color, 2)
                    label = defect_type.upper()
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    font_scale = 0.5
                    thickness = 1
                    text_size = cv2.getTextSize(label, font, font_scale, thickness)[0]
                    cv2.rectangle(img_copy, (x, y - 20), (x + text_size[0] + 10, y), color, -1)
                    cv2.putText(img_copy, label, (x + 5, y - 5), 
                               font, font_scale, (255, 255, 255), thickness)
        
        return img_copy
    
    def analyze_face_regions(self, image, landmarks, skin_analysis=None):
        """Analyze different regions of the face"""
        faces = self.detect_faces(image)
        if not faces:
            return []
        
        x, y, w, h = faces[0]['bbox']
        
        # Define face regions
        regions = {
            'forehead': (x + w//4, y, w//2, h//3),
            'left_cheek': (x, y + h//3, w//3, h//2),
            'right_cheek': (x + 2*w//3, y + h//3, w//3, h//2),
            'chin': (x + w//4, y + 2*h//3, w//2, h//3)
        }
        
        defect_regions = []
        
        if skin_analysis:
            predicted_class = skin_analysis.get('predicted_class', 'normal')
            confidence = skin_analysis.get('confidence', 0)
            
            if confidence > 0.6:
                if predicted_class in ['acne', 'blackheads']:
                    defect_regions.append(regions['left_cheek'])
                    defect_regions.append(regions['right_cheek'])
                    if confidence > 0.7:
                        defect_regions.append(regions['chin'])
                
                elif predicted_class in ['dry', 'oily']:
                    defect_regions.append(regions['forehead'])
                    defect_regions.append(regions['left_cheek'])
                    defect_regions.append(regions['right_cheek'])
                
                elif predicted_class in ['darkspots', 'hyperpigmentation']:
                    defect_regions.append(regions['forehead'])
                    defect_regions.append(regions['left_cheek'])
                    defect_regions.append(regions['right_cheek'])
                    defect_regions.append(regions['chin'])
        
        return defect_regions

    def create_analysis_overlay(self, image, landmarks, skin_result, eye_results):
        """Create a complete analysis overlay"""
        overlay = image.copy()
        
        # Draw face landmarks
        overlay = self.draw_landmarks(overlay, landmarks, (0, 255, 0))
        
        # Highlight skin defects
        if skin_result and skin_result.get('predicted_class') != 'normal':
            defect_regions = self.analyze_face_regions(image, landmarks, skin_result)
            overlay = self.highlight_defects(overlay, defect_regions, 
                                            skin_result.get('predicted_class', 'unknown'))
        
        # Highlight eye areas if issues detected
        if eye_results:
            left_eye = eye_results.get('left_eye', {})
            right_eye = eye_results.get('right_eye', {})
            
            faces = self.detect_faces(image)
            if faces:
                x, y, w, h = faces[0]['bbox']
                
                if left_eye and left_eye.get('predicted_class') != 'Normal':
                    left_eye_region = (x + w//4, y + h//3, w//6, h//8)
                    cv2.rectangle(overlay, 
                                (left_eye_region[0], left_eye_region[1]),
                                (left_eye_region[0] + left_eye_region[2], 
                                 left_eye_region[1] + left_eye_region[3]),
                                (0, 0, 255), 2)
                    cv2.putText(overlay, left_eye.get('predicted_class', 'Issue'),
                              (left_eye_region[0], left_eye_region[1]-5), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
                
                if right_eye and right_eye.get('predicted_class') != 'Normal':
                    right_eye_region = (x + 2*w//3, y + h//3, w//6, h//8)
                    cv2.rectangle(overlay,
                                (right_eye_region[0], right_eye_region[1]),
                                (right_eye_region[0] + right_eye_region[2],
                                 right_eye_region[1] + right_eye_region[3]),
                                (0, 0, 255), 2)
                    cv2.putText(overlay, right_eye.get('predicted_class', 'Issue'),
                              (right_eye_region[0], right_eye_region[1]-5),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
        # Add health score overlay
        health_score = 100
        if skin_result:
            health_score -= skin_result.get('severity_score', 0)
        if eye_results:
            if eye_results.get('left_eye', {}).get('predicted_class') != 'Normal':
                health_score -= eye_results.get('left_eye', {}).get('severity_score', 0)
            if eye_results.get('right_eye', {}).get('predicted_class') != 'Normal':
                health_score -= eye_results.get('right_eye', {}).get('severity_score', 0)
        
        health_score = max(0, min(100, health_score))
        
        # Draw score box
        score_text = f"Health Score: {health_score}"
        text_size = cv2.getTextSize(score_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
        cv2.rectangle(overlay, (10, 10), (10 + text_size[0] + 20, 50), (0, 0, 0), -1)
        cv2.rectangle(overlay, (10, 10), (10 + text_size[0] + 20, 50), (255, 255, 255), 1)
        
        if health_score >= 80:
            color = (0, 255, 0)
        elif health_score >= 60:
            color = (0, 255, 255)
        else:
            color = (0, 0, 255)
        
        cv2.putText(overlay, score_text, (20, 35), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        return overlay