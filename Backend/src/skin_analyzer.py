# src/skin_analyzer.py
import numpy as np
import cv2
import json
import tensorflow as tf
import os
from .config import SKIN_MODEL_PATH, SKIN_CLASSES_PATH, IMG_SIZE, SKIN_SEVERITY

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class SkinAnalyzer:
    def __init__(self):
        self.model = None
        self.class_names = None
        self.severity_map = SKIN_SEVERITY
        self.load_model()

    def load_model(self):
        try:
            # Try loading .keras file first, then .h5
            model_path = None
            if os.path.exists(SKIN_MODEL_PATH):
                model_path = SKIN_MODEL_PATH
            elif os.path.exists('./src/models/skin_model_final.keras'):
                model_path = './src/models/skin_model_final.keras'
            elif os.path.exists('./src/models/skin_model_final.h5'):
                model_path = './src/models/skin_model_final.h5'
            
            if model_path and os.path.exists(model_path):
                tf.keras.backend.clear_session()
                self.model = tf.keras.models.load_model(model_path, compile=False)
                print(f"✓ Skin model loaded from: {model_path}")
                
                # Load class names
                if os.path.exists(SKIN_CLASSES_PATH):
                    with open(SKIN_CLASSES_PATH, 'r') as f:
                        class_dict = json.load(f)
                        self.class_names = [class_dict[str(i)] for i in range(len(class_dict))]
                    print(f"✓ Skin classes: {self.class_names}")
                else:
                    print(f"⚠ Skin class names not found at {SKIN_CLASSES_PATH}")
                    self.class_names = ['acne', 'blackheads', 'darkspots', 'dry', 'hyperpigmentation', 'normal', 'oily']
            else:
                print(f"✗ Skin model not found")
                self.model = None
        except Exception as e:
            print(f"✗ Skin model error: {e}")
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
            return {'predicted_class': 'normal', 'confidence': 0, 'severity_score': 0, 'error': 'Model not loaded'}
        
        input_tensor = self.preprocess_image(image)
        if input_tensor is None:
            return {'predicted_class': 'normal', 'confidence': 0, 'severity_score': 0, 'error': 'Invalid image'}
        
        try:
            predictions = self.model.predict(input_tensor, verbose=0)[0]
            predicted_idx = np.argmax(predictions)
            
            if self.class_names and predicted_idx < len(self.class_names):
                predicted_class = self.class_names[predicted_idx]
            else:
                predicted_class = list(self.severity_map.keys())[predicted_idx] if predicted_idx < len(self.severity_map) else 'normal'
            
            confidence = float(predictions[predicted_idx])
            
            return {
                'predicted_class': predicted_class,
                'confidence': confidence,
                'severity_score': self.severity_map.get(predicted_class, 10),
                'all_probabilities': {self.class_names[i]: float(predictions[i]) for i in range(len(self.class_names))} if self.class_names else {}
            }
        except Exception as e:
            print(f"Prediction error: {e}")
            return {'predicted_class': 'normal', 'confidence': 0, 'severity_score': 0, 'error': str(e)}

    def get_recommendations(self, predicted_class):
        recommendations = {
            'acne': ["Use gentle cleanser with salicylic acid", "Avoid touching your face", "Use non-comedogenic moisturizer", "Consult dermatologist for severe cases"],
            'blackheads': ["Use salicylic acid cleanser", "Exfoliate 2-3 times per week", "Use clay masks", "Avoid harsh scrubbing"],
            'darkspots': ["Use vitamin C serum", "Apply sunscreen daily (SPF 30+)", "Consider niacinamide", "Use gentle exfoliation"],
            'dry': ["Use hydrating moisturizer", "Drink plenty of water", "Use gentle, fragrance-free products", "Avoid hot water when washing face"],
            'hyperpigmentation': ["Use sunscreen daily (SPF 50+)", "Consider vitamin C serum", "Use niacinamide", "Avoid picking at skin"],
            'normal': ["Maintain current routine", "Use sunscreen daily", "Stay hydrated", "Get adequate sleep"],
            'oily': ["Use oil-free products", "Cleanse twice daily", "Use salicylic acid", "Use lightweight moisturizer"]
        }
        return recommendations.get(predicted_class, ["Maintain healthy skincare habits", "Use sunscreen daily", "Stay hydrated"])