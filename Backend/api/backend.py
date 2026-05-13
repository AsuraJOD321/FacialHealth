# api/backend.py
import os
import logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
logging.getLogger('tensorflow').setLevel(logging.ERROR)
logging.getLogger('absl').setLevel(logging.ERROR)
logging.getLogger('ultralytics').setLevel(logging.ERROR)

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import base64
import json
import cv2
import numpy as np
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from database import db
from auth import (
    register_user, login_user, logout_user, login_admin,
    admin_required, token_required, hash_password, verify_password
)
from src.face_detector import FaceDetector
from src.skin_analyzer import SkinAnalyzer
from src.result_aggregator import ResultAggregator

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret')
CORS(app, supports_credentials=True)

face_detector     = FaceDetector()
skin_analyzer     = SkinAnalyzer()
result_aggregator = ResultAggregator()

MAX_IMAGE_BYTES = 10 * 1024 * 1024

CONDITION_COLORS_BGR = {
    'Acne':           (0,   0,   220),
    'Blackheads':     (40,  40,  40),
    'Dark-Spots':     (120, 40,  140),
    'Dry-Skin':       (50,  120, 200),
    'Enlarged-Pores': (200, 180, 50),
    'Eyebags':        (180, 80,  200),
    'Oily-Skin':      (200, 200, 0),
    'Skin-Redness':   (0,   50,  220),
    'Whiteheads':     (200, 200, 200),
    'Wrinkles':       (50,  100, 180),
}


def predict_on_face(image, faces):
    """
    Run YOLO on a slightly padded face crop for accuracy,
    then offset detection boxes back to full image coordinates.
    """
    if not faces:
        return skin_analyzer._fallback()

    fx, fy, fw, fh = faces[0]['bbox']
    h_img, w_img   = image.shape[:2]

    # Add 10% padding around face for better context
    pad_x = int(fw * 0.10)
    pad_y = int(fh * 0.10)
    x1 = max(0, fx - pad_x)
    y1 = max(0, fy - pad_y)
    x2 = min(w_img, fx + fw + pad_x)
    y2 = min(h_img, fy + fh + pad_y)

    face_crop = image[y1:y2, x1:x2]
    if face_crop.size == 0:
        return skin_analyzer._fallback()

    result = skin_analyzer.predict(face_crop)

    # Offset all detection bboxes back to full image coordinates
    for det in result.get('detections', []):
        bx, by, bw, bh = det['bbox']
        det['bbox'] = [x1 + bx, y1 + by, bw, bh]

    return result


def draw_analysis_overlay(image, faces, skin_result, landmarks=None):
    overlay  = image.copy()
    h_img, w_img = overlay.shape[:2]

    # Face bounding box
    if faces:
        fx, fy, fw, fh = faces[0]['bbox']
        cv2.rectangle(overlay, (fx, fy), (fx + fw, fy + fh), (0, 220, 0), 2)

    # MediaPipe landmarks
    if landmarks:
        region_colors = {
            'jaw':           (180, 180, 180),
            'left_eyebrow':  (0,   165, 255),
            'right_eyebrow': (0,   165, 255),
            'nose':          (0,   220, 100),
            'left_eye':      (80,  80,  255),
            'right_eye':     (80,  80,  255),
            'mouth':         (200, 0,   200),
        }
        for region, pts in landmarks.items():
            color = region_colors.get(region, (255, 255, 255))
            for pt in pts:
                cv2.circle(overlay, (int(pt[0]), int(pt[1])), 2, color, -1)
            if len(pts) > 1:
                for i in range(len(pts) - 1):
                    cv2.line(overlay,
                             (int(pts[i][0]),   int(pts[i][1])),
                             (int(pts[i+1][0]), int(pts[i+1][1])),
                             color, 1)
                if region in ('left_eye', 'right_eye', 'mouth'):
                    cv2.line(overlay,
                             (int(pts[-1][0]), int(pts[-1][1])),
                             (int(pts[0][0]),  int(pts[0][1])),
                             color, 1)

    # YOLO detection boxes — already in full image coords
    if skin_result:
        for det in skin_result.get('detections', []):
            x1, y1, bw, bh = det['bbox']
            x2 = min(w_img, x1 + bw)
            y2 = min(h_img, y1 + bh)
            # Clamp to image bounds
            x1 = max(0, x1); y1 = max(0, y1)
            color = CONDITION_COLORS_BGR.get(det['class'], (0, 220, 220))

            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
            sub = overlay[y1:y2, x1:x2]
            if sub.size > 0:
                colored = np.full_like(sub, color)
                cv2.addWeighted(sub, 0.85, colored, 0.15, 0, sub)
                overlay[y1:y2, x1:x2] = sub

            label = f"{det['class']} {int(det['confidence']*100)}%"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            label_y = max(y1 - 5, lh + 5)
            cv2.rectangle(overlay, (x1, label_y - lh - 4), (x1 + lw + 4, label_y + 2), color, -1)
            cv2.putText(overlay, label, (x1 + 2, label_y - 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    # Health score badge
    if skin_result:
        combined = result_aggregator.combine_results(skin_result)
        score = combined.get('overall_health_score', 100)
        score_color = (0, 200, 0) if score >= 80 else (0, 165, 255) if score >= 60 else (0, 0, 220)
        cv2.rectangle(overlay, (8, 8), (170, 38), (0, 0, 0), -1)
        cv2.putText(overlay, f"Health Score: {score}/100", (12, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, score_color, 2)

    return overlay


def save_analysis(user_id, results, annotated_b64=None):
    skin       = results.get('skin_analysis') or {}
    detections = skin.get('detections', [])
    det_json   = json.dumps(detections) if detections else None
    return db.execute_query("""
        INSERT INTO analysis_history
        (user_id, skin_prediction, skin_confidence, health_score,
         annotated_image, detections_json)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        user_id,
        skin.get('predicted_class'),
        skin.get('confidence'),
        results.get('overall_health_score', 0),
        annotated_b64,
        det_json,
    ))


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------

@app.route('/api/me', methods=['GET'])
@token_required
def me():
    return jsonify({'user': g.user}), 200


@app.route('/api/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')
    if not current_password or not new_password:
        return jsonify({'error': 'Both current and new password are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    result = db.execute_query(
        "SELECT password_hash FROM users WHERE id = %s", (g.user['id'],)
    )
    if not result:
        return jsonify({'error': 'User not found'}), 404
    if not verify_password(current_password, result[0]['password_hash']):
        return jsonify({'error': 'Current password is incorrect'}), 401
    new_hash = hash_password(new_password)
    db.execute_query(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (new_hash, g.user['id'])
    )
    return jsonify({'message': 'Password updated successfully'}), 200


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
        if len(image_bytes) > MAX_IMAGE_BYTES:
            return jsonify({'error': 'Image too large. Maximum size is 10MB.'}), 400

        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400

        faces = face_detector.detect_faces(image)
        if not faces:
            return jsonify({'error': 'No face detected. Please ensure your face is clearly visible.'}), 400

        landmarks  = face_detector.get_face_landmarks(image)

        # Run YOLO on padded face crop, get boxes in full image coords
        skin_result = predict_on_face(image, faces)
        combined    = result_aggregator.combine_results(skin_result)

        annotated     = draw_analysis_overlay(image, faces, skin_result, landmarks)
        _, buffer      = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
        annotated_b64  = 'data:image/jpeg;base64,' + base64.b64encode(buffer).decode('utf-8')

        combined['analysis_id']     = save_analysis(g.user['id'], combined, annotated_b64)
        combined['annotated_image'] = annotated_b64

        return jsonify(combined), 200

    except Exception as e:
        print(f"[analyze] Error: {e}")
        return jsonify({'error': 'Analysis failed. Please try again.'}), 500


@app.route('/api/history', methods=['GET'])
@token_required
def get_history():
    try:
        limit   = request.args.get('limit', 50, type=int)
        offset  = request.args.get('offset', 0,  type=int)
        user_id = g.user['id']
        history = db.execute_query("""
            SELECT id, skin_prediction, skin_confidence, health_score,
                   detections_json, created_at
            FROM analysis_history WHERE user_id = %s
            ORDER BY created_at DESC LIMIT %s OFFSET %s
        """, (user_id, limit, offset))
        total_result = db.execute_query(
            "SELECT COUNT(*) as count FROM analysis_history WHERE user_id = %s", (user_id,)
        )
        total   = total_result[0]['count'] if total_result else 0
        history = history or []
        for item in history:
            if item.get('created_at'):
                item['created_at'] = str(item['created_at'])
            if item.get('detections_json'):
                try:
                    item['detections'] = json.loads(item['detections_json'])
                except Exception:
                    item['detections'] = []
            else:
                item['detections'] = []
            del item['detections_json']
        return jsonify({'history': history, 'total': total}), 200
    except Exception:
        return jsonify({'history': [], 'total': 0}), 200


@app.route('/api/history/<int:analysis_id>', methods=['GET'])
@token_required
def get_single_history(analysis_id):
    result = db.execute_query("""
        SELECT id, skin_prediction, skin_confidence, health_score,
               annotated_image, detections_json, created_at
        FROM analysis_history WHERE id = %s AND user_id = %s
    """, (analysis_id, g.user['id']))
    if not result:
        return jsonify({'error': 'Analysis not found'}), 404
    item = result[0]
    if item.get('created_at'):
        item['created_at'] = str(item['created_at'])
    if item.get('detections_json'):
        try:
            item['detections'] = json.loads(item['detections_json'])
        except Exception:
            item['detections'] = []
    else:
        item['detections'] = []
    del item['detections_json']
    return jsonify({'result': item}), 200


@app.route('/api/stats', methods=['GET'])
@token_required
def user_stats():
    try:
        user_id   = g.user['id']
        total     = db.execute_query("SELECT COUNT(*) as count FROM analysis_history WHERE user_id = %s", (user_id,))
        avg_score = db.execute_query("SELECT AVG(health_score) as avg FROM analysis_history WHERE user_id = %s", (user_id,))
        total_count = total[0]['count'] if total else 0
        avg_value   = round(float(avg_score[0]['avg']), 2) if avg_score and avg_score[0]['avg'] else 0
        return jsonify({'total_analyses': total_count, 'average_health_score': avg_value}), 200
    except Exception:
        return jsonify({'total_analyses': 0, 'average_health_score': 0}), 200


@app.route('/api/feedback', methods=['POST'])
@token_required
def submit_feedback():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    rating = data.get('rating')
    if not rating:
        return jsonify({'error': 'Rating required'}), 400
    feedback_id = db.execute_query(
        "INSERT INTO feedback (user_id, rating, comment) VALUES (%s, %s, %s)",
        (g.user['id'], rating, data.get('comment', ''))
    )
    return jsonify({'message': 'Feedback submitted', 'feedback_id': feedback_id}), 201


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@app.route('/api/admin/register', methods=['POST'])
@admin_required
def admin_register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    username  = data.get('username', '').strip()
    email     = data.get('email', '').strip()
    password  = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    existing = db.execute_query("SELECT id FROM admin_users WHERE username = %s", (username,))
    if existing:
        return jsonify({'error': 'Admin username already exists'}), 400
    hashed_pw = hash_password(password)
    admin_id  = db.execute_query(
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
    total_users    = db.execute_query("SELECT COUNT(*) as count FROM users")
    total_analyses = db.execute_query("SELECT COUNT(*) as count FROM analysis_history")
    avg_score      = db.execute_query("SELECT AVG(health_score) as avg FROM analysis_history")
    total_feedback = db.execute_query("SELECT COUNT(*) as count FROM feedback")
    avg_rating     = db.execute_query("SELECT AVG(rating) as avg FROM feedback")
    return jsonify({
        'total_users':          total_users[0]['count']    if total_users    else 0,
        'total_analyses':       total_analyses[0]['count'] if total_analyses else 0,
        'average_health_score': round(float(avg_score[0]['avg']), 2) if avg_score and avg_score[0]['avg'] else 0,
        'total_feedback':       total_feedback[0]['count'] if total_feedback else 0,
        'average_rating':       round(float(avg_rating[0]['avg']), 2) if avg_rating and avg_rating[0]['avg'] else 0,
    }), 200


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_users():
    users = db.execute_query("SELECT id, username, email, full_name, created_at FROM users ORDER BY created_at DESC")
    result = users or []
    for u in result:
        if u.get('created_at'): u['created_at'] = str(u['created_at'])
    return jsonify({'users': result}), 200


@app.route('/api/admin/analyses', methods=['GET'])
@admin_required
def admin_analyses():
    analyses = db.execute_query("""
        SELECT a.id, a.user_id, a.skin_prediction, a.health_score, a.created_at, u.username
        FROM analysis_history a LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
    """)
    result = analyses or []
    for a in result:
        if a.get('created_at'): a['created_at'] = str(a['created_at'])
    return jsonify({'analyses': result}), 200


@app.route('/api/admin/feedback', methods=['GET'])
@admin_required
def admin_feedback():
    feedback = db.execute_query("""
        SELECT f.id, f.user_id, f.rating, f.comment, f.created_at, u.username
        FROM feedback f LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
    """)
    result = feedback or []
    for f in result:
        if f.get('created_at'): f['created_at'] = str(f['created_at'])
    return jsonify({'feedback': result}), 200


@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    db.execute_query("DELETE FROM analysis_history WHERE user_id = %s", (user_id,))
    db.execute_query("DELETE FROM feedback WHERE user_id = %s", (user_id,))
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
    print("\n" + "=" * 40)
    print(" FaceHealth API Server")
    print("=" * 40)
    print(" URL : http://localhost:5000")
    print("=" * 40 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)