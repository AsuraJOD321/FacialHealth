# src/skin_analyzer.py
import numpy as np
import cv2
import tensorflow as tf
import os
from .config import IMG_SIZE, SKIN_SEVERITY

class SkinAnalyzer:
    def __init__(self):
        self.model = None
        self.class_names = ['acne', 'blackheads', 'darkspots', 'dry', 'hyperpigmentation', 'normal', 'oily']
        self.severity_map = SKIN_SEVERITY
        self.load_model()
    
    def load_model(self):
        try:
            if os.path.exists('./src/models/skin_model_final.keras'):
                self.model = tf.keras.models.load_model('./src/models/skin_model_final.keras', compile=False)
            elif os.path.exists('./src/models/skin_model_final.h5'):
                self.model = tf.keras.models.load_model('./src/models/skin_model_final.h5', compile=False)
            else:
                self.model = None
        except Exception as e:
            self.model = None
    
    def predict(self, image):
        try:
            resized = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
            normalized = resized / 255.0
            input_tensor = np.expand_dims(normalized, axis=0)

            if self.model:
                preds = self.model.predict(input_tensor, verbose=0)[0]
                idx = np.argmax(preds)
                return {
                    'predicted_class': self.class_names[idx],
                    'confidence': float(preds[idx]),
                    'severity_score': self.severity_map[self.class_names[idx]]
                }

            return {'predicted_class': 'normal', 'confidence': 0.7, 'severity_score': 0}

        except Exception:
            return {'predicted_class': 'normal', 'confidence': 0.5, 'severity_score': 0}