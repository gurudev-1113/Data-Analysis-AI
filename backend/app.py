import os
import io
import base64
import tempfile
import datetime
import functools
import numpy as np
import pandas as pd
import jwt
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, f1_score, roc_auc_score
from scipy import stats
from fpdf import FPDF
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from database import init_db, get_db_connection, log_audit, get_user_by_username_or_email, get_user_by_id, update_last_login, get_db_info

os.environ['MPLCONFIGDIR'] = os.path.join(tempfile.gettempdir(), 'matplotlib')

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get('SECRET_KEY', 'datamind-ai-enterprise-jwt-key-2026-secure')

# Initialize SQLite Cloud DB on startup
init_db()

current_df = None
history_stack = []
MAX_HISTORY = 30
trained_models = {}

# ----------------- JWT AUTHENTICATION DECORATORS -----------------
def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
        if not token:
            return jsonify({"error": "Authentication token missing"}), 401
            
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user = get_user_by_id(payload['user_id'])
            if not user or not user['is_active']:
                return jsonify({"error": "User account inactive or not found"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session token expired. Please login again."}), 401
        except Exception:
            return jsonify({"error": "Invalid authentication token"}), 401
            
        return f(user, *args, **kwargs)
    return decorated

def admin_required(f):
    @functools.wraps(f)
    @token_required
    def decorated(user, *args, **kwargs):
        if user['role'] != 'admin':
            return jsonify({"error": "Administrator privilege required"}), 403
        return f(user, *args, **kwargs)
    return decorated

def optional_token():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            return get_user_by_id(payload['user_id'])
        except:
            return None
    return None

def save_history():
    global current_df, history_stack
    if current_df is not None:
        history_stack.append(current_df.copy())
        if len(history_stack) > MAX_HISTORY:
            history_stack.pop(0)

def clean_val_for_json(val):
    if pd.isna(val) or val is None or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
        return None
    if isinstance(val, (np.int64, np.int32, np.int16, np.int8)):
        return int(val)
    if isinstance(val, (np.float64, np.float32, np.float16)):
        return round(float(val), 4)
    if isinstance(val, (pd.Timestamp, np.datetime64)):
        return str(val)
    return val

def resolve_col(target, df, prefer_numeric=False):
    if df is None or df.empty:
        return None
    cols = df.columns.tolist()
    if not target:
        if prefer_numeric:
            num = df.select_dtypes(include=[np.number]).columns.tolist()
            return num[0] if num else (cols[0] if cols else None)
        return cols[0] if cols else None
    
    if target in cols:
        if prefer_numeric and not pd.api.types.is_numeric_dtype(df[target]):
            num = df.select_dtypes(include=[np.number]).columns.tolist()
            return num[0] if num else target
        return target
    
    clean_target = str(target).strip().lower().replace(' ', '_')
    for c in cols:
        if str(c).strip().lower().replace(' ', '_') == clean_target:
            return c
    for c in cols:
        if clean_target in str(c).strip().lower().replace(' ', '_'):
            return c
    if prefer_numeric:
        num = df.select_dtypes(include=[np.number]).columns.tolist()
        return num[0] if num else (cols[0] if cols else None)
    return cols[0] if cols else None

def get_data_summary(df):
    if df is None or df.empty:
        return {"columns": [], "rows": 0, "missing_values": {}, "data_types": {}, "head": []}
    
    clean_head = []
    for row in df.head(15).reset_index().to_dict(orient="records"):
        clean_row = {k: clean_val_for_json(v) for k, v in row.items()}
        clean_head.append(clean_row)

    return {
        "columns": df.columns.tolist(),
        "rows": len(df),
        "missing_values": {c: int(df[c].isnull().sum()) for c in df.columns},
        "data_types": {c: str(df[c].dtype) for c in df.columns},
        "head": clean_head
    }

# ----------------- PRESET SAMPLE DATASETS -----------------
SAMPLE_DATASETS = {
    "saas_churn": {
        "name": "SaaS Customer Churn & Metrics",
        "description": "500 customer records with monthly charges, usage tenure, support tickets, satisfaction score, and churn status.",
        "generate": lambda: pd.DataFrame({
            "CustomerID": [f"CUST-{1000+i}" for i in range(250)],
            "Age": np.random.randint(20, 68, 250),
            "Tenure_Months": np.random.randint(1, 48, 250),
            "Monthly_Charges": np.round(np.random.uniform(29.99, 199.99, 250), 2),
            "Total_Spend": np.round(np.random.uniform(100, 7500, 250), 2),
            "Support_Tickets": np.random.poisson(1.8, 250),
            "Contract_Type": np.random.choice(["Month-to-Month", "One Year", "Two Year"], 250, p=[0.55, 0.30, 0.15]),
            "Satisfaction_Score": np.random.choice([1, 2, 3, 4, 5], 250, p=[0.1, 0.15, 0.35, 0.25, 0.15]),
            "Churned": np.random.choice(["Yes", "No"], 250, p=[0.24, 0.76])
        })
    },
    "sales_finance": {
        "name": "Global Retail Sales & Profit Trends",
        "description": "Historical sales orders across regions, categories, discounts, unit prices, and operating profits.",
        "generate": lambda: pd.DataFrame({
            "Order_Date": pd.date_range(start="2024-01-01", periods=200, freq="D").strftime("%Y-%m-%d"),
            "Region": np.random.choice(["North America", "Europe", "Asia-Pacific", "Latin America"], 200),
            "Category": np.random.choice(["Technology", "Office Supplies", "Furniture", "Consumer Electronics"], 200),
            "Units_Sold": np.random.randint(1, 50, 200),
            "Unit_Price": np.round(np.random.uniform(15, 450, 200), 2),
            "Discount_Pct": np.round(np.random.choice([0.0, 0.05, 0.10, 0.15, 0.25], 200), 2),
            "Marketing_Spend": np.round(np.random.uniform(500, 5000, 200), 2),
            "Customer_Rating": np.round(np.random.uniform(2.5, 5.0, 200), 1)
        }).assign(
            Revenue=lambda d: np.round(d["Units_Sold"] * d["Unit_Price"] * (1 - d["Discount_Pct"]), 2),
            Profit=lambda d: np.round(d["Revenue"] * np.random.uniform(0.12, 0.38, len(d)), 2)
        )
    },
    "real_estate": {
        "name": "Real Estate Housing & Valuation",
        "description": "Property listings with square footage, bedrooms, bathrooms, crime index, school ratings, and sale prices.",
        "generate": lambda: pd.DataFrame({
            "Property_ID": [f"PROP-{2000+i}" for i in range(200)],
            "Square_Feet": np.random.randint(750, 4200, 200),
            "Bedrooms": np.random.choice([1, 2, 3, 4, 5], 200, p=[0.1, 0.25, 0.4, 0.2, 0.05]),
            "Bathrooms": np.random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 4.0], 200),
            "Neighborhood": np.random.choice(["Downtown", "Suburbs", "Uptown", "West End", "Riverside"], 200),
            "Year_Built": np.random.randint(1975, 2024, 200),
            "School_Rating": np.random.randint(3, 10, 200),
            "Distance_To_Center_KM": np.round(np.random.uniform(1.2, 28.5, 200), 1),
            "Price_USD": np.round(np.random.randint(750, 4200, 200) * np.random.uniform(180, 320, 200) + np.random.randint(3, 10, 200) * 12000, -2)
        })
    }
}

# ----------------- AUTHENTICATION ENDPOINTS -----------------
@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json or {}
    email = str(data.get("email", "")).strip().lower()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    
    if not email or not username or not password:
        return jsonify({"error": "Email, username, and password are required"}), 400
        
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
        
    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM users WHERE email = ? OR username = ?', (email, username)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "User with this email or username already exists"}), 400
        
    pwd_hash = generate_password_hash(password)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO users (email, username, password_hash, role, is_active)
        VALUES (?, ?, ?, 'user', 1)
    ''', (email, username, pwd_hash))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    log_audit(user_id, username, 'REGISTER', f"Registered user {username} ({email})", request.remote_addr)
    
    token = jwt.encode({
        "user_id": user_id,
        "username": username,
        "role": "user",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": {"id": user_id, "email": email, "username": username, "role": "user"}
    })

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json or {}
    identifier = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    
    if not identifier or not password:
        return jsonify({"error": "Username/Email and password required"}), 400
        
    user = get_user_by_username_or_email(identifier)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"error": "Invalid username or password"}), 401
        
    if not user['is_active']:
        return jsonify({"error": "Account is disabled. Contact system administrator."}), 403
        
    update_last_login(user['id'])
    log_audit(user['id'], user['username'], 'LOGIN', f"User {user['username']} logged in", request.remote_addr)
    
    token = jwt.encode({
        "user_id": user['id'],
        "username": user['username'],
        "role": user['role'],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "username": user['username'],
            "role": user['role']
        }
    })

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user = optional_token()
    if not user:
        return jsonify({"authenticated": False, "user": None})
    return jsonify({
        "authenticated": True,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "username": user['username'],
            "role": user['role'],
            "created_at": str(user['created_at']),
            "last_login": str(user['last_login'])
        }
    })

# ----------------- ADMIN DASHBOARD & USER MANAGEMENT -----------------
@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_get_users(current_admin):
    conn = get_db_connection()
    users = conn.execute('''
        SELECT id, email, username, role, is_active, created_at, last_login
        FROM users ORDER BY id ASC
    ''').fetchall()
    conn.close()
    
    user_list = []
    for u in users:
        user_list.append({
            "id": u["id"],
            "email": u["email"],
            "username": u["username"],
            "role": u["role"],
            "is_active": bool(u["is_active"]),
            "created_at": str(u["created_at"]),
            "last_login": str(u["last_login"]) if u["last_login"] else "Never"
        })
    return jsonify({"users": user_list})

@app.route("/api/admin/users/create", methods=["POST"])
@admin_required
def admin_create_user(current_admin):
    data = request.json or {}
    email = str(data.get("email", "")).strip().lower()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    role = data.get("role", "user")
    
    if not email or not username or not password:
        return jsonify({"error": "Email, username, and password required"}), 400
        
    conn = get_db_connection()
    existing = conn.execute('SELECT * FROM users WHERE email = ? OR username = ?', (email, username)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "User with this email or username already exists"}), 400
        
    pwd_hash = generate_password_hash(password)
    conn.execute('''
        INSERT INTO users (email, username, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, 1)
    ''', (email, username, pwd_hash, role))
    conn.commit()
    conn.close()
    
    log_audit(current_admin['id'], current_admin['username'], 'ADMIN_CREATE_USER', f"Admin created user {username} with role {role}", request.remote_addr)
    return jsonify({"message": f"User '{username}' created successfully"})

@app.route("/api/admin/users/toggle-status", methods=["POST"])
@admin_required
def admin_toggle_user_status(current_admin):
    data = request.json or {}
    user_id = data.get("user_id")
    if user_id == current_admin['id']:
        return jsonify({"error": "Cannot toggle your own status"}), 400
        
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
        
    new_status = 0 if user['is_active'] else 1
    conn.execute('UPDATE users SET is_active = ? WHERE id = ?', (new_status, user_id))
    conn.commit()
    conn.close()
    
    log_audit(current_admin['id'], current_admin['username'], 'ADMIN_TOGGLE_USER', f"Admin toggled active status for user ID {user_id} to {new_status}", request.remote_addr)
    return jsonify({"message": f"User status updated to {'Active' if new_status else 'Disabled'}"})

@app.route("/api/admin/users/role", methods=["POST"])
@admin_required
def admin_change_role(current_admin):
    data = request.json or {}
    user_id = data.get("user_id")
    new_role = data.get("role", "user")
    
    if user_id == current_admin['id']:
        return jsonify({"error": "Cannot change your own role"}), 400
        
    conn = get_db_connection()
    conn.execute('UPDATE users SET role = ? WHERE id = ?', (new_role, user_id))
    conn.commit()
    conn.close()
    
    log_audit(current_admin['id'], current_admin['username'], 'ADMIN_ROLE_CHANGE', f"Changed user {user_id} role to {new_role}", request.remote_addr)
    return jsonify({"message": f"Role updated to {new_role}"})

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def admin_delete_user(current_admin, user_id):
    if user_id == current_admin['id']:
        return jsonify({"error": "Cannot delete your own account"}), 400
        
    conn = get_db_connection()
    conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.execute('DELETE FROM user_datasets WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
    
    log_audit(current_admin['id'], current_admin['username'], 'ADMIN_DELETE_USER', f"Deleted user ID {user_id}", request.remote_addr)
    return jsonify({"message": "User deleted successfully"})

@app.route("/api/admin/audit-logs", methods=["GET"])
@admin_required
def admin_get_audit_logs(current_admin):
    conn = get_db_connection()
    logs = conn.execute('''
        SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50
    ''').fetchall()
    conn.close()
    
    log_list = []
    for l in logs:
        log_list.append({
            "id": l["id"],
            "username": l["username"] or "System",
            "action": l["action"],
            "details": l["details"],
            "ip_address": l["ip_address"],
            "timestamp": str(l["timestamp"])
        })
    return jsonify({"logs": log_list})

@app.route("/api/admin/system-stats", methods=["GET"])
@admin_required
def admin_system_stats(current_admin):
    conn = get_db_connection()
    total_users = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    active_users = conn.execute('SELECT COUNT(*) FROM users WHERE is_active = 1').fetchone()[0]
    total_logs = conn.execute('SELECT COUNT(*) FROM audit_logs').fetchone()[0]
    total_datasets = conn.execute('SELECT COUNT(*) FROM user_datasets').fetchone()[0]
    conn.close()
    
    db_info = get_db_info()
    
    return jsonify({
        "total_users": total_users,
        "active_users": active_users,
        "total_logs": total_logs,
        "total_datasets": total_datasets,
        "database_size_kb": db_info.get("size_kb", 64.0),
        "server_status": "Operational",
        "encryption": "SHA256 / JWT HS256",
        "database_engine": f"{db_info.get('engine')} ({db_info.get('host')})",
        "database_status": db_info.get("status", "Cloud Connected")
    })

# ----------------- BASE API ROUTES -----------------
@app.route("/")
def home():
    return {"status": "online", "message": "DataMind AI Intelligence Hub v3.0"}

@app.route("/api/health")
def health():
    return jsonify({
        "api": "healthy",
        "data_loaded": current_df is not None,
        "rows": len(current_df) if current_df is not None else 0,
        "columns": len(current_df.columns) if current_df is not None else 0,
        "libraries": ["pandas", "numpy", "scikit-learn", "scipy", "matplotlib", "seaborn", "pyjwt", "sqlite3"]
    })

@app.route("/api/sample-datasets", methods=["GET"])
def get_sample_datasets():
    datasets = []
    for key, data in SAMPLE_DATASETS.items():
        datasets.append({
            "id": key,
            "name": data["name"],
            "description": data["description"]
        })
    return jsonify({"datasets": datasets})

@app.route("/api/load-sample", methods=["POST"])
def load_sample_dataset():
    global current_df, history_stack
    dataset_id = request.json.get("dataset_id") if request.json else ""
    if dataset_id not in SAMPLE_DATASETS:
        return jsonify({"error": "Unknown sample dataset"}), 400
    
    try:
        gen_fn = SAMPLE_DATASETS[dataset_id]["generate"]
        df = gen_fn()
        current_df = df
        current_df.columns = [str(c).strip().replace(' ', '_') for c in current_df.columns]
        history_stack = []
        
        user = optional_token()
        log_audit(user['id'] if user else None, user['username'] if user else 'Anonymous', 'LOAD_SAMPLE', f"Loaded sample dataset {dataset_id}", request.remote_addr)
        
        return jsonify({
            "message": f"Loaded {SAMPLE_DATASETS[dataset_id]['name']}",
            "summary": get_data_summary(current_df)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/upload", methods=["POST"])
def upload_file():
    global current_df, history_stack
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files["file"]
    try:
        if file.filename.endswith(".csv"):
            current_df = pd.read_csv(file)
        elif file.filename.endswith((".xls", ".xlsx")):
            current_df = pd.read_excel(file)
        else:
            return jsonify({"error": "Unsupported format. Use CSV or Excel (.xlsx)."}), 400
        
        current_df.columns = [str(c).strip().replace(' ', '_') for c in current_df.columns]
        history_stack = []
        
        user = optional_token()
        user_id = user['id'] if user else 1
        username = user['username'] if user else 'Anonymous'
        
        # Save to database record
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO user_datasets (user_id, dataset_name, row_count, col_count)
            VALUES (?, ?, ?, ?)
        ''', (user_id, file.filename, len(current_df), len(current_df.columns)))
        conn.commit()
        conn.close()
        
        log_audit(user_id, username, 'UPLOAD_DATASET', f"Uploaded {file.filename} ({len(current_df)} rows)", request.remote_addr)
        
        return jsonify({
            "message": f"File '{file.filename}' uploaded securely ({len(current_df)} rows)",
            "summary": get_data_summary(current_df)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- DATA CLEANING & ENGINEERING -----------------
@app.route("/api/clean", methods=["POST"])
def clean_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        save_history()
        initial_rows = len(current_df)
        current_df = current_df.drop_duplicates()
        
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            if current_df[col].isnull().any():
                current_df[col] = current_df[col].fillna(current_df[col].median())
        
        cat_cols = current_df.select_dtypes(exclude=[np.number]).columns
        for col in cat_cols:
            if current_df[col].isnull().any():
                mode_val = current_df[col].mode()
                current_df[col] = current_df[col].fillna(mode_val[0] if not mode_val.empty else "Missing")
        
        removed = initial_rows - len(current_df)
        return jsonify({
            "message": f"Data cleaned: Removed {removed} duplicate(s) and imputed missing numerical/categorical values.",
            "details": {"removed_duplicates": removed},
            "summary": get_data_summary(current_df)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/feature-engineer", methods=["POST"])
def feature_engineer():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset loaded"}), 400
    
    data = request.json or {}
    action = data.get("action")
    col = resolve_col(data.get("column"), current_df)
    
    try:
        if not col or col not in current_df.columns:
            return jsonify({"error": f"Column '{col}' not found"}), 400
        
        save_history()
        new_col_name = data.get("new_column_name") or f"{col}_{action}"
        new_col_name = str(new_col_name).strip().replace(' ', '_')
        
        if action == "log_transform":
            val = pd.to_numeric(current_df[col], errors='coerce').fillna(0)
            min_val = val.min()
            offset = abs(min_val) + 1 if min_val <= 0 else 0
            current_df[new_col_name] = np.log1p(val + offset)
            msg = f"Applied Log1p transformation to '{col}' into '{new_col_name}'"
        
        elif action == "standard_scale":
            val = pd.to_numeric(current_df[col], errors='coerce').fillna(0).values.reshape(-1, 1)
            scaler = StandardScaler()
            current_df[new_col_name] = scaler.fit_transform(val).flatten().round(4)
            msg = f"Standard scaled (Z-Score) '{col}' into '{new_col_name}'"
            
        elif action == "minmax_scale":
            val = pd.to_numeric(current_df[col], errors='coerce').fillna(0).values.reshape(-1, 1)
            scaler = MinMaxScaler()
            current_df[new_col_name] = scaler.fit_transform(val).flatten().round(4)
            msg = f"Min-Max scaled [0, 1] '{col}' into '{new_col_name}'"
            
        elif action == "cap_outliers":
            val = pd.to_numeric(current_df[col], errors='coerce').fillna(0)
            q25 = val.quantile(0.25)
            q75 = val.quantile(0.75)
            iqr = q75 - q25
            lower = q25 - 1.5 * iqr
            upper = q75 + 1.5 * iqr
            current_df[new_col_name] = val.clip(lower=lower, upper=upper)
            msg = f"Winsorized/Capped outliers for '{col}' into '{new_col_name}' (Range: [{lower:.2f}, {upper:.2f}])"
            
        elif action == "binning":
            bins = int(data.get("bins", 4))
            val = pd.to_numeric(current_df[col], errors='coerce').fillna(0)
            current_df[new_col_name] = pd.qcut(val, q=bins, duplicates='drop').astype(str)
            msg = f"Discretized '{col}' into {bins} quantile bins in '{new_col_name}'"
            
        elif action == "extract_date":
            dt = pd.to_datetime(current_df[col], errors='coerce')
            current_df[f"{col}_year"] = dt.dt.year
            current_df[f"{col}_month"] = dt.dt.month
            current_df[f"{col}_day_name"] = dt.dt.day_name()
            current_df[f"{col}_is_weekend"] = dt.dt.dayofweek.isin([5, 6]).astype(int)
            msg = f"Extracted Year, Month, Day of Week, and Weekend indicator from '{col}'"
        else:
            return jsonify({"error": "Unknown feature engineering action"}), 400
        
        return jsonify({"message": msg, "summary": get_data_summary(current_df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- ADVANCED DEEP PROFILING & QUALITY -----------------
@app.route("/api/deep-profile", methods=["GET"])
def get_deep_profile():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        profiles = []
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        
        for col in current_df.columns:
            s = current_df[col]
            dtype_str = str(s.dtype)
            is_num = col in num_cols
            n_unique = int(s.nunique())
            n_null = int(s.isnull().sum())
            null_pct = round((n_null / max(len(current_df), 1)) * 100, 2)
            
            stat_obj = {
                "column": col,
                "dtype": dtype_str,
                "is_numeric": is_num,
                "unique_count": n_unique,
                "missing_count": n_null,
                "missing_pct": null_pct,
                "memory_kb": round(s.memory_usage(deep=True) / 1024, 2)
            }
            
            if is_num and s.dropna().shape[0] > 0:
                clean_s = pd.to_numeric(s, errors='coerce').dropna()
                stat_obj.update({
                    "mean": clean_val_for_json(clean_s.mean()),
                    "std": clean_val_for_json(clean_s.std()),
                    "min": clean_val_for_json(clean_s.min()),
                    "q25": clean_val_for_json(clean_s.quantile(0.25)),
                    "median": clean_val_for_json(clean_s.median()),
                    "q75": clean_val_for_json(clean_s.quantile(0.75)),
                    "max": clean_val_for_json(clean_s.max()),
                    "skewness": clean_val_for_json(float(stats.skew(clean_s)) if len(clean_s) > 2 else 0),
                    "kurtosis": clean_val_for_json(float(stats.kurtosis(clean_s)) if len(clean_s) > 3 else 0)
                })
            else:
                top_vals = s.astype(str).value_counts().head(3).to_dict()
                stat_obj["top_values"] = {str(k): int(v) for k, v in top_vals.items()}
            
            profiles.append(stat_obj)
        
        return jsonify({
            "total_rows": len(current_df),
            "total_columns": len(current_df.columns),
            "total_cells": int(current_df.size),
            "memory_usage_mb": round(current_df.memory_usage(deep=True).sum() / (1024 * 1024), 2),
            "profiles": profiles
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/quality", methods=["GET"])
def get_data_quality():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        total_cells = int(current_df.size)
        missing_cells = int(current_df.isnull().sum().sum())
        duplicates = int(current_df.duplicated().sum())
        
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        outliers_count = 0
        column_quality = []
        
        for col in current_df.columns:
            m = int(current_df[col].isnull().sum())
            c_outliers = 0
            if col in num_cols and current_df[col].std() > 0:
                s_num = pd.to_numeric(current_df[col], errors='coerce').dropna()
                if len(s_num) > 2 and s_num.std() > 0:
                    z = np.abs(stats.zscore(s_num))
                    c_outliers = int((z > 3).sum())
                    outliers_count += c_outliers
            
            column_quality.append({
                "column": col,
                "missing": m,
                "missing_pct": round((m / max(len(current_df), 1)) * 100, 1),
                "outliers": c_outliers,
                "type": "numeric" if col in num_cols else "categorical"
            })
            
        score = 100 - ((missing_cells / max(total_cells, 1) * 45) + (duplicates / max(len(current_df), 1) * 35) + (min(outliers_count, 20) * 1.0))
        score = round(max(0, min(100, score)), 1)
        
        recommendations = []
        if missing_cells > 0:
            recommendations.append(f"Impute {missing_cells} missing value(s) using median/mode cleaning.")
        if duplicates > 0:
            recommendations.append(f"Remove {duplicates} duplicate row(s) to avoid biased model training.")
        if outliers_count > 0:
            recommendations.append(f"Inspect {outliers_count} outlier data point(s) or apply Winsorization/Isolation Forest.")
        if not recommendations:
            recommendations.append("Dataset has high integrity with clean records and consistent data types.")
            
        return jsonify({
            "score": score,
            "missing": missing_cells,
            "duplicates": duplicates,
            "outliers": outliers_count,
            "health": "Excellent" if score >= 90 else "Good" if score >= 75 else "Fair" if score >= 55 else "Poor",
            "column_quality": column_quality,
            "recommendations": recommendations
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- ISOLATION FOREST ANOMALY RADAR -----------------
@app.route("/api/anomalies", methods=["POST"])
def detect_anomalies():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    contamination = float(request.json.get("contamination", 0.05)) if request.json else 0.05
    contamination = max(0.01, min(0.25, contamination))
    
    try:
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        if len(num_cols) < 2:
            return jsonify({"error": "Need at least 2 numeric columns for multi-dimensional anomaly detection."}), 400
        
        X = current_df[num_cols].apply(pd.to_numeric, errors='coerce').fillna(current_df[num_cols].median())
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        iso = IsolationForest(contamination=contamination, random_state=42)
        preds = iso.fit_predict(X_scaled)
        scores = iso.decision_function(X_scaled)
        
        pca = PCA(n_components=2)
        coords = pca.fit_transform(X_scaled)
        
        anomaly_indices = np.where(preds == -1)[0].tolist()
        
        points = []
        for i in range(len(current_df)):
            points.append({
                "index": i,
                "x": round(float(coords[i, 0]), 3),
                "y": round(float(coords[i, 1]), 3),
                "is_anomaly": bool(preds[i] == -1),
                "anomaly_score": round(float(-scores[i]), 4),
                "preview": {c: clean_val_for_json(current_df.iloc[i][c]) for c in num_cols[:4]}
            })
            
        anomalous_rows = []
        for idx in sorted(anomaly_indices, key=lambda i: -scores[i])[:15]:
            row_dict = {c: clean_val_for_json(current_df.iloc[idx][c]) for c in current_df.columns}
            row_dict["_row_index"] = idx
            row_dict["_severity"] = round(float(-scores[idx]), 3)
            anomalous_rows.append(row_dict)
            
        return jsonify({
            "total_samples": len(current_df),
            "anomaly_count": len(anomaly_indices),
            "contamination_pct": round(contamination * 100, 1),
            "variance_explained": [round(float(v), 3) for v in pca.explained_variance_ratio_],
            "points": points[:200],
            "top_anomalies": anomalous_rows
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/anomalies/remove", methods=["POST"])
def remove_anomalies():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    contamination = float(request.json.get("contamination", 0.05)) if request.json else 0.05
    try:
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        if len(num_cols) < 2:
            return jsonify({"error": "Need at least 2 numeric columns"}), 400
        
        save_history()
        X = current_df[num_cols].apply(pd.to_numeric, errors='coerce').fillna(current_df[num_cols].median())
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        iso = IsolationForest(contamination=contamination, random_state=42)
        preds = iso.fit_predict(X_scaled)
        
        initial = len(current_df)
        current_df = current_df[preds == 1].reset_index(drop=True)
        removed = initial - len(current_df)
        
        return jsonify({
            "message": f"Successfully purged {removed} anomalous records using Isolation Forest.",
            "summary": get_data_summary(current_df)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- TIME-SERIES & TREND FORECASTING -----------------
@app.route("/api/forecast", methods=["POST"])
def forecast_trend():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset loaded"}), 400
    
    data = request.json or {}
    metric_col = resolve_col(data.get("metric_col"), current_df, prefer_numeric=True)
    steps = int(data.get("steps", 10))
    time_col = resolve_col(data.get("time_col"), current_df)
    
    try:
        num_cols = current_df.select_dtypes(include=[np.number]).columns.tolist()
        if not metric_col or metric_col not in current_df.columns:
            if num_cols:
                metric_col = num_cols[0]
            else:
                return jsonify({"error": "No numeric column available for forecasting."}), 400
        
        y_series = pd.to_numeric(current_df[metric_col], errors='coerce').dropna()
        if len(y_series) < 3:
            return jsonify({"error": "Need at least 3 numeric data points for forecasting."}), 400
        
        y = y_series.values
        N = len(y)
        x = np.arange(N)
        
        degree = 2 if N >= 20 else 1
        poly_coeffs = np.polyfit(x, y, deg=degree)
        poly_fit = np.poly1d(poly_coeffs)
        
        residuals = y - poly_fit(x)
        std_err = float(np.std(residuals))
        
        future_x = np.arange(N, N + steps)
        future_y = poly_fit(future_x)
        
        window = max(2, min(5, N // 2))
        moving_avg = pd.Series(y).rolling(window=window, min_periods=1).mean().tolist()
        
        chart_data = []
        for i in range(N):
            label = str(current_df[time_col].iloc[i]) if time_col and time_col in current_df.columns else f"t-{i+1}"
            chart_data.append({
                "step": i + 1,
                "label": label,
                "actual": round(float(y[i]), 2),
                "trend": round(float(poly_fit(i)), 2),
                "moving_avg": round(float(moving_avg[i]), 2),
                "is_forecast": False
            })
            
        for idx, fx in enumerate(future_x):
            val = float(future_y[idx])
            chart_data.append({
                "step": N + idx + 1,
                "label": f"Forecast +{idx+1}",
                "actual": None,
                "forecast": round(val, 2),
                "upper_ci": round(val + 1.96 * std_err, 2),
                "lower_ci": round(val - 1.96 * std_err, 2),
                "trend": round(val, 2),
                "is_forecast": True
            })
            
        growth_rate = ((future_y[-1] - y[-1]) / max(abs(y[-1]), 0.001)) * 100
        
        return jsonify({
            "metric": metric_col,
            "steps": steps,
            "historical_mean": round(float(np.mean(y)), 2),
            "forecast_final": round(float(future_y[-1]), 2),
            "projected_growth_pct": round(float(growth_rate), 2),
            "confidence_band_width": round(float(1.96 * std_err), 2),
            "chart_data": chart_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- PARETO (80/20) & COHORT ANALYSIS -----------------
@app.route("/api/pareto", methods=["POST"])
def pareto_analysis():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json or {}
    dimension = resolve_col(data.get("dimension"), current_df, prefer_numeric=False)
    metric = resolve_col(data.get("metric"), current_df, prefer_numeric=True)
    
    try:
        cat_cols = current_df.select_dtypes(exclude=[np.number]).columns.tolist()
        num_cols = current_df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not dimension:
            dimension = cat_cols[0] if cat_cols else current_df.columns[0]
            
        if not metric or not pd.api.types.is_numeric_dtype(current_df[metric]):
            metric = num_cols[0] if num_cols else None
            
        if metric is None or metric == dimension:
            grouped = current_df[dimension].astype(str).value_counts().reset_index()
            grouped.columns = [dimension, "value"]
        else:
            temp_df = current_df.copy()
            temp_df["_metric_num"] = pd.to_numeric(temp_df[metric], errors='coerce').fillna(0)
            grouped = temp_df.groupby(temp_df[dimension].astype(str))["_metric_num"].sum().reset_index()
            grouped.columns = [dimension, "value"]
            
        grouped["value"] = pd.to_numeric(grouped["value"], errors='coerce').fillna(0)
        grouped = grouped.sort_values(by="value", ascending=False).reset_index(drop=True)
        total_val = float(grouped["value"].sum())
        
        if total_val <= 0:
            grouped["value"] = 1
            total_val = float(len(grouped))
            
        grouped["cumulative_pct"] = (grouped["value"].cumsum() / total_val) * 100
        
        top_80_items = grouped[grouped["cumulative_pct"] <= 85]
        vital_few_count = max(1, len(top_80_items))
        vital_few_pct = round((vital_few_count / max(len(grouped), 1)) * 100, 1)
        
        pareto_records = []
        for i, row in grouped.head(20).iterrows():
            pareto_records.append({
                "dimension": str(row[dimension]),
                "value": round(float(row["value"]), 2),
                "cumulative_pct": round(float(row["cumulative_pct"]), 1),
                "is_vital_few": bool(row["cumulative_pct"] <= 80)
            })
            
        return jsonify({
            "dimension": dimension,
            "metric": metric or "Count",
            "total_categories": len(grouped),
            "vital_few_count": vital_few_count,
            "vital_few_pct": vital_few_pct,
            "pareto_summary": f"Top {vital_few_count} {dimension}s ({vital_few_pct}% of total) generate over 80% of overall {metric or 'volume'}.",
            "items": pareto_records
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- STATISTICAL HYPOTHESIS TESTING -----------------
@app.route("/api/hypothesis-test", methods=["POST"])
def hypothesis_test():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json or {}
    test_type = data.get("test_type", "ttest")
    col1 = resolve_col(data.get("col1"), current_df)
    col2 = resolve_col(data.get("col2"), current_df)
    
    try:
        if not col1 or not col2 or col1 not in current_df.columns or col2 not in current_df.columns:
            return jsonify({"error": "Selected columns not found in dataset"}), 400
        
        if test_type == "ttest":
            num_s = pd.to_numeric(current_df[col1], errors='coerce')
            cat_s = current_df[col2].astype(str)
            groups = cat_s.unique()
            if len(groups) < 2:
                return jsonify({"error": f"Column '{col2}' must have at least 2 distinct groups for T-Test."}), 400
            
            g1_data = num_s[cat_s == groups[0]].dropna()
            g2_data = num_s[cat_s == groups[1]].dropna()
            
            if len(g1_data) < 2 or len(g2_data) < 2:
                return jsonify({"error": "Groups have too few samples for valid T-Test."}), 400
                
            t_stat, p_val = stats.ttest_ind(g1_data, g2_data, equal_var=False)
            significant = bool(p_val < 0.05)
            
            return jsonify({
                "test": "Welch's Two-Sample T-Test",
                "col1": col1,
                "col2": col2,
                "group1": {"name": str(groups[0]), "mean": round(float(g1_data.mean()), 2), "n": len(g1_data)},
                "group2": {"name": str(groups[1]), "mean": round(float(g2_data.mean()), 2), "n": len(g2_data)},
                "statistic": round(float(t_stat), 4),
                "p_value": float(f"{p_val:.4e}"),
                "is_significant": significant,
                "conclusion": f"The difference in {col1} between {groups[0]} and {groups[1]} is statistically {'SIGNIFICANT (p < 0.05)' if significant else 'NOT significant (p >= 0.05)'}."
            })
            
        elif test_type == "anova":
            num_s = pd.to_numeric(current_df[col1], errors='coerce')
            cat_s = current_df[col2].astype(str)
            group_lists = [num_s[cat_s == g].dropna() for g in cat_s.unique() if len(num_s[cat_s == g].dropna()) > 2]
            
            if len(group_lists) < 2:
                return jsonify({"error": "Need at least 2 groups with >2 samples for ANOVA."}), 400
                
            f_stat, p_val = stats.f_oneway(*group_lists)
            significant = bool(p_val < 0.05)
            
            return jsonify({
                "test": "One-Way ANOVA (F-Test)",
                "col1": col1,
                "col2": col2,
                "statistic": round(float(f_stat), 4),
                "p_value": float(f"{p_val:.4e}"),
                "is_significant": significant,
                "conclusion": f"Variation in '{col1}' across groups of '{col2}' is {'statistically significant (p < 0.05)' if significant else 'not significant'}."
            })
            
        elif test_type == "chi2":
            crosstab = pd.crosstab(current_df[col1], current_df[col2])
            chi2, p_val, dof, _ = stats.chi2_contingency(crosstab)
            significant = bool(p_val < 0.05)
            
            return jsonify({
                "test": "Pearson's Chi-Square Test of Independence",
                "col1": col1,
                "col2": col2,
                "statistic": round(float(chi2), 4),
                "degrees_of_freedom": int(dof),
                "p_value": float(f"{p_val:.4e}"),
                "is_significant": significant,
                "conclusion": f"Association between '{col1}' and '{col2}' is {'statistically SIGNIFICANT (Dependent)' if significant else 'NOT significant (Independent)'}."
            })
            
        elif test_type == "correlation":
            s1 = pd.to_numeric(current_df[col1], errors='coerce')
            s2 = pd.to_numeric(current_df[col2], errors='coerce')
            valid = (~s1.isnull()) & (~s2.isnull())
            s1, s2 = s1[valid], s2[valid]
            
            if len(s1) < 4:
                return jsonify({"error": "Need at least 4 paired observations for correlation test."}), 400
                
            r_val, p_val = stats.pearsonr(s1, s2)
            sr_val, sp_val = stats.spearmanr(s1, s2)
            
            return jsonify({
                "test": "Pearson & Spearman Correlation Significance",
                "col1": col1,
                "col2": col2,
                "pearson_r": round(float(r_val), 4),
                "pearson_p": float(f"{p_val:.4e}"),
                "spearman_rho": round(float(sr_val), 4),
                "spearman_p": float(f"{sp_val:.4e}"),
                "is_significant": bool(p_val < 0.05),
                "conclusion": f"Linear correlation between '{col1}' and '{col2}' is r={r_val:.3f} ({'Significant' if p_val < 0.05 else 'Not significant'})."
            })
        else:
            return jsonify({"error": "Unknown hypothesis test type"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- PREDICTIVE AI & WHAT-IF SIMULATOR -----------------
@app.route("/api/predict", methods=["POST"])
def predict():
    global current_df, trained_models
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json or {}
    target = resolve_col(data.get("target"), current_df)
    features = data.get("features", [])
    model_family = data.get("algorithm", "random_forest")
    
    if not target or target not in current_df.columns:
        return jsonify({"error": f"Target '{target}' not found"}), 400
        
    if not features:
        features = [c for c in current_df.columns if c != target]
    features = [f for f in features if f in current_df.columns and f != target]
    
    if not features:
        return jsonify({"error": "No valid input features selected"}), 400
        
    try:
        df_ml = current_df.dropna(subset=[target]).copy()
        if len(df_ml) < 8:
            return jsonify({"error": "Need at least 8 samples for model training."}), 400
            
        y = df_ml[target]
        is_regression = pd.api.types.is_numeric_dtype(y)
        
        if is_regression:
            y = pd.to_numeric(y, errors='coerce').fillna(y.median())
            le = None
        else:
            y = y.fillna(y.mode()[0] if not y.mode().empty else "Unknown")
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y.astype(str)))
            
        X_raw = df_ml[features].copy()
        for col in X_raw.select_dtypes(include=[np.number]).columns:
            X_raw[col] = pd.to_numeric(X_raw[col], errors='coerce').fillna(X_raw[col].median())
        for col in X_raw.select_dtypes(exclude=[np.number]).columns:
            X_raw[col] = X_raw[col].fillna(X_raw[col].mode()[0] if not X_raw[col].mode().empty else "None")
            
        X = pd.get_dummies(X_raw, drop_first=True)
        feature_names = X.columns.tolist()
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        test_sz = 0.2 if len(y) >= 20 else 0.25
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=test_sz, random_state=42)
        
        if is_regression:
            if model_family == "gradient_boosting":
                model = GradientBoostingRegressor(n_estimators=120, random_state=42)
            elif model_family == "linear":
                model = Ridge(alpha=1.0)
            else:
                model = RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
                
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            r2 = r2_score(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            
            cv_k = min(5, len(y_train))
            cv_scores = cross_val_score(model, X_scaled, y, cv=max(2, cv_k), scoring='r2') if len(y) >= 6 else [r2]
        else:
            if model_family == "gradient_boosting":
                model = GradientBoostingClassifier(n_estimators=120, random_state=42)
            elif model_family == "logistic":
                model = LogisticRegression(max_iter=1000)
            else:
                model = RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
                
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            acc = accuracy_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            cv_k = min(5, len(np.unique(y)))
            cv_scores = cross_val_score(model, X_scaled, y, cv=max(2, cv_k)) if len(np.unique(y)) >= 2 else [acc]
            
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
        elif hasattr(model, 'coef_'):
            importances = np.abs(model.coef_).flatten() if model.coef_.ndim > 1 else np.abs(model.coef_)
        else:
            importances = np.ones(len(feature_names)) / len(feature_names)
            
        top_idx = np.argsort(importances)[::-1][:10]
        top_features = [{
            "name": feature_names[i],
            "importance": round(float(importances[i]) / (sum(importances) if sum(importances) > 0 else 1), 4)
        } for i in top_idx]
        
        trained_models[target] = {
            "model": model,
            "scaler": scaler,
            "feature_names": feature_names,
            "raw_features": features,
            "is_regression": is_regression,
            "label_encoder": le,
            "dummy_columns": X.columns.tolist(),
            "dummy_template": X.iloc[0:1].copy()
        }
        
        simulator_inputs = []
        for feat in features[:8]:
            s = df_ml[feat]
            if pd.api.types.is_numeric_dtype(s):
                s_num = pd.to_numeric(s, errors='coerce').dropna()
                simulator_inputs.append({
                    "name": feat,
                    "type": "numeric",
                    "min": clean_val_for_json(s_num.min()),
                    "max": clean_val_for_json(s_num.max()),
                    "default": clean_val_for_json(s_num.median()),
                    "step": clean_val_for_json((s_num.max() - s_num.min()) / 100 if s_num.max() != s_num.min() else 1)
                })
            else:
                simulator_inputs.append({
                    "name": feat,
                    "type": "categorical",
                    "options": [str(x) for x in s.unique()[:10]],
                    "default": str(s.mode()[0] if not s.mode().empty else s.iloc[0])
                })
        
        result_payload = {
            "target": target,
            "algorithm": model_family,
            "type": "regression" if is_regression else "classification",
            "samples_trained": len(X_train),
            "samples_tested": len(X_test),
            "cv_avg": round(float(np.mean(cv_scores)), 4),
            "cv_std": round(float(np.std(cv_scores)), 4),
            "top_features": top_features,
            "simulator_inputs": simulator_inputs
        }
        
        if is_regression:
            result_payload.update({
                "accuracy": round(float(max(0, r2)), 4),
                "r2_score": round(float(r2), 4),
                "mae": round(float(mae), 4),
                "rmse": round(float(rmse), 4),
            })
        else:
            result_payload.update({
                "accuracy": round(float(acc), 4),
                "f1_score": round(float(f1), 4),
                "classes": [str(c) for c in le.classes_] if le else []
            })
            
        return jsonify(result_payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/simulate", methods=["POST"])
def simulate_scenario():
    global trained_models
    data = request.json or {}
    target = resolve_col(data.get("target"), current_df)
    inputs = data.get("inputs", {})
    
    if target not in trained_models:
        return jsonify({"error": "No trained model found for this target. Train the model first."}), 400
        
    model_obj = trained_models[target]
    model = model_obj["model"]
    scaler = model_obj["scaler"]
    dummy_template = model_obj["dummy_template"].copy()
    
    try:
        input_df = pd.DataFrame([inputs])
        encoded_df = pd.get_dummies(input_df)
        
        row = dummy_template.copy()
        for col in row.columns:
            if col in encoded_df.columns:
                row[col] = encoded_df[col].iloc[0]
            elif col in inputs:
                try:
                    row[col] = float(inputs[col])
                except:
                    row[col] = 0
            else:
                row[col] = 0
                
        scaled_row = scaler.transform(row)
        pred = model.predict(scaled_row)[0]
        
        if model_obj["is_regression"]:
            return jsonify({
                "target": target,
                "prediction": round(float(pred), 3),
                "formatted": f"{pred:,.2f}"
            })
        else:
            le = model_obj["label_encoder"]
            pred_class = le.inverse_transform([int(pred)])[0] if le else str(pred)
            probs = {}
            if hasattr(model, "predict_proba"):
                prob_vals = model.predict_proba(scaled_row)[0]
                classes = le.classes_ if le else range(len(prob_vals))
                probs = {str(c): round(float(p) * 100, 1) for c, p in zip(classes, prob_vals)}
            return jsonify({
                "target": target,
                "prediction": str(pred_class),
                "probabilities": probs
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/compare", methods=["POST"])
def compare_models():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json or {}
    target = resolve_col(data.get("target"), current_df)
    if not target or target not in current_df.columns:
        return jsonify({"error": "Valid target column required"}), 400
        
    features = [c for c in current_df.columns if c != target]
    
    try:
        df_ml = current_df.dropna(subset=[target]).copy()
        y = df_ml[target]
        X = pd.get_dummies(df_ml[features], drop_first=True).fillna(0)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        is_reg = pd.api.types.is_numeric_dtype(y)
        if is_reg:
            y = pd.to_numeric(y, errors='coerce').fillna(y.median())
        else:
            y = y.fillna(y.mode()[0])
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y.astype(str)))
            
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        results = []
        if is_reg:
            models = {
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
                "Ridge Regression": Ridge(alpha=1.0),
                "Decision Tree": DecisionTreeRegressor(max_depth=8, random_state=42)
            }
            for name, m in models.items():
                m.fit(X_train, y_train)
                y_pred = m.predict(X_test)
                r2 = r2_score(y_test, y_pred)
                mae = mean_absolute_error(y_test, y_pred)
                results.append({
                    "name": name,
                    "score": round(float(max(0, r2)), 4),
                    "metric_label": "R² Score",
                    "mae": round(float(mae), 2)
                })
        else:
            models = {
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=1000),
                "Decision Tree": DecisionTreeClassifier(max_depth=8, random_state=42)
            }
            for name, m in models.items():
                m.fit(X_train, y_train)
                y_pred = m.predict(X_test)
                acc = accuracy_score(y_test, y_pred)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
                results.append({
                    "name": name,
                    "score": round(float(acc), 4),
                    "metric_label": "Accuracy",
                    "f1": round(float(f1), 4)
                })
                
        return jsonify({"results": sorted(results, key=lambda x: x['score'], reverse=True)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- CORRELATION MATRIX -----------------
@app.route("/api/correlation", methods=["GET"])
def get_correlation():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        num_df = current_df.select_dtypes(include=[np.number])
        if num_df.empty or len(num_df.columns) < 2:
            return jsonify({"error": "Need at least 2 numeric columns for correlation"}), 400
            
        corr = num_df.corr().round(3)
        columns = corr.columns.tolist()
        
        matrix = []
        for row_col in columns:
            row_vals = {"column": row_col}
            for col_col in columns:
                val = corr.loc[row_col, col_col]
                row_vals[col_col] = clean_val_for_json(val)
            matrix.append(row_vals)
            
        top_positive = []
        top_negative = []
        for i in range(len(columns)):
            for j in range(i+1, len(columns)):
                c1, c2 = columns[i], columns[j]
                val = float(corr.iloc[i, j])
                if np.isnan(val): continue
                if val > 0.4:
                    top_positive.append({"col1": c1, "col2": c2, "r": round(val, 3)})
                elif val < -0.4:
                    top_negative.append({"col1": c1, "col2": c2, "r": round(val, 3)})
                    
        top_positive.sort(key=lambda x: -x["r"])
        top_negative.sort(key=lambda x: x["r"])
        
        return jsonify({
            "columns": columns,
            "matrix": matrix,
            "top_positive": top_positive[:5],
            "top_negative": top_negative[:5]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- NATURAL LANGUAGE AI COPILOT -----------------
@app.route("/api/query", methods=["POST"])
def query_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset loaded"}), 400
    
    query = request.json.get("query", "").lower().strip() if request.json else ""
    try:
        def find_col(q, dtype_filter=None):
            cols = current_df.columns
            if dtype_filter == 'numeric':
                cols = current_df.select_dtypes(include=[np.number]).columns
            elif dtype_filter == 'categorical':
                cols = current_df.select_dtypes(exclude=[np.number]).columns
            for c in cols:
                if c.lower() in q.split():
                    return c
            for c in sorted(cols, key=lambda x: len(x), reverse=True):
                if c.lower() in q:
                    return c
            return cols[0] if len(cols) > 0 else None

        stat_map = {
            "average": "mean", "mean": "mean", "sum": "sum", "total": "sum",
            "minimum": "min", "min": "min", "lowest": "min",
            "maximum": "max", "max": "max", "highest": "max",
            "median": "median", "std": "std", "variance": "var"
        }
        for kw, fn in stat_map.items():
            if kw in query:
                col = find_col(query, 'numeric')
                if col:
                    val = getattr(pd.to_numeric(current_df[col], errors='coerce').dropna(), fn)()
                    return jsonify({
                        "answer": f"The calculated **{fn.upper()}** for `{col}` is **{val:,.2f}**.",
                        "type": "text",
                        "metric": {"column": col, "stat": fn, "value": round(float(val), 2)}
                    })

        if any(w in query for w in ["outlier", "anomal", "irregular"]):
            num_cols = current_df.select_dtypes(include=[np.number]).columns
            outliers_found = {}
            for c in num_cols:
                s = pd.to_numeric(current_df[c], errors='coerce').dropna()
                if len(s) > 2 and s.std() > 0:
                    z = np.abs(stats.zscore(s))
                    cnt = int((z > 3).sum())
                    if cnt > 0: outliers_found[c] = cnt
            if outliers_found:
                ans = "Detected statistical anomalies (>3 std dev):\n" + "\n".join([f"- **{k}**: {v} outlier(s)" for k,v in outliers_found.items()])
            else:
                ans = "No severe statistical outliers (>3 std dev) detected in numeric columns."
            return jsonify({"answer": ans, "type": "text"})

        desc = current_df.describe().round(2).to_dict()
        return jsonify({
            "answer": f"Dataset contains **{len(current_df)} rows** and **{len(current_df.columns)} columns**. Explore the interactive Visual Studio, Deep Profiler, and AI Simulator tabs.",
            "data": desc,
            "type": "table"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------- TRANSFORMS & CRUD -----------------
@app.route("/api/transform", methods=["POST"])
def transform_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json or {}
    action = data.get("action")
    try:
        save_history()
        if action == "rename":
            old_name = resolve_col(data.get("old_name"), current_df)
            new_name = str(data.get("new_name", "")).strip().replace(' ', '_')
            if not new_name: return jsonify({"error": "New name cannot be empty"}), 400
            current_df = current_df.rename(columns={old_name: new_name})
            return jsonify({"message": f"Renamed '{old_name}' → '{new_name}'", "summary": get_data_summary(current_df)})
            
        elif action == "filter":
            col = resolve_col(data.get("column"), current_df)
            op = data.get("op")
            val_raw = data.get("value")
            if not col or col not in current_df.columns: return jsonify({"error": "Column not found"}), 400
            
            is_num = pd.api.types.is_numeric_dtype(current_df[col])
            if is_num:
                v = float(val_raw)
                if op == ">": current_df = current_df[current_df[col] > v]
                elif op == "<": current_df = current_df[current_df[col] < v]
                elif op == ">=": current_df = current_df[current_df[col] >= v]
                elif op == "<=": current_df = current_df[current_df[col] <= v]
                elif op == "==": current_df = current_df[current_df[col] == v]
                elif op == "!=": current_df = current_df[current_df[col] != v]
            else:
                v = str(val_raw)
                if op == "==": current_df = current_df[current_df[col].astype(str) == v]
                elif op == "!=": current_df = current_df[current_df[col].astype(str) != v]
                elif op == "contains": current_df = current_df[current_df[col].astype(str).str.contains(v, case=False, na=False)]
                
            current_df = current_df.reset_index(drop=True)
            return jsonify({"message": f"Filtered data: {len(current_df)} rows remaining", "summary": get_data_summary(current_df)})
            
        return jsonify({"error": "Invalid action"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/crud", methods=["POST"])
def crud_ops():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset loaded"}), 400
    
    data = request.json or {}
    action = data.get("action")
    try:
        save_history()
        if action == "delete_row":
            idx = int(data.get("index"))
            current_df = current_df.drop(index=idx).reset_index(drop=True)
            msg = f"Deleted row index {idx}"
        elif action == "update_cell":
            idx = int(data.get("index"))
            col = resolve_col(data.get("column"), current_df)
            val = data.get("value")
            current_df.at[idx, col] = val
            msg = f"Updated cell [{idx}, '{col}']"
        elif action == "delete_column":
            col = resolve_col(data.get("column"), current_df)
            current_df = current_df.drop(columns=[col])
            msg = f"Deleted column '{col}'"
        else:
            return jsonify({"error": "Invalid CRUD operation"}), 400
            
        return jsonify({"message": msg, "summary": get_data_summary(current_df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/undo", methods=["POST"])
def undo():
    global current_df, history_stack
    if not history_stack: return jsonify({"error": "No changes to undo"}), 400
    current_df = history_stack.pop()
    return jsonify({"message": "Undo successful", "summary": get_data_summary(current_df)})

@app.route("/api/summary", methods=["GET"])
def get_executive_summary():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset"}), 400
    
    num_cols = current_df.select_dtypes(include=[np.number]).columns
    cat_cols = current_df.select_dtypes(exclude=[np.number]).columns
    missing = int(current_df.isnull().sum().sum())
    
    summary = f"Dataset Overview: {len(current_df)} rows and {len(current_df.columns)} columns. "
    if len(num_cols) > 0:
        summary += f"Numerical features: {', '.join(num_cols[:4])}. "
    if len(cat_cols) > 0:
        summary += f"Categorical dimensions: {', '.join(cat_cols[:3])}. "
    summary += "Status: " + ("100% Complete & Clean." if missing == 0 else f"{missing} missing values detected.")
    return jsonify({"summary": summary})

# ----------------- REPORTS & EXPORTS -----------------
@app.route("/api/report/pdf", methods=["GET"])
def download_pdf():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 18)
        pdf.cell(190, 12, "DataMind AI Intelligence & Analytics Report", ln=True, align='C')
        pdf.ln(5)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 8, "1. Executive Summary", ln=True)
        pdf.set_font("Arial", '', 10)
        pdf.cell(190, 6, f"Dataset Dimensions: {len(current_df)} records x {len(current_df.columns)} columns", ln=True)
        pdf.cell(190, 6, f"Data Quality Score: {100 - min(50, int(current_df.isnull().sum().sum()))}%", ln=True)
        pdf.ln(4)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 8, "2. Key Column Statistics", ln=True)
        pdf.set_font("Arial", '', 9)
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        for c in num_cols[:6]:
            s = pd.to_numeric(current_df[c], errors='coerce').dropna()
            pdf.cell(190, 5, f"- {c}: Mean = {s.mean():.2f}, Std = {s.std():.2f}, Median = {s.median():.2f}, Min = {s.min():.2f}, Max = {s.max():.2f}", ln=True)
        pdf.ln(4)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 8, "3. Outliers & Anomaly Inspection", ln=True)
        pdf.set_font("Arial", '', 9)
        pdf.cell(190, 5, f"Duplicates: {current_df.duplicated().sum()} row(s)", ln=True)
        pdf.cell(190, 5, f"Total Missing Data Cells: {current_df.isnull().sum().sum()}", ln=True)
        
        output = io.BytesIO()
        pdf_raw = pdf.output()
        pdf_bytes = pdf_raw if isinstance(pdf_raw, (bytes, bytearray)) else pdf_raw.encode('latin-1')
        output.write(bytes(pdf_bytes))
        output.seek(0)
        return send_file(output, mimetype="application/pdf", as_attachment=True, download_name="DataMind_Executive_Report.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/export/excel", methods=["GET"])
def export_excel():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    try:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            current_df.to_excel(writer, index=False, sheet_name='Cleaned_Data')
            current_df.describe().to_excel(writer, sheet_name='Statistical_Summary')
        output.seek(0)
        return send_file(output, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name="DataMind_Export.xlsx")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/report", methods=["GET"])
def export_csv():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    output = io.BytesIO()
    current_df.to_csv(output, index=False)
    output.seek(0)
    return send_file(output, mimetype="text/csv", as_attachment=True, download_name="DataMind_Dataset.csv")

@app.route("/api/reset", methods=["POST"])
def reset():
    global current_df, history_stack, trained_models
    current_df = None
    history_stack = []
    trained_models = {}
    return jsonify({"message": "Session reset successfully"})

if __name__ == "__main__":
    app.run(debug=True, port=5000, host='0.0.0.0')