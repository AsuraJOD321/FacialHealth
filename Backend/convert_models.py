# convert_models.py
import tensorflow as tf
import os
from tensorflow.keras.layers import InputLayer

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

print(f"TensorFlow version: {tf.__version__}")

model_dir = r"C:\Users\trilo\OneDrive\Desktop\FinalProject\models"

class CustomInputLayer(InputLayer):
    def __init__(self, batch_shape=None, **kwargs):
        if batch_shape:
            input_shape = batch_shape[1:]
            super().__init__(input_shape=input_shape, **kwargs)
        else:
            super().__init__(**kwargs)

custom_objects = {
    'InputLayer': CustomInputLayer,
    'Functional': tf.keras.models.Model,
    'ReLU': tf.keras.layers.ReLU,
    'Add': tf.keras.layers.Add,
    'Conv2D': tf.keras.layers.Conv2D,
    'BatchNormalization': tf.keras.layers.BatchNormalization,
    'DepthwiseConv2D': tf.keras.layers.DepthwiseConv2D,
    'GlobalAveragePooling2D': tf.keras.layers.GlobalAveragePooling2D,
    'Dense': tf.keras.layers.Dense,
    'Dropout': tf.keras.layers.Dropout,
    'ZeroPadding2D': tf.keras.layers.ZeroPadding2D,
    'MobileNetV2': tf.keras.applications.MobileNetV2
}

skin_keras = os.path.join(model_dir, "skin_model_final.keras")
skin_h5 = os.path.join(model_dir, "skin_model_final.h5")

if os.path.exists(skin_keras):
    try:
        model = tf.keras.models.load_model(skin_keras, custom_objects=custom_objects, compile=False)
        model.save(skin_h5, save_format='h5')
        print("Skin model converted to H5")
    except Exception as e:
        print(f"Skin conversion error: {e}")

eye_keras = os.path.join(model_dir, "eye_model_final.keras")
eye_h5 = os.path.join(model_dir, "eye_model_final.h5")

if os.path.exists(eye_keras):
    try:
        model = tf.keras.models.load_model(eye_keras, custom_objects=custom_objects, compile=False)
        model.save(eye_h5, save_format='h5')
        print("Eye model converted to H5")
    except Exception as e:
        print(f"Eye conversion error: {e}")