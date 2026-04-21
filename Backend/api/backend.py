# api/backend.py
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import base64
import cv2
import numpy as np
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from database import db
from auth import register_user, login_user, logout_user, login_admin, admin_required, token_required
from src.face_detector import FaceDetector
from src.skin_analyzer import SkinAnalyzer
from src.result_aggregator import ResultAggregator

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret')
CORS(app, supports_credentials=True)

face_detector = FaceDetector()
skin_analyzer = SkinAnalyzer()
result_aggregator = ResultAggregator()

def save_analysis(user_id, results):
    skin = results.get('skin_analysis', {})
    return db.execute_query("""
        INSERT INTO analysis_history 
        (user_id, skin_prediction, skin_confidence, health_score)
        VALUES (%s, %s, %s, %s)
    """, (
        user_id,
        skin.get('predicted_class'),
        skin.get('confidence'),
        results.get('overall_health_score', 0)
    ))

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/register', methods=['POST'])
def register():
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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    result, status = login_user(data.get('username', ''), data.get('password', ''))
    return jsonify(result), status

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
        if not data or not data.get('image'):
            return jsonify({'error': 'No image provided'}), 400

        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return jsonify({'error': 'Invalid image'}), 400

        faces = face_detector.detect_faces(image)
        if not faces:
            return jsonify({'error': 'No face detected'}), 400

        x, y, w, h = faces[0]['bbox']
        face_roi = image[y:y+h, x:x+w]

        skin_result = skin_analyzer.predict(face_roi)
        combined = result_aggregator.combine_results(skin_result)

        analysis_id = save_analysis(g.user['id'], combined)
        combined['analysis_id'] = analysis_id

        return jsonify(combined), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
@token_required
def get_history():
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Use the user from g (set by token_required)
        user_id = g.user['id']
        
        history = db.execute_query("""
            SELECT id, skin_prediction, skin_confidence, health_score, created_at
            FROM analysis_history WHERE user_id = %s
            ORDER BY created_at DESC LIMIT %s OFFSET %s
        """, (user_id, limit, offset))
        
        total_result = db.execute_query(
            "SELECT COUNT(*) as count FROM analysis_history WHERE user_id = %s",
            (user_id,)
        )
        
        total = total_result[0]['count'] if total_result else 0
        
        # Convert datetime to string for JSON serialization
        for item in history:
            if item.get('created_at'):
                item['created_at'] = str(item['created_at'])
        
        return jsonify({
            'history': history if history else [],
            'total': total
        }), 200
    except Exception as e:
        print(f"History error: {e}")
        return jsonify({'history': [], 'total': 0}), 200

@app.route('/api/history/<int:analysis_id>', methods=['GET'])
@token_required
def get_single_history(analysis_id):
    result = db.execute_query("""
        SELECT id, skin_prediction, skin_confidence, health_score, created_at
        FROM analysis_history WHERE id = %s AND user_id = %s
    """, (analysis_id, g.user['id']))
    
    if not result:
        return jsonify({'error': 'Analysis not found'}), 404
    
    return jsonify({'result': result[0]}), 200

@app.route('/api/stats', methods=['GET'])
@token_required
def user_stats():
    try:
        user_id = g.user['id']
        
        total = db.execute_query(
            "SELECT COUNT(*) as count FROM analysis_history WHERE user_id = %s",
            (user_id,)
        )
        avg_score = db.execute_query(
            "SELECT AVG(health_score) as avg FROM analysis_history WHERE user_id = %s",
            (user_id,)
        )
        
        total_count = total[0]['count'] if total and len(total) > 0 else 0
        avg_value = round(avg_score[0]['avg'], 2) if avg_score and len(avg_score) > 0 and avg_score[0]['avg'] else 0
        
        return jsonify({
            'total_analyses': total_count,
            'average_health_score': avg_value
        }), 200
    except Exception as e:
        print(f"Stats error: {e}")
        return jsonify({'total_analyses': 0, 'average_health_score': 0}), 200
        
@app.route('/api/feedback', methods=['POST'])
@token_required
def submit_feedback():
    data = request.get_json()
    rating = data.get('rating')
    if not rating:
        return jsonify({'error': 'Rating required'}), 400
    
    feedback_id = db.execute_query(
        "INSERT INTO feedback (user_id, rating, comment) VALUES (%s, %s, %s)",
        (g.user['id'], rating, data.get('comment', ''))
    )
    return jsonify({'message': 'Feedback submitted', 'feedback_id': feedback_id}), 201

@app.route('/api/admin/register', methods=['POST'])
def admin_register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    
    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    existing = db.execute_query(
        "SELECT id FROM admin_users WHERE username = %s",
        (username,)
    )
    if existing:
        return jsonify({'error': 'Admin username already exists'}), 400
    
    from auth import hash_password
    hashed_pw = hash_password(password)
    
    admin_id = db.execute_query(
        "INSERT INTO admin_users (username, email, password_hash, full_name) VALUES (%s, %s, %s, %s)",
        (username, email, hashed_pw, full_name or username)
    )
    
    if admin_id:
        return jsonify({'message': 'Admin registered successfully', 'admin_id': admin_id}), 201
    return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    result, status = login_admin(data.get('username', ''), data.get('password', ''))
    return jsonify(result), status

@app.route('/api/admin/me', methods=['GET'])
@admin_required
def admin_me():
    return jsonify({'admin': g.admin}), 200

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    total_users = db.execute_query("SELECT COUNT(*) as count FROM users")
    total_analyses = db.execute_query("SELECT COUNT(*) as count FROM analysis_history")
    avg_score = db.execute_query("SELECT AVG(health_score) as avg FROM analysis_history")
    total_feedback = db.execute_query("SELECT COUNT(*) as count FROM feedback")
    avg_rating = db.execute_query("SELECT AVG(rating) as avg FROM feedback")
    
    return jsonify({
        'total_users': total_users[0]['count'] if total_users else 0,
        'total_analyses': total_analyses[0]['count'] if total_analyses else 0,
        'average_health_score': round(avg_score[0]['avg'], 2) if avg_score and avg_score[0]['avg'] else 0,
        'total_feedback': total_feedback[0]['count'] if total_feedback else 0,
        'average_rating': round(avg_rating[0]['avg'], 2) if avg_rating and avg_rating[0]['avg'] else 0
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_users():
    users = db.execute_query("SELECT id, username, email, full_name, created_at FROM users ORDER BY created_at DESC")
    return jsonify({'users': users or []}), 200

@app.route('/api/admin/analyses', methods=['GET'])
@admin_required
def admin_analyses():
    analyses = db.execute_query("""
        SELECT a.id, a.user_id, a.skin_prediction, a.health_score, a.created_at, u.username 
        FROM analysis_history a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
    """)
    return jsonify({'analyses': analyses or []}), 200

@app.route('/api/admin/feedback', methods=['GET'])
@admin_required
def admin_feedback():
    feedback = db.execute_query("""
        SELECT f.id, f.user_id, f.rating, f.comment, f.created_at, u.username 
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
    """)
    return jsonify({'feedback': feedback or []}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    db.execute_query("DELETE FROM analysis_history WHERE user_id = %s", (user_id,))
    db.execute_query("DELETE FROM users WHERE id = %s", (user_id,))
    return jsonify({'message': 'User deleted'}), 200

@app.route('/api/admin/analyses/<int:analysis_id>', methods=['DELETE'])
@admin_required
def admin_delete_analysis(analysis_id):
    db.execute_query("DELETE FROM analysis_history WHERE id = %s", (analysis_id,))
    return jsonify({'message': 'Analysis deleted'}), 200

@app.route('/api/admin/feedback/<int:feedback_id>', methods=['DELETE'])
@admin_required
def admin_delete_feedback(feedback_id):
    db.execute_query("DELETE FROM feedback WHERE id = %s", (feedback_id,))
    return jsonify({'message': 'Feedback deleted'}), 200

if __name__ == '__main__':
    print("DB Connected")
    print("Server running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)