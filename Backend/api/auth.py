# api/auth.py
import jwt
import bcrypt
import datetime
import os
import time
import logging
from functools import wraps
from flask import request, jsonify, g
from database import db

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-in-production')
JWT_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))


def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password, hashed):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_token(user_id, username, user_type='user'):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'user_type': user_type,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=JWT_EXPIRES),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_token(token):
    """Verify and decode JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


def get_user_by_token(token):
    """Get user information from token"""
    payload = verify_token(token)
    if not payload:
        return None
    
    for attempt in range(3):
        try:
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
                return None
            
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
        except Exception as e:
            logger.error(f"Error getting user by token: {e}")
            if attempt == 2:
                return None
            time.sleep(0.5)
    
    return None


def register_user(username, email, password, full_name=None):
    """Register a new user"""
    # Add debug logging
    print(f"Registration attempt - Username: {username}, Email: {email}")
    
    # Check if user exists
    existing = db.execute_query(
        "SELECT id FROM users WHERE username = %s OR email = %s",
        (username, email)
    )
    if existing:
        print(f"User already exists: {username} or {email}")
        return {'error': 'Username or email already exists'}, 400
    
    # Validate inputs with specific error messages
    if not username or len(username) < 3:
        print(f"Invalid username: {username}")
        return {'error': 'Username must be at least 3 characters'}, 400
    
    if not password or len(password) < 6:
        print(f"Invalid password length")
        return {'error': 'Password must be at least 6 characters'}, 400
    
    if not email or '@' not in email or '.' not in email:
        print(f"Invalid email: {email}")
        return {'error': 'Invalid email address'}, 400
    
    # Create user
    try:
        hashed_pw = hash_password(password)
        user_id = db.execute_query(
            """INSERT INTO users (username, email, password_hash, full_name) 
               VALUES (%s, %s, %s, %s)""",
            (username, email, hashed_pw, full_name or username)
        )
        
        if user_id:
            logger.info(f"User registered: {username} (ID: {user_id})")
            return {'message': 'Registered successfully', 'user_id': user_id}, 201
        else:
            print("Database insert failed")
            return {'error': 'Registration failed - database error'}, 500
            
    except Exception as e:
        print(f"Registration error: {e}")
        return {'error': f'Registration failed: {str(e)}'}, 500
def login_user(username, password):
    """Authenticate user and return token"""
    try:
        # Find user by username or email
        result = db.execute_query(
            """SELECT id, username, email, password_hash, full_name 
               FROM users WHERE username = %s OR email = %s""",
            (username, username)
        )
        if not result:
            return {'error': 'Invalid credentials'}, 401
        
        user = result[0]
        if not verify_password(password, user['password_hash']):
            return {'error': 'Invalid credentials'}, 401
        
        # Generate token
        token = generate_token(user['id'], user['username'], 'user')
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=JWT_EXPIRES)
        
        # Store session
        db.execute_query(
            "INSERT INTO user_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user['id'], token, expires_at)
        )
        
        full_name = user.get('full_name') or user['username']
        
        logger.info(f"User logged in: {user['username']} (ID: {user['id']})")
        
        return {
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'full_name': full_name
            }
        }, 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return {'error': 'Database error, please try again'}, 500


def logout_user(token):
    """Logout user by removing session"""
    db.execute_query("DELETE FROM user_sessions WHERE token = %s", (token,))
    logger.info("User logged out")
    return {'message': 'Logged out'}, 200


def register_admin(username, email, password, full_name=None):
    """Register a new admin user"""
    existing = db.execute_query(
        "SELECT id FROM admin_users WHERE username = %s OR email = %s",
        (username, email)
    )
    if existing:
        return {'error': 'Admin username or email already exists'}, 400
    
    if len(username) < 3:
        return {'error': 'Username must be at least 3 characters'}, 400
    if len(password) < 6:
        return {'error': 'Password must be at least 6 characters'}, 400
    
    hashed_pw = hash_password(password)
    admin_id = db.execute_query(
        """INSERT INTO admin_users (username, email, password_hash, full_name) 
           VALUES (%s, %s, %s, %s)""",
        (username, email, hashed_pw, full_name or username)
    )
    
    if admin_id:
        logger.info(f"Admin registered: {username} (ID: {admin_id})")
        return {'message': 'Admin registered successfully', 'admin_id': admin_id}, 201
    return {'error': 'Registration failed'}, 500


def login_admin(username, password):
    """Authenticate admin and return token"""
    try:
        result = db.execute_query(
            """SELECT id, username, email, password_hash, full_name 
               FROM admin_users WHERE username = %s OR email = %s""",
            (username, username)
        )
        if not result:
            return {'error': 'Invalid credentials'}, 401
        
        admin = result[0]
        if not verify_password(password, admin['password_hash']):
            return {'error': 'Invalid credentials'}, 401
        
        token = generate_token(admin['id'], admin['username'], 'admin')
        
        # Update last login
        db.execute_query(
            "UPDATE admin_users SET last_login = NOW() WHERE id = %s",
            (admin['id'],)
        )
        
        full_name = admin.get('full_name') or admin['username']
        
        logger.info(f"Admin logged in: {admin['username']} (ID: {admin['id']})")
        
        return {
            'token': token,
            'admin': {
                'id': admin['id'],
                'username': admin['username'],
                'email': admin['email'],
                'full_name': full_name
            }
        }, 200
        
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return {'error': 'Database error, please try again'}, 500


def token_required(f):
    """Decorator to require valid user token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user = get_user_by_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        g.user = user
        g.token = token
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator to require admin token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user = get_user_by_token(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        
        payload = verify_token(token)
        if not payload or payload.get('user_type') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        g.admin = user
        g.admin_id = payload['user_id']
        g.token = token
        return f(*args, **kwargs)
    return decorated