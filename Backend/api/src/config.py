# src/config.py
import os

IMG_SIZE = 224

SKIN_MODEL_PATH = os.getenv('SKIN_MODEL_PATH', r'C:\models\best.pt')

SKIN_SEVERITY = {
    'Acne':           30,
    'Blackheads':     20,
    'Dark-Spots':     25,
    'Dry-Skin':       15,
    'Enlarged-Pores': 10,
    'Eyebags':        15,
    'Oily-Skin':      15,
    'Skin-Redness':   20,
    'Whiteheads':     20,
    'Wrinkles':       20,
    'Normal':          0,
}