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
                autocommit=True,
                connection_timeout=10,
            )
            return True
        except Exception as e:
            print(f"[Database] Connection failed: {e}")
            self.connection = None
            return False

    def _is_connected(self):
        try:
            if self.connection is None:
                return False
            self.connection.ping(reconnect=False)
            return True
        except Exception:
            return False

    def execute_query(self, query, params=None):
        for attempt in range(3):
            cursor = None
            try:
                if not self._is_connected():
                    if not self.connect():
                        time.sleep(0.5)
                        continue
                cursor = self.connection.cursor(dictionary=True)
                cursor.execute(query, params or ())
                if query.strip().upper().startswith("SELECT"):
                    result = cursor.fetchall()
                else:
                    result = cursor.lastrowid
                return result
            except mysql.connector.Error as e:
                self.connection = None
                time.sleep(0.5)
            except Exception as e:
                self.connection = None
                time.sleep(0.5)
            finally:
                if cursor is not None:
                    try:
                        cursor.close()
                    except Exception:
                        pass
        return None


db = Database()