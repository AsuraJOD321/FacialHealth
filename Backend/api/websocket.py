# api/websocket.py
import cv2
import numpy as np
import base64
import logging
from flask_socketio import emit
from flask import request

logger = logging.getLogger(__name__)

def convert_to_serializable(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def init_websocket(socketio, face_detector, skin_analyzer, eye_analyzer, result_aggregator):
    
    @socketio.on('connect')
    def handle_connect():
        logger.info(f"Client connected: {request.sid}")
        emit('connected', {'message': 'Connected to analysis server'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info(f"Client disconnected: {request.sid}")
    
    @socketio.on('start_stream')
    def handle_start_stream(data=None):
        logger.info(f"Started stream for client: {request.sid}")
        emit('stream_started', {'status': 'success'})
    
    @socketio.on('stop_stream')
    def handle_stop_stream(data=None):
        logger.info(f"Stopped stream for client: {request.sid}")
        emit('stream_stopped', {'status': 'success'})
    
    @socketio.on('analyze_frame')
    def handle_analyze_frame(data):
        try:
            if not data or 'image' not in data:
                emit('analysis_result', {'has_face': False, 'error': 'No image data'})
                return
            
            image_data = data.get('image', '')
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                emit('analysis_result', {'has_face': False, 'error': 'Invalid image'})
                return
            
            # Detect faces
            faces = face_detector.detect_faces(image)
            
            if not faces or len(faces) == 0:
                emit('analysis_result', {
                    'has_face': False,
                    'face_count': 0,
                    'message': 'No face detected'
                })
                return
            
            # Get the largest face
            face = max(faces, key=lambda f: f['bbox'][2] * f['bbox'][3])
            x, y, w, h = face['bbox']
            
            # Ensure coordinates are within bounds
            x = max(0, x)
            y = max(0, y)
            w = min(w, image.shape[1] - x)
            h = min(h, image.shape[0] - y)
            
            if w <= 0 or h <= 0:
                emit('analysis_result', {'has_face': False, 'error': 'Invalid face region'})
                return
            
            face_roi = image[y:y+h, x:x+w]
            
            # Analyze skin
            skin_result = None
            if skin_analyzer and skin_analyzer.model:
                skin_result = skin_analyzer.predict(face_roi)
            else:
                skin_result = {'predicted_class': 'normal', 'confidence': 0, 'severity_score': 0}
            
            # Extract and analyze eyes
            left_eye, right_eye, _, _ = face_detector.extract_eye_regions(image, None)
            
            left_result = None
            right_result = None
            
            if eye_analyzer and eye_analyzer.model:
                if left_eye is not None and left_eye.size > 0:
                    left_result = eye_analyzer.predict(left_eye)
                if right_eye is not None and right_eye.size > 0:
                    right_result = eye_analyzer.predict(right_eye)
            
            # Default values
            if left_result is None:
                left_result = {'predicted_class': 'Normal', 'confidence': 0, 'severity_score': 0}
            if right_result is None:
                right_result = {'predicted_class': 'Normal', 'confidence': 0, 'severity_score': 0}
            
            # Combine results
            combined = result_aggregator.combine_results(skin_result, left_result, right_result)
            
            # Create overlay
            try:
                overlay = face_detector.create_analysis_overlay(image, None, skin_result, 
                                                                {'left_eye': left_result, 'right_eye': right_result})
                _, buffer = cv2.imencode('.jpg', overlay, [cv2.IMWRITE_JPEG_QUALITY, 85])
                overlay_base64 = base64.b64encode(buffer).decode('utf-8')
            except Exception as e:
                logger.error(f"Overlay creation error: {e}")
                overlay_base64 = ""
            
            # Convert to serializable format
            result = {
                'has_face': True,
                'face_count': len(faces),
                'skin_analysis': convert_to_serializable(skin_result) if skin_result else None,
                'left_eye': convert_to_serializable(left_result) if left_result else None,
                'right_eye': convert_to_serializable(right_result) if right_result else None,
                'combined': convert_to_serializable(combined),
                'annotated_image': f'data:image/jpeg;base64,{overlay_base64}' if overlay_base64 else '',
                'landmarks_available': False
            }
            
            emit('analysis_result', result)
            
        except Exception as e:
            logger.error(f"Frame analysis error: {e}")
            emit('analysis_error', {'error': str(e)})
    
    return socketio