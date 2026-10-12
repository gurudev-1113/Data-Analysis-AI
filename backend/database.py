import os
import sqlite3
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

try:
    import sqlitecloud
    SQLITECLOUD_AVAILABLE = True
except ImportError:
    SQLITECLOUD_AVAILABLE = False

# SQLite Cloud URI provided by User
SQLITECLOUD_URI = os.environ.get(
    "SQLITECLOUD_URI",
    "sqlitecloud://cyvqlstrdk.g5.sqlite.cloud:8860/auth.sqlitecloud?apikey=d5ZgcdtAXJLbVuWuaWjeLsTb5dilZGQaKV1GtoUFej4"
)

LOCAL_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'datamind.db')

class SQLiteCloudRow:
    """Dictionary and index-accessible Row object for SQLite Cloud results."""
    def __init__(self, description, row_tuple):
        self._data = {col[0]: row_tuple[i] for i, col in enumerate(description)}
        self._tuple = row_tuple

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._tuple[key]
        return self._data[key]

    def get(self, key, default=None):
        return self._data.get(key, default)

    def keys(self):
        return self._data.keys()

    def values(self):
        return self._data.values()

    def items(self):
        return self._data.items()

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)

    def __repr__(self):
        return repr(self._data)

class CloudCursor:
    def __init__(self, cursor):
        self._cur = cursor

    @property
    def lastrowid(self):
        return getattr(self._cur, 'lastrowid', None)

    @property
    def description(self):
        return getattr(self._cur, 'description', None)

    def execute(self, sql, params=()):
        self._cur.execute(sql, params)
        return self

    def fetchone(self):
        row = self._cur.fetchone()
        if not row:
            return None
        return SQLiteCloudRow(self._cur.description, row)

    def fetchall(self):
        rows = self._cur.fetchall()
        if not rows:
            return []
        desc = self._cur.description
        return [SQLiteCloudRow(desc, r) for r in rows]

class CloudDBConnection:
    def __init__(self, uri):
        self._conn = sqlitecloud.connect(uri)

    def execute(self, sql, params=()):
        cursor = self._conn.cursor()
        cursor.execute(sql, params)
        return CloudCursor(cursor)

    def cursor(self):
        return CloudCursor(self._conn.cursor())

    def commit(self):
        try:
            self._conn.commit()
        except Exception:
            pass

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass

def get_db_connection():
    """Connect to SQLite Cloud or fallback to local SQLite."""
    if SQLITECLOUD_AVAILABLE and SQLITECLOUD_URI:
        try:
            return CloudDBConnection(SQLITECLOUD_URI)
        except Exception as e:
            print(f"[DATABASE] SQLite Cloud connection fallback due to: {e}")

    # Fallback to local SQLite
    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_db_info():
    """Returns the active database type and storage details."""
    is_cloud = False
    if SQLITECLOUD_AVAILABLE and SQLITECLOUD_URI:
        try:
            conn = CloudDBConnection(SQLITECLOUD_URI)
            conn.execute("SELECT 1")
            conn.close()
            is_cloud = True
        except Exception:
            is_cloud = False

    if is_cloud:
        return {
            "engine": "SQLite Cloud",
            "host": "cyvqlstrdk.g5.sqlite.cloud:8860",
            "database": "auth.sqlitecloud",
            "status": "Cloud Connected",
            "size_kb": 64.0
        }
    else:
        size_kb = 0.0
        if os.path.exists(LOCAL_DB_PATH):
            size_kb = round(os.path.getsize(LOCAL_DB_PATH) / 1024, 2)
        return {
            "engine": "SQLite Local",
            "host": "localhost (local file)",
            "database": "datamind.db",
            "status": "Local Active",
            "size_kb": size_kb
        }

def init_db():
    """Initialize database tables and seed default users."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')

    # 2. Audit Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. User Datasets Storage Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            dataset_name TEXT NOT NULL,
            file_path TEXT,
            row_count INTEGER,
            col_count INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()

    # Seed Default Admin if not exists
    cursor.execute('SELECT * FROM users WHERE username = ?', ('admin',))
    if not cursor.fetchone():
        admin_pwd = generate_password_hash('admin123')
        cursor.execute('''
            INSERT INTO users (email, username, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, 1)
        ''', ('admin@datamind.ai', 'admin', admin_pwd, 'admin'))

        # Seed Sample Analyst User
        analyst_pwd = generate_password_hash('analyst123')
        cursor.execute('''
            INSERT INTO users (email, username, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, 1)
        ''', ('analyst@datamind.ai', 'analyst', analyst_pwd, 'user'))

        conn.commit()
        log_audit(1, 'admin', 'SYSTEM_INITIALIZE', 'Created default admin and analyst accounts in SQLite Cloud')

    conn.close()
    print("[DATABASE] Initialized SQLite Cloud database schema & seed accounts.")

def log_audit(user_id, username, action, details='', ip_address='127.0.0.1'):
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO audit_logs (user_id, username, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, username, action, details, ip_address))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[AUDIT] Audit log error: {e}")

def get_user_by_username_or_email(identifier):
    conn = get_db_connection()
    user = conn.execute('''
        SELECT * FROM users WHERE username = ? OR email = ?
    ''', (identifier, identifier)).fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return user

def update_last_login(user_id):
    conn = get_db_connection()
    conn.execute('''
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    ''', (user_id,))
    conn.commit()
    conn.close()
