# api/database.py
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import threading
import time
import logging

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Database:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(Database, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        self.connection = None
        self.connect()
    
    def connect(self):
        """Establish database connection"""
        try:
            if self.connection:
                try:
                    self.connection.close()
                except:
                    pass
            
            host = os.getenv('DB_HOST', 'localhost')
            user = os.getenv('DB_USER', 'root')
            password = os.getenv('DB_PASSWORD', '')
            database = os.getenv('DB_NAME', 'facial_health_db')
            
            self.connection = mysql.connector.connect(
                host=host,
                user=user,
                password=password,
                database=database,
                autocommit=False,
                pool_reset_session=True,
                connection_timeout=30,
                use_pure=True
            )
            
            cursor = self.connection.cursor()
            cursor.execute("SET SESSION wait_timeout = 28800")
            cursor.execute("SET SESSION interactive_timeout = 28800")
            cursor.close()
            
            logger.info("Database connected successfully")
            return True
            
        except Error as e:
            logger.error(f"Database connection error: {e}")
            self.connection = None
            return False
    
    def is_connected(self):
        """Check if database connection is alive"""
        if self.connection is None:
            return False
        try:
            self.connection.ping(reconnect=True, attempts=3, delay=1)
            return True
        except:
            return False
    
    def ensure_connection(self):
        """Ensure database connection is active"""
        if not self.is_connected():
            return self.connect()
        return True
    
    def execute_query(self, query, params=None):
        """Execute a database query"""
        cursor = None
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                if not self.ensure_connection():
                    if attempt == max_retries - 1:
                        logger.error("Failed to establish database connection")
                        return None
                    time.sleep(1)
                    continue
                
                cursor = self.connection.cursor(dictionary=True)
                cursor.execute(query, params or ())
                
                if query.strip().upper().startswith('SELECT'):
                    result = cursor.fetchall()
                    return result
                else:
                    self.connection.commit()
                    return cursor.lastrowid
                    
            except Error as e:
                logger.error(f"Query error (attempt {attempt + 1}): {e}")
                if self.connection:
                    try:
                        self.connection.rollback()
                    except:
                        pass
                self.connection = None
                if attempt == max_retries - 1:
                    return None
                time.sleep(1)
            finally:
                if cursor:
                    try:
                        cursor.close()
                    except:
                        pass
        return None
    
    def close(self):
        """Close database connection"""
        if self.connection:
            try:
                self.connection.close()
                logger.info("Database connection closed")
            except:
                pass
            self.connection = None


# Singleton instance
db = Database()