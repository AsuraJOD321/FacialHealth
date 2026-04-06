# api/backend.py
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import warnings
warnings.filterwarnings('ignore')

import sys
import base64
import cv2
import numpy as np
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv
from functools import wraps
from datetime import datetime
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from database import db
from auth import register_user, login_user, logout_user, get_user_by_token, login_admin, admin_required, token_required
from src.face_detector import FaceDetector
from src.skin_analyzer import SkinAnalyzer
from src.eye_analyzer import EyeAnalyzer
from src.result_aggregator import ResultAggregator

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret')
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"])

# Initialize components
print("\n" + "="*50)
print("INITIALIZING BACKEND COMPONENTS")
print("="*50)

face_detector = FaceDetector()
skin_analyzer = SkinAnalyzer()
eye_analyzer = EyeAnalyzer()
result_aggregator = ResultAggregator()

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Import WebSocket handlers
from websocket import init_websocket
init_websocket(socketio, face_detector, skin_analyzer, eye_analyzer, result_aggregator)

def save_analysis(user_id, results):
    try:
        skin = results.get('skin_analysis', {})
        left = results.get('left_eye', {})
        right = results.get('right_eye', {})
        return db.execute_query("""
            INSERT INTO analysis_history 
            (user_id, skin_prediction, skin_confidence, left_eye_prediction, 
             left_eye_confidence, right_eye_prediction, right_eye_confidence, health_score)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, 
              skin.get('predicted_class') if skin else None, 
              skin.get('confidence') if skin else None,
              left.get('predicted_class') if left else None,
              left.get('confidence') if left else None,
              right.get('predicted_class') if right else None,
              right.get('confidence') if right else None,
              results.get('overall_health_score', 0)))
    except Exception as e:
        logger.error(f"Save analysis error: {e}")
        return None

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'database': db.is_connected(),
        'skin_model': skin_analyzer.model is not None,
        'eye_model': eye_analyzer.model is not None
    }), 200

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result, status = register_user(
            data.get('username', '').strip(),
            data.get('email', '').strip(),
            data.get('password', ''),
            data.get('full_name', '').strip()
        )
        return jsonify(result), status
    except Exception as e:
        logger.error(f"Register error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result, status = login_user(data.get('username', ''), data.get('password', ''))
        return jsonify(result), status
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
@token_required
def logout():
    result, status = logout_user(g.token)
    return jsonify(result), status

@app.route('/api/me', methods=['GET'])
@token_required
def me():
    return jsonify({'user': g.user}), 200

@app.route('/api/analyze', methods=['POST'])
@token_required
def analyze():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        image_data = data.get('image', '')
        if not image_data:
            return jsonify({'error': 'No image data'}), 400
        
        # Decode image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Detect faces
        faces = face_detector.detect_faces(image)
        
        if not faces:
            return jsonify({'error': 'No face detected in the image. Please upload a clear face photo.'}), 400
        
        # Get first face
        face = faces[0]
        x, y, w, h = face['bbox']
        
        # Ensure coordinates are within image bounds
        x = max(0, x)
        y = max(0, y)
        w = min(w, image.shape[1] - x)
        h = min(h, image.shape[0] - y)
        
        if w <= 0 or h <= 0:
            return jsonify({'error': 'Invalid face region detected'}), 400
        
        face_roi = image[y:y+h, x:x+w]
        
        # Analyze skin
        skin_result = None
        if face_roi.size > 0 and skin_analyzer.model is not None:
            skin_result = skin_analyzer.predict(face_roi)
            print(f"Skin analysis result: {skin_result}")
        
        # Extract and analyze eyes
        left_eye, right_eye, eye_bboxes, _ = face_detector.extract_eye_regions(image, None)
        
        left_result = None
        right_result = None
        
        if left_eye is not None and left_eye.size > 0 and eye_analyzer.model is not None:
            left_result = eye_analyzer.predict(left_eye)
            print(f"Left eye result: {left_result}")
        
        if right_eye is not None and right_eye.size > 0 and eye_analyzer.model is not None:
            right_result = eye_analyzer.predict(right_eye)
            print(f"Right eye result: {right_result}")
        
        # Combine results
        combined = result_aggregator.combine_results(skin_result, left_result, right_result)
        
        # Save to history
        analysis_id = save_analysis(g.user['id'], combined)
        combined['analysis_id'] = analysis_id
        
        return jsonify(combined), 200
        
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
@token_required
def history():
    try:
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        history = db.execute_query("""
            SELECT id, skin_prediction, left_eye_prediction, right_eye_prediction, 
                   health_score, created_at
            FROM analysis_history WHERE user_id = %s
            ORDER BY created_at DESC LIMIT %s OFFSET %s
        """, (g.user['id'], limit, offset))
        
        total = db.execute_query(
            "SELECT COUNT(*) as c FROM analysis_history WHERE user_id = %s",
            (g.user['id'],)
        )
        
        return jsonify({
            'history': history or [],
            'total': total[0]['c'] if total else 0
        }), 200
    except Exception as e:
        logger.error(f"History error: {e}")
        return jsonify({'history': [], 'total': 0}), 200

@app.route('/api/stats', methods=['GET'])
@token_required
def user_stats():
    try:
        total = db.execute_query(
            "SELECT COUNT(*) as count FROM analysis_history WHERE user_id = %s",
            (g.user['id'],)
        )
        
        avg_score = db.execute_query(
            "SELECT AVG(health_score) as avg FROM analysis_history WHERE user_id = %s",
            (g.user['id'],)
        )
        
        return jsonify({
            'total_analyses': total[0]['count'] if total else 0,
            'average_health_score': round(avg_score[0]['avg'], 2) if avg_score and avg_score[0]['avg'] else 0
        }), 200
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return jsonify({'total_analyses': 0, 'average_health_score': 0}), 200

@app.route('/api/feedback', methods=['POST'])
@token_required
def submit_feedback():
    try:
        data = request.get_json()
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        if not rating:
            return jsonify({'error': 'Rating required'}), 400
        
        feedback_id = db.execute_query("""
            INSERT INTO feedback (user_id, rating, comment)
            VALUES (%s, %s, %s)
        """, (g.user['id'], rating, comment))
        
        return jsonify({'message': 'Feedback submitted', 'feedback_id': feedback_id}), 201
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        return jsonify({'error': str(e)}), 500

# Admin routes
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        result, status = login_admin(data.get('username', ''), data.get('password', ''))
        return jsonify(result), status
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/me', methods=['GET'])
@admin_required
def admin_me():
    return jsonify({'admin': g.admin}), 200

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    try:
        total_users = db.execute_query("SELECT COUNT(*) as c FROM users")
        total_analyses = db.execute_query("SELECT COUNT(*) as c FROM analysis_history")
        avg_score = db.execute_query("SELECT AVG(health_score) as avg FROM analysis_history")
        total_feedback = db.execute_query("SELECT COUNT(*) as c FROM feedback")
        avg_rating = db.execute_query("SELECT AVG(rating) as avg FROM feedback")
        
        return jsonify({
            'total_users': total_users[0]['c'] if total_users else 0,
            'total_analyses': total_analyses[0]['c'] if total_analyses else 0,
            'average_health_score': round(avg_score[0]['avg'], 2) if avg_score and avg_score[0]['avg'] else 0,
            'total_feedback': total_feedback[0]['c'] if total_feedback else 0,
            'average_rating': round(avg_rating[0]['avg'], 2) if avg_rating and avg_rating[0]['avg'] else 0
        }), 200
    except Exception as e:
        logger.error(f"Admin stats error: {e}")
        return jsonify({
            'total_users': 0,
            'total_analyses': 0,
            'average_health_score': 0,
            'total_feedback': 0,
            'average_rating': 0
        }), 200

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_users():
    try:
        users = db.execute_query("""
            SELECT id, username, email, full_name, created_at 
            FROM users ORDER BY created_at DESC LIMIT 50
        """)
        return jsonify({'users': users or []}), 200
    except Exception as e:
        logger.error(f"Admin users error: {e}")
        return jsonify({'users': []}), 200

@app.route('/api/admin/analyses', methods=['GET'])
@admin_required
def admin_analyses():
    try:
        analyses = db.execute_query("""
            SELECT a.*, u.username FROM analysis_history a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC LIMIT 50
        """)
        return jsonify({'analyses': analyses or []}), 200
    except Exception as e:
        logger.error(f"Admin analyses error: {e}")
        return jsonify({'analyses': []}), 200

@app.route('/api/admin/feedback', methods=['GET'])
@admin_required
def admin_feedback():
    try:
        feedback = db.execute_query("""
            SELECT f.*, u.username FROM feedback f
            LEFT JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC LIMIT 50
        """)
        return jsonify({'feedback': feedback or []}), 200
    except Exception as e:
        logger.error(f"Admin feedback error: {e}")
        return jsonify({'feedback': []}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    try:
        db.execute_query("DELETE FROM analysis_history WHERE user_id = %s", (user_id,))
        db.execute_query("DELETE FROM user_sessions WHERE user_id = %s", (user_id,))
        db.execute_query("DELETE FROM users WHERE id = %s", (user_id,))
        return jsonify({'message': 'User deleted'}), 200
    except Exception as e:
        logger.error(f"Admin delete user error: {e}")
        return jsonify({'error': 'Failed to delete user'}), 500

@app.route('/api/admin/analyses/<int:analysis_id>', methods=['DELETE'])
@admin_required
def admin_delete_analysis(analysis_id):
    try:
        db.execute_query("DELETE FROM analysis_history WHERE id = %s", (analysis_id,))
        return jsonify({'message': 'Analysis deleted'}), 200
    except Exception as e:
        logger.error(f"Admin delete analysis error: {e}")
        return jsonify({'error': 'Failed to delete analysis'}), 500

@app.route('/api/admin/feedback/<int:feedback_id>', methods=['DELETE'])
@admin_required
def admin_delete_feedback(feedback_id):
    try:
        db.execute_query("DELETE FROM feedback WHERE id = %s", (feedback_id,))
        return jsonify({'message': 'Feedback deleted'}), 200
    except Exception as e:
        logger.error(f"Admin delete feedback error: {e}")
        return jsonify({'error': 'Failed to delete feedback'}), 500

if __name__ == '__main__':
   
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)