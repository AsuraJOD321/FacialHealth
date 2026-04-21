# api/database.py
import mysql.connector
import time
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.connection = None
        self.connect()

    def connect(self):
        try:
            self.connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', '127.0.0.1'),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', ''),
                database=os.getenv('DB_NAME', 'facial_health_db'),
                autocommit=True
            )
            return True
        except Exception:
            self.connection = None
            return False

    def execute_query(self, query, params=None):
        for attempt in range(3):
            try:
                if self.connection is None:
                    self.connect()
                
                cursor = self.connection.cursor(dictionary=True)
                cursor.execute(query, params or ())
                
                if query.strip().upper().startswith("SELECT"):
                    result = cursor.fetchall()
                else:
                    result = cursor.lastrowid
                
                cursor.close()
                return result

            except Exception:
                self.connection = None
                time.sleep(0.5)

        return None

db = Database()