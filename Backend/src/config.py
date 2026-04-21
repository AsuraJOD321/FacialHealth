# src/config.py
import os

# Image settings
IMG_SIZE = 224

# Model paths - Use .keras files
SKIN_MODEL_PATH = os.getenv('SKIN_MODEL_PATH', './src/models/skin_model_final.keras')
SKIN_CLASSES_PATH = os.getenv('SKIN_CLASSES_PATH', './src/models/skin_class_names.json')
EYE_MODEL_PATH = os.getenv('EYE_MODEL_PATH', './src/models/eye_model_final.keras')
EYE_CLASSES_PATH = os.getenv('EYE_CLASSES_PATH', './src/models/eye_class_names.json')

# Severity scores for skin conditions
SKIN_SEVERITY = {
    'acne': 30,
    'blackheads': 20,
    'darkspots': 25,
    'dry': 15,
    'hyperpigmentation': 20,
    'normal': 0,
    'oily': 15
}

# Severity scores for eye conditions (only 3 classes)
EYE_SEVERITY = {
    'Darkcircle': 15,
    'Conjunctivitis': 25,
    'Normal': 0
}