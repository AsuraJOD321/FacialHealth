# api/auth.py
import jwt
import bcrypt
import datetime
import os
from functools import wraps
from flask import request, jsonify, g
from database import db

JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-in-production')
JWT_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))

def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_token(user_id, username, user_type='user'):
    payload = {
        'user_id': user_id,
        'username': username,
        'user_type': user_type,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=JWT_EXPIRES)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except:
        return None

def get_user_by_token(token):
    if not token:
        return None
    
    payload = verify_token(token)
    if not payload:
        return None
    
    if payload.get('user_type') == 'user':
        result = db.execute_query(
            "SELECT id, username, email, full_name FROM users WHERE id = %s",
            (payload['user_id'],)
        )
        if result:
            user = result[0]
            return {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'full_name': user.get('full_name') or user['username']
            }
    elif payload.get('user_type') == 'admin':
        result = db.execute_query(
            "SELECT id, username, email, full_name FROM admin_users WHERE id = %s",
            (payload['user_id'],)
        )
        if result:
            admin = result[0]
            return {
                'id': admin['id'],
                'username': admin['username'],
                'email': admin['email'],
                'full_name': admin.get('full_name') or admin['username']
            }
    
    return None

def register_user(username, email, password, full_name=None):
    if not username or len(username) < 3:
        return {'error': 'Username must be at least 3 characters'}, 400
    if not password or len(password) < 6:
        return {'error': 'Password must be at least 6 characters'}, 400
    if not email or '@' not in email:
        return {'error': 'Invalid email address'}, 400
    
    existing = db.execute_query(
        "SELECT id FROM users WHERE username = %s OR email = %s",
        (username, email)
    )
    if existing:
        return {'error': 'Username or email already exists'}, 400
    
    hashed_pw = hash_password(password)
    user_id = db.execute_query(
        "INSERT INTO users (username, email, password_hash, full_name) VALUES (%s, %s, %s, %s)",
        (username, email, hashed_pw, full_name or username)
    )
    
    if user_id:
        return {'message': 'Registered successfully'}, 201
    return {'error': 'Registration failed'}, 500

def login_user(username, password):
    result = db.execute_query(
        "SELECT id, username, email, password_hash, full_name FROM users WHERE username = %s OR email = %s",
        (username, username)
    )
    if not result:
        return {'error': 'Invalid credentials'}, 401
    
    user = result[0]
    if not verify_password(password, user['password_hash']):
        return {'error': 'Invalid credentials'}, 401
    
    token = generate_token(user['id'], user['username'], 'user')
    
    return {
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user.get('full_name') or user['username']
        }
    }, 200

def logout_user(token):
    return {'message': 'Logged out'}, 200

def login_admin(username, password):
    result = db.execute_query(
        "SELECT id, username, email, password_hash, full_name FROM admin_users WHERE username = %s",
        (username,)
    )
    if not result:
        return {'error': 'Invalid credentials'}, 401
    
    admin = result[0]
    if not verify_password(password, admin['password_hash']):
        return {'error': 'Invalid credentials'}, 401
    
    token = generate_token(admin['id'], admin['username'], 'admin')
    
    return {
        'token': token,
        'admin': {
            'id': admin['id'],
            'username': admin['username'],
            'email': admin['email'],
            'full_name': admin.get('full_name') or admin['username']
        }
    }, 200

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'Missing token'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid token format'}), 401
        
        token = parts[1]
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = get_user_by_token(token)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        g.user = user
        g.token = token
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Missing token'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid token format'}), 401
        
        token = parts[1]
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        if payload.get('user_type') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        admin = get_user_by_token(token)
        if not admin:
            return jsonify({'error': 'Admin not found'}), 401
        
        g.admin = admin
        return f(*args, **kwargs)
    return decorated