# src/eye_analyzer.py
import numpy as np
import cv2
import json
import tensorflow as tf
import os
from .config import EYE_MODEL_PATH, EYE_CLASSES_PATH, IMG_SIZE, EYE_SEVERITY

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class EyeAnalyzer:
    def __init__(self):
        self.model = None
        self.full_class_names = None
        self.target_classes = ['Conjunctivitis', 'Darkcircle', 'Normal']
        self.severity_map = EYE_SEVERITY
        self.load_model()

    def load_model(self):
        try:
            # Try loading .keras file first, then .h5
            model_path = None
            if os.path.exists(EYE_MODEL_PATH):
                model_path = EYE_MODEL_PATH
            elif os.path.exists('./src/models/eye_model_final.keras'):
                model_path = './src/models/eye_model_final.keras'
            elif os.path.exists('./src/models/eye_model_final.h5'):
                model_path = './src/models/eye_model_final.h5'
            
            if model_path and os.path.exists(model_path):
                tf.keras.backend.clear_session()
                self.model = tf.keras.models.load_model(model_path, compile=False)
                print(f"✓ Eye model loaded from: {model_path}")
                
                # Load class names
                if os.path.exists(EYE_CLASSES_PATH):
                    with open(EYE_CLASSES_PATH, 'r') as f:
                        class_dict = json.load(f)
                        self.full_class_names = [class_dict[str(i)] for i in range(len(class_dict))]
                    print(f"✓ Full eye classes: {self.full_class_names}")
                    print(f"✓ Using target classes: {self.target_classes}")
            else:
                print(f"✗ Eye model not found")
                self.model = None
        except Exception as e:
            print(f"✗ Eye model error: {e}")
            self.model = None

    def preprocess_image(self, image):
        if image is None or image.size == 0:
            return None
        try:
            if len(image.shape) == 3 and image.shape[2] == 3:
                resized = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
            else:
                resized = cv2.resize(cv2.cvtColor(image, cv2.COLOR_GRAY2RGB), (IMG_SIZE, IMG_SIZE))
            normalized = resized / 255.0
            return np.expand_dims(normalized, axis=0)
        except Exception as e:
            print(f"Preprocess error: {e}")
            return None

    def predict(self, image):
        if self.model is None:
            return {'predicted_class': 'Normal', 'confidence': 0, 'severity_score': 0, 'error': 'Model not loaded'}
        
        input_tensor = self.preprocess_image(image)
        if input_tensor is None:
            return {'predicted_class': 'Normal', 'confidence': 0, 'severity_score': 0, 'error': 'Invalid image'}
        
        try:
            predictions = self.model.predict(input_tensor, verbose=0)[0]
            
            # Map to target classes based on original order
            # Original order from your JSON: [Cataract, Conjunctivitis, Darkcircle, Eyelid, Normal, Uveitis]
            target_indices = {'Conjunctivitis': 1, 'Darkcircle': 2, 'Normal': 4}
            
            target_probs = {}
            for class_name, idx in target_indices.items():
                if idx < len(predictions):
                    target_probs[class_name] = float(predictions[idx])
                else:
                    target_probs[class_name] = 0.0
            
            predicted_class = max(target_probs, key=target_probs.get)
            confidence = target_probs[predicted_class]
            
            return {
                'predicted_class': predicted_class,
                'confidence': confidence,
                'severity_score': self.severity_map.get(predicted_class, 0),
                'all_probabilities': target_probs
            }
        except Exception as e:
            print(f"Eye prediction error: {e}")
            return {'predicted_class': 'Normal', 'confidence': 0, 'severity_score': 0, 'error': str(e)}

    def get_recommendations(self, predicted_class):
        recommendations = {
            'Darkcircle': [
                "Get 7-9 hours of sleep daily",
                "Apply cold compress in the morning",
                "Elevate head while sleeping",
                "Reduce salt intake before bed",
                "Drink plenty of water (8 glasses)",
                "Use cucumber slices or cold tea bags on eyes"
            ],
            'Conjunctivitis': [
                "Wash hands frequently with soap",
                "Avoid touching or rubbing eyes",
                "Use clean towel and washcloth daily",
                "Remove contact lenses until healed",
                "Apply cold compress for comfort",
                "Change pillowcases frequently",
                "Consult a doctor if symptoms persist"
            ],
            'Normal': [
                "Take regular breaks during screen time",
                "Blink more frequently when using screens",
                "Get adequate sleep (7-9 hours)",
                "Wear sunglasses outdoors",
                "Stay hydrated",
                "Follow 20-20-20 rule"
            ]
        }
        return recommendations.get(predicted_class, [
            "Take regular breaks during screen time",
            "Stay hydrated",
            "Get adequate sleep"
        ])