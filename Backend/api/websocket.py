# api/websocket.py
import cv2
import numpy as np
import base64
import logging
from flask_socketio import emit
from flask import request

logger = logging.getLogger(__name__)

def init_websocket(socketio, face_detector, skin_analyzer, eye_analyzer, result_aggregator):
    
    @socketio.on('connect')
    def handle_connect():
        logger.info("WebSocket client connected")
        emit('connected', {'message': 'Connected'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info("WebSocket client disconnected")
    
    @socketio.on('analyze_frame')
    def handle_analyze_frame(data):
        try:
            image_data = data.get('image', '')
            if not image_data:
                emit('analysis_result', {'has_face': False, 'error': 'No image'})
                return
            
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                emit('analysis_result', {'has_face': False, 'error': 'Invalid image'})
                return
            
            faces = face_detector.detect_faces(image)
            if not faces:
                emit('analysis_result', {'has_face': False, 'face_count': 0})
                return
            
            face = faces[0]
            x, y, w, h = face['bbox']
            face_roi = image[y:y+h, x:x+w]
            
            skin_result = skin_analyzer.predict(face_roi) if face_roi.size > 0 else None
            
            left_eye, right_eye, _, _ = face_detector.extract_eye_regions(image, None)
            left_result = eye_analyzer.predict(left_eye) if left_eye is not None and left_eye.size > 0 else None
            right_result = eye_analyzer.predict(right_eye) if right_eye is not None and right_eye.size > 0 else None
            
            combined = result_aggregator.combine_results(skin_result, left_result, right_result)
            
            overlay = image.copy()
            cv2.rectangle(overlay, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(overlay, f"Health: {combined.get('overall_health_score', 0)}", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            _, buffer = cv2.imencode('.jpg', overlay)
            overlay_base64 = base64.b64encode(buffer).decode('utf-8')
            
            result = {
                'has_face': True,
                'face_count': 1,
                'skin_analysis': skin_result,
                'left_eye': left_result,
                'right_eye': right_result,
                'combined': combined,
                'annotated_image': f'data:image/jpeg;base64,{overlay_base64}'
            }
            
            emit('analysis_result', result)
        except Exception as e:
            logger.error(f"Frame analysis error: {e}")
            emit('analysis_error', {'error': str(e)})
    
    return socketio