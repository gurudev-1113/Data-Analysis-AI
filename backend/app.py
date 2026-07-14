import os
import tempfile
os.environ['MPLCONFIGDIR'] = os.path.join(tempfile.gettempdir(), 'matplotlib')

import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, accuracy_score, f1_score
from fpdf import FPDF
import io
import base64
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt

app = Flask(__name__)
CORS(app)
plt.switch_backend('Agg')

current_df = None
history_stack = []   # For undo functionality
MAX_HISTORY = 20

def save_history():
    global current_df, history_stack
    if current_df is not None:
        history_stack.append(current_df.copy())
        if len(history_stack) > MAX_HISTORY:
            history_stack.pop(0)

def get_data_summary(df):
    return {
        "columns": df.columns.tolist(),
        "rows": len(df),
        "missing_values": df.isnull().sum().to_dict(),
        "data_types": df.dtypes.astype(str).to_dict(),
        "head": df.head(10).reset_index().to_dict(orient="records")
    }

@app.route("/")
def home():
    return {"status": "online", "message": "DataMind AI API v2"}

@app.route("/api/health")
def health():
    status = {
        "api": "healthy",
        "data_loaded": current_df is not None,
        "libraries": ["pandas", "sklearn", "matplotlib"]
    }
    return jsonify(status)

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
            return jsonify({"error": "Unsupported file format. Use CSV or Excel."}), 400
        
        current_df.columns = [c.strip() for c in current_df.columns]
        history_stack = []  # Reset history on new upload
        return jsonify({"message": "File uploaded successfully", "summary": get_data_summary(current_df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/clean", methods=["POST"])
def clean_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        save_history()
        initial_rows = len(current_df)
        current_df = current_df.drop_duplicates()
        
        numeric_cols = current_df.select_dtypes(include=[np.number]).columns
        if not numeric_cols.empty:
            current_df[numeric_cols] = current_df[numeric_cols].fillna(current_df[numeric_cols].median())
        
        categorical_cols = current_df.select_dtypes(exclude=[np.number]).columns
        for col in categorical_cols:
            if not current_df[col].mode().empty:
                current_df[col] = current_df[col].fillna(current_df[col].mode()[0])
        
        current_df.columns = [c.replace(' ', '_').replace('.', '').strip() for c in current_df.columns]
        removed = initial_rows - len(current_df)
        return jsonify({
            "message": f"Data cleaned! Removed {removed} duplicate row(s) and filled missing values.",
            "details": {"removed_duplicates": removed},
            "summary": get_data_summary(current_df)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/query", methods=["POST"])
def query_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    query = request.json.get("query", "").lower().strip()
    try:
        def find_col(q, dtype_filter=None):
            """Smart column finder: match column names in query."""
            cols = current_df.columns
            if dtype_filter == 'numeric':
                cols = current_df.select_dtypes(include=[np.number]).columns
            elif dtype_filter == 'categorical':
                cols = current_df.select_dtypes(exclude=[np.number]).columns
            # Exact word match first
            for c in cols:
                if c.lower() in q.split():
                    return c
            # Substring match
            for c in sorted(cols, key=lambda x: len(x), reverse=True):
                if c.lower() in q:
                    return c
            return cols[0] if len(cols) > 0 else None

        # --- Statistical queries ---
        stat_map = {
            "average": "mean", "mean": "mean", "sum": "sum", "total": "sum",
            "minimum": "min", "min": "min", "lowest": "min",
            "maximum": "max", "max": "max", "highest": "max",
            "median": "median", "count": "count", "std": "std",
            "standard deviation": "std", "variance": "var",
        }
        for keyword, func in stat_map.items():
            if keyword in query:
                col = find_col(query, 'numeric')
                if col:
                    val = getattr(current_df[col], func)()
                    return jsonify({"answer": f"The {func} of {col} is {val:,.2f}", "type": "text"})

        # --- Unique / value counts ---
        if any(w in query for w in ["unique", "distinct", "categories"]):
            col = find_col(query)
            if col:
                uniq = current_df[col].nunique()
                top = current_df[col].value_counts().head(5).to_dict()
                return jsonify({"answer": f"{col} has {uniq} unique values. Top: {top}", "type": "text"})

        # --- Correlation between two columns ---
        if "correlation" in query or "correlate" in query:
            num_cols = current_df.select_dtypes(include=[np.number]).columns
            if len(num_cols) >= 2:
                corr = current_df[num_cols].corr()
                pairs = []
                for i in range(len(num_cols)):
                    for j in range(i+1, len(num_cols)):
                        pairs.append((num_cols[i], num_cols[j], corr.iloc[i,j]))
                pairs.sort(key=lambda x: abs(x[2]), reverse=True)
                txt = "Top correlations:\n" + "\n".join([f"  {a} & {b}: {v:.3f}" for a,b,v in pairs[:5]])
                return jsonify({"answer": txt, "type": "text"})

        # --- Chart/Plot generation ---
        if any(x in query for x in ["chart", "plot", "graph", "visuali", "draw", "show"]):
            fig, ax = plt.subplots(figsize=(10, 6))
            fig.patch.set_facecolor('#fafafa')
            ax.set_facecolor('#fafafa')
            num_cols = current_df.select_dtypes(include=[np.number]).columns
            cat_cols = current_df.select_dtypes(exclude=[np.number]).columns
            colors = ['#6366f1','#a855f7','#ec4899','#10b981','#f59e0b','#3b82f6']
            plot_type = "histogram"
            
            if any(w in query for w in ["bar", "bar chart"]):
                plot_type = "bar"
            elif any(w in query for w in ["line", "trend"]):
                plot_type = "line"
            elif any(w in query for w in ["scatter", "compare", "vs"]):
                plot_type = "scatter"
            elif "pie" in query:
                plot_type = "pie"
            elif "box" in query:
                plot_type = "box"
            elif "heatmap" in query or "heat" in query:
                plot_type = "heatmap"

            if plot_type == "scatter" and len(num_cols) >= 2:
                c1 = find_col(query, 'numeric') or num_cols[0]
                c2 = num_cols[1] if c1 == num_cols[0] else num_cols[0]
                ax.scatter(current_df[c1], current_df[c2], c=colors[0], alpha=0.7, edgecolors='white', s=80)
                ax.set_xlabel(c1, fontsize=12)
                ax.set_ylabel(c2, fontsize=12)
                ax.set_title(f"Scatter: {c1} vs {c2}", fontsize=14, fontweight='bold')
            elif plot_type == "line":
                col = find_col(query, 'numeric') or (num_cols[0] if len(num_cols) > 0 else None)
                if col:
                    ax.plot(current_df[col].values, marker='o', color=colors[0], linewidth=2.5, markersize=6)
                    ax.fill_between(range(len(current_df)), current_df[col].values, alpha=0.1, color=colors[0])
                    ax.set_title(f"Trend: {col}", fontsize=14, fontweight='bold')
                    ax.set_ylabel(col, fontsize=12)
            elif plot_type == "pie":
                col = find_col(query, 'categorical') or (cat_cols[0] if len(cat_cols) > 0 else None)
                if col:
                    counts = current_df[col].value_counts().head(6)
                    ax.pie(counts, labels=counts.index, autopct='%1.1f%%', colors=colors[:len(counts)], startangle=90, textprops={'fontsize': 11})
                    ax.set_title(f"Distribution: {col}", fontsize=14, fontweight='bold')
            elif plot_type == "box":
                col = find_col(query, 'numeric') or (num_cols[0] if len(num_cols) > 0 else None)
                if col:
                    bp = ax.boxplot(current_df[col].dropna(), patch_artist=True, widths=0.5)
                    bp['boxes'][0].set_facecolor(colors[0])
                    bp['boxes'][0].set_alpha(0.7)
                    ax.set_title(f"Box Plot: {col}", fontsize=14, fontweight='bold')
                    ax.set_ylabel(col, fontsize=12)
            elif plot_type == "bar":
                col = find_col(query, 'numeric') or (num_cols[0] if len(num_cols) > 0 else None)
                x_col = cat_cols[0] if len(cat_cols) > 0 else None
                if col and x_col:
                    grouped = current_df.groupby(x_col)[col].mean().head(10)
                    bars = ax.bar(grouped.index, grouped.values, color=colors[0], edgecolor='white', width=0.6)
                    ax.set_title(f"Average {col} by {x_col}", fontsize=14, fontweight='bold')
                    ax.set_xlabel(x_col, fontsize=12)
                    ax.set_ylabel(f"Avg {col}", fontsize=12)
                    plt.xticks(rotation=45, ha='right')
                elif col:
                    ax.bar(range(len(current_df[col])), current_df[col].values, color=colors[0], edgecolor='white')
                    ax.set_title(f"Bar Chart: {col}", fontsize=14, fontweight='bold')
            else:
                col = find_col(query, 'numeric') or (num_cols[0] if len(num_cols) > 0 else None)
                if col:
                    ax.hist(current_df[col].dropna(), bins=min(20, current_df[col].nunique()), color=colors[0], edgecolor='white', alpha=0.85)
                    ax.axvline(current_df[col].mean(), color='#ef4444', linestyle='--', linewidth=2, label=f'Mean: {current_df[col].mean():.1f}')
                    ax.legend(fontsize=11)
                    ax.set_title(f"Distribution: {col}", fontsize=14, fontweight='bold')
                    ax.set_xlabel(col, fontsize=12)
                    ax.set_ylabel("Frequency", fontsize=12)
                else:
                    plt.close()
                    return jsonify({"answer": "No numeric data available for plotting.", "type": "text"})

            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            return jsonify({"answer": f"Generated {plot_type} chart.", "image": img_base64, "type": "image"})

        # --- Summarize data ---
        if any(w in query for w in ["summarize", "summary", "describe", "overview", "stats", "statistic"]):
            desc = current_df.describe(include='all').fillna('').to_dict()
            num_cols = current_df.select_dtypes(include=[np.number]).columns
            txt = f"Dataset: {len(current_df)} rows × {len(current_df.columns)} columns.\n"
            for c in num_cols[:5]:
                txt += f"  {c}: mean={current_df[c].mean():.2f}, std={current_df[c].std():.2f}, range=[{current_df[c].min():.1f}, {current_df[c].max():.1f}]\n"
            return jsonify({"answer": txt, "data": desc, "type": "table"})

        # Fallback: show describe table
        return jsonify({"answer": "Here are the dataset statistics:", "data": current_df.describe().to_dict(), "type": "table"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict", methods=["POST"])
def predict():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json
    target = data.get("target")
    features = data.get("features", [])
    
    if not target: return jsonify({"error": "Target column required"}), 400
    if target not in current_df.columns: return jsonify({"error": f"Target '{target}' not found"}), 400

    if not features:
        features = [c for c in current_df.columns if c != target]
    features = [f for f in features if f in current_df.columns]
    if not features: return jsonify({"error": "No valid features found"}), 400
    
    try:
        df_ml = current_df.dropna(subset=[target]).copy()
        if len(df_ml) < 5:
            return jsonify({"error": f"Need at least 5 rows with target data, got {len(df_ml)}"}), 400
        
        y = df_ml[target]
        is_regression = pd.api.types.is_numeric_dtype(y)
        
        if is_regression:
            y = y.fillna(y.median())
        else:
            y = y.fillna(y.mode()[0] if not y.mode().empty else "Unknown")
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y.astype(str)))
            
        X = df_ml[features].copy()
        for col in X.select_dtypes(include=[np.number]).columns:
            X[col] = X[col].fillna(X[col].median())
        X = pd.get_dummies(X, drop_first=True).fillna(0)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        test_size = min(0.2, max(2, int(len(y)*0.2)) / len(y))
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=test_size, random_state=42)
        
        if is_regression:
            model = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            r2 = model.score(X_test, y_test)
            mae = mean_absolute_error(y_test, y_pred)
            rmse = float(np.sqrt(np.mean((y_test - y_pred)**2)))
            
            cv_k = min(5, len(y))
            cv_scores = cross_val_score(model, X_scaled, y, cv=max(2, cv_k), scoring='r2') if len(y) >= 4 else [r2]
        else:
            model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            acc = accuracy_score(y_test, y_pred)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            cv_k = min(5, len(np.unique(y)))
            cv_scores = cross_val_score(model, X_scaled, y, cv=max(2, cv_k)) if len(np.unique(y)) >= 2 else [acc]
        
        # Feature importance chart
        importances = model.feature_importances_
        feat_names = X.columns.tolist()
        sorted_idx = np.argsort(importances)[-min(10, len(feat_names)):]
        
        fig, ax = plt.subplots(figsize=(8, 5))
        fig.patch.set_facecolor('#fafafa')
        ax.set_facecolor('#fafafa')
        ax.barh(range(len(sorted_idx)), importances[sorted_idx], color='#6366f1', edgecolor='white')
        ax.set_yticks(range(len(sorted_idx)))
        ax.set_yticklabels([feat_names[i] for i in sorted_idx], fontsize=10)
        ax.set_xlabel("Importance", fontsize=11)
        ax.set_title("Feature Importance (Top 10)", fontsize=13, fontweight='bold')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        importance_img = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        top_features = [{"name": feat_names[i], "importance": round(float(importances[i]), 4)} for i in sorted_idx[::-1]]
        
        if is_regression:
            return jsonify({
                "message": f"Regression model trained on {len(X_train)} samples",
                "accuracy": round(float(r2), 4),
                "mae": round(float(mae), 4),
                "rmse": round(float(rmse), 4),
                "cv_avg": round(float(np.mean(cv_scores)), 4),
                "cv_std": round(float(np.std(cv_scores)), 4),
                "type": "regression",
                "features_used": len(X.columns),
                "top_features": top_features[:5],
                "importance_chart": importance_img
            })
        else:
            return jsonify({
                "message": f"Classification model trained on {len(X_train)} samples",
                "accuracy": round(float(acc), 4),
                "f1_score": round(float(f1), 4),
                "cv_avg": round(float(np.mean(cv_scores)), 4),
                "cv_std": round(float(np.std(cv_scores)), 4),
                "type": "classification",
                "n_classes": int(len(np.unique(y))),
                "features_used": len(X.columns),
                "top_features": top_features[:5],
                "importance_chart": importance_img
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/compare", methods=["POST"])
def compare_models():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    data = request.json
    target = data.get("target")
    if not target or target not in current_df.columns:
        return jsonify({"error": "Valid target column required"}), 400
    features = data.get("features", [c for c in current_df.columns if c != target])
    
    try:
        df_ml = current_df.dropna(subset=[target]).copy()
        y = df_ml[target]
        X = pd.get_dummies(df_ml[features], drop_first=True).fillna(0)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        is_reg = pd.api.types.is_numeric_dtype(y)
        if is_reg:
            y = y.fillna(y.median())
        else:
            y = y.fillna(y.mode()[0])
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y.astype(str)))
            
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        results = []
        if is_reg:
            models = {
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "Linear Regression": LinearRegression()
            }
            for name, m in models.items():
                m.fit(X_train, y_train)
                y_pred = m.predict(X_test)
                r2 = m.score(X_test, y_test)
                mae = mean_absolute_error(y_test, y_pred)
                results.append({"name": name, "score": round(float(r2), 4), "mae": round(float(mae), 2), "type": "R² Score"})
        else:
            from sklearn.tree import DecisionTreeClassifier
            models = {
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=1000),
                "Decision Tree": DecisionTreeClassifier(max_depth=10, random_state=42)
            }
            for name, m in models.items():
                m.fit(X_train, y_train)
                y_pred = m.predict(X_test)
                acc = accuracy_score(y_test, y_pred)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
                results.append({"name": name, "score": round(float(acc), 4), "f1": round(float(f1), 4), "type": "Accuracy"})
                
        return jsonify({"results": sorted(results, key=lambda x: x['score'], reverse=True)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/cluster", methods=["POST"])
def cluster_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    n_clusters = int(request.json.get("clusters", 3))
    try:
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        if len(num_cols) < 2: return jsonify({"error": "Need at least 2 numeric columns for clustering"}), 400
        
        X = current_df[num_cols].fillna(0)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        n_clusters = min(n_clusters, len(X))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(X_scaled)
        
        save_history()
        current_df['Cluster'] = clusters
        
        # Generate cluster visualization
        fig, ax = plt.subplots(figsize=(8, 6))
        fig.patch.set_facecolor('#fafafa')
        ax.set_facecolor('#fafafa')
        colors = ['#6366f1','#a855f7','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#14b8a6']
        for i in range(n_clusters):
            mask = clusters == i
            ax.scatter(X_scaled[mask, 0], X_scaled[mask, 1], c=colors[i % len(colors)], label=f'Cluster {i}', alpha=0.7, edgecolors='white', s=60)
        ax.set_xlabel(num_cols[0], fontsize=11)
        ax.set_ylabel(num_cols[1], fontsize=11)
        ax.set_title(f"K-Means Clustering (k={n_clusters})", fontsize=13, fontweight='bold')
        ax.legend(fontsize=9)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        cluster_img = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        # Cluster stats
        cluster_info = []
        for i in range(n_clusters):
            cluster_info.append({"cluster": i, "count": int((clusters == i).sum())})
        
        return jsonify({
            "message": f"Segmented data into {n_clusters} clusters",
            "summary": get_data_summary(current_df),
            "cluster_chart": cluster_img,
            "cluster_info": cluster_info
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/report/pdf", methods=["GET"])
def download_pdf():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset"}), 400
    
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(190, 10, "DataMind AI Professional Report", ln=True, align='C')
        pdf.ln(10)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 10, "1. Dataset Summary", ln=True)
        pdf.set_font("Arial", '', 10)
        pdf.cell(190, 8, f"Total Rows: {len(current_df)}", ln=True)
        pdf.cell(190, 8, f"Total Columns: {len(current_df.columns)}", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 10, "2. Data Quality Audit", ln=True)
        pdf.set_font("Arial", '', 10)
        missing = current_df.isnull().sum().sum()
        pdf.cell(190, 8, f"Missing Values: {missing}", ln=True)
        pdf.cell(190, 8, f"Duplicates: {current_df.duplicated().sum()}", ln=True)
        pdf.ln(5)
        
        # Add insights if correlation was run
        num_df = current_df.select_dtypes(include=[np.number])
        if not num_df.empty:
            pdf.set_font("Arial", 'B', 12)
            pdf.cell(190, 10, "3. Top Correlations", ln=True)
            pdf.set_font("Arial", '', 10)
            corr = num_df.corr()
            for i in range(min(5, len(corr.columns))):
                for j in range(i+1, min(5, len(corr.columns))):
                    if abs(corr.iloc[i,j]) > 0.5:
                        pdf.cell(190, 8, f"- {corr.columns[i]} & {corr.columns[j]}: {corr.iloc[i,j]:.2f}", ln=True)
        
        output = io.BytesIO()
        pdf_raw = pdf.output()
        pdf_bytes = pdf_raw if isinstance(pdf_raw, (bytes, bytearray)) else pdf_raw.encode('latin-1')
        output.write(bytes(pdf_bytes))
        output.seek(0)
        
        return send_file(output, mimetype="application/pdf", as_attachment=True, download_name="DataMind_Report.pdf")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/report", methods=["GET"])
def download_report():
    if current_df is None: return jsonify({"error": "No dataset"}), 400
    output = io.BytesIO()
    current_df.to_csv(output, index=False)
    output.seek(0)
    return send_file(output, mimetype="text/csv", as_attachment=True, download_name="report.csv")

@app.route("/api/transform", methods=["POST"])
def transform_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    data = request.json
    action = data.get("action")
    try:
        if action == "rename":
            old_name = data.get("old_name")
            new_name = data.get("new_name")
            if not new_name or not new_name.strip():
                return jsonify({"error": "New name cannot be empty"}), 400
            if old_name in current_df.columns:
                save_history()
                current_df = current_df.rename(columns={old_name: new_name.strip()})
                return jsonify({"message": f"Renamed '{old_name}' to '{new_name.strip()}'", "summary": get_data_summary(current_df)})
            return jsonify({"error": f"Column '{old_name}' not found"}), 400
        elif action == "merge":
            col1 = data.get("col1")
            col2 = data.get("col2")
            new_name = data.get("new_name", f"{col1}_{col2}").strip()
            op = data.get("op", "concat")
            if not new_name:
                return jsonify({"error": "New column name cannot be empty"}), 400
            if col1 in current_df.columns and col2 in current_df.columns:
                save_history()
                if op == "sum":
                    current_df[new_name] = pd.to_numeric(current_df[col1], errors='coerce') + pd.to_numeric(current_df[col2], errors='coerce')
                else:
                    current_df[new_name] = current_df[col1].astype(str) + " " + current_df[col2].astype(str)
                return jsonify({"message": f"Merged '{col1}' and '{col2}' into '{new_name}'", "summary": get_data_summary(current_df)})
            return jsonify({"error": "One or both columns not found"}), 400
        elif action == "create_column":
            col1 = data.get("col1")
            col2 = data.get("col2")
            # Accept both 'new_name' and 'new' keys for compatibility
            new_name = (data.get("new_name") or data.get("new", "")).strip()
            op = data.get("op")
            if not col1 or not col2 or not new_name:
                return jsonify({"error": "Missing column names or output column name"}), 400
            if col1 not in current_df.columns or col2 not in current_df.columns:
                return jsonify({"error": f"Column '{col1}' or '{col2}' not found"}), 400
            try:
                save_history()
                s1 = pd.to_numeric(current_df[col1], errors='coerce')
                s2 = pd.to_numeric(current_df[col2], errors='coerce')
                if op == "add":   current_df[new_name] = s1 + s2
                elif op == "sub": current_df[new_name] = s1 - s2
                elif op == "mul": current_df[new_name] = s1 * s2
                elif op == "div": current_df[new_name] = s1 / s2.replace(0, np.nan)
                else: return jsonify({"error": "Invalid operator"}), 400
                return jsonify({"message": f"Created column '{new_name}'", "summary": get_data_summary(current_df)})
            except Exception as e:
                return jsonify({"error": f"Calculation error: {str(e)}"}), 400
        elif action == "filter":
            col = data.get("column")
            op = data.get("op")
            val_raw = data.get("value", "")
            if not col or col not in current_df.columns:
                return jsonify({"error": f"Column '{col}' not found"}), 400
            if val_raw is None or str(val_raw).strip() == "":
                return jsonify({"error": "Filter value cannot be empty"}), 400
            save_history()
            is_numeric = pd.api.types.is_numeric_dtype(current_df[col])
            if is_numeric:
                try:
                    val = float(val_raw)
                    if op == ">": current_df = current_df[current_df[col] > val]
                    elif op == "<": current_df = current_df[current_df[col] < val]
                    elif op == ">=": current_df = current_df[current_df[col] >= val]
                    elif op == "<=": current_df = current_df[current_df[col] <= val]
                    elif op == "==": current_df = current_df[current_df[col] == val]
                    elif op == "!=": current_df = current_df[current_df[col] != val]
                    else: return jsonify({"error": "Invalid operator"}), 400
                except ValueError:
                    return jsonify({"error": "Numeric column requires a numeric filter value"}), 400
            else:
                val = str(val_raw)
                if op == "==": current_df = current_df[current_df[col].astype(str) == val]
                elif op == "!=": current_df = current_df[current_df[col].astype(str) != val]
                elif op == "contains": current_df = current_df[current_df[col].astype(str).str.contains(val, case=False, na=False)]
                else: return jsonify({"error": f"Operator '{op}' not valid for text columns. Use ==, != or contains."}), 400
            current_df = current_df.reset_index(drop=True)
            return jsonify({"message": f"Filtered: {col} {op} '{val_raw}' → {len(current_df)} rows remaining", "summary": get_data_summary(current_df)})
        return jsonify({"error": "Invalid action"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/crud", methods=["POST"])
def crud_operations():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    data = request.json
    action = data.get("action")
    try:
        save_history()
        if action == "add_row":
            current_df = pd.concat([current_df, pd.DataFrame([data.get("row_data")])], ignore_index=True)
            msg = "Row added successfully"
        elif action == "delete_row":
            idx = int(data.get("index"))
            if idx not in current_df.index:
                return jsonify({"error": f"Row index {idx} not found"}), 400
            current_df = current_df.drop(idx).reset_index(drop=True)
            msg = f"Row {idx} deleted"
        elif action == "update_cell":
            idx = int(data.get("index"))
            col = data.get("column")
            val = data.get("value")
            if col not in current_df.columns:
                return jsonify({"error": f"Column '{col}' not found"}), 400
            current_df.at[idx, col] = val
            msg = f"Cell [{idx}, '{col}'] updated"
        elif action == "delete_column":
            col = data.get("column")
            if col not in current_df.columns:
                return jsonify({"error": f"Column '{col}' not found"}), 400
            current_df = current_df.drop(columns=[col])
            msg = f"Column '{col}' deleted"
        else: return jsonify({"error": "Invalid action"}), 400
        return jsonify({"message": msg, "summary": get_data_summary(current_df), "history_depth": len(history_stack)})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route("/api/summary", methods=["GET"])
def get_executive_summary():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset"}), 400
    
    try:
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        cat_cols = current_df.select_dtypes(exclude=[np.number]).columns
        
        summary = f"Executive Summary: This dataset contains {len(current_df)} records across {len(current_df.columns)} dimensions. "
        if not num_cols.empty:
            summary += f"Key metrics include {', '.join(num_cols[:3])}. "
        if not cat_cols.empty:
            summary += f"The data is categorized by {', '.join(cat_cols[:2])}. "
        
        # Add a "Data Health" note
        missing = current_df.isnull().sum().sum()
        if missing == 0: summary += "The data is clean with no missing values. "
        else: summary += f"Note: {missing} missing cells were detected and should be handled. "
        
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/quality", methods=["GET"])
def get_data_quality():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        total_cells = current_df.size
        missing_cells = int(current_df.isnull().sum().sum())
        duplicates = int(current_df.duplicated().sum())
        
        num_cols = current_df.select_dtypes(include=[np.number]).columns
        outliers_count = 0
        for col in num_cols:
            std = current_df[col].std()
            if std > 0:
                z_scores = np.abs((current_df[col] - current_df[col].mean()) / std)
                outliers_count += int((z_scores > 3).sum())
            
        score = 100 - ((missing_cells / total_cells * 50) + (duplicates / max(len(current_df), 1) * 30) + (min(outliers_count, 10) * 2))
        score = round(max(0, min(100, score)), 1)
        
        return jsonify({
            "score": score,
            "missing": missing_cells,
            "duplicates": duplicates,
            "outliers": outliers_count,
            "health": "Excellent" if score > 90 else "Good" if score > 70 else "Fair" if score > 50 else "Poor"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/correlation", methods=["GET"])
def get_correlation():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    
    try:
        num_df = current_df.select_dtypes(include=[np.number])
        if num_df.empty: return jsonify({"error": "No numeric columns for correlation"}), 400
        
        corr = num_df.corr()
        
        plt.figure(figsize=(10, 8))
        try:
            import seaborn as sns
            sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".2f", linewidths=0.5)
        except ImportError:
            # Fallback if seaborn is missing
            plt.imshow(corr, cmap='coolwarm', interpolation='none')
            plt.colorbar()
            plt.xticks(range(len(corr)), corr.columns, rotation=90)
            plt.yticks(range(len(corr)), corr.columns)
            for i in range(len(corr)):
                for j in range(len(corr)):
                    plt.text(j, i, f"{corr.iloc[i, j]:.2f}", ha='center', va='center')
        
        plt.title("Correlation Heatmap")
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        # Also find top correlations
        top_corr = []
        for i in range(len(corr.columns)):
            for j in range(i+1, len(corr.columns)):
                if abs(corr.iloc[i, j]) > 0.5:
                    top_corr.append(f"{corr.columns[i]} & {corr.columns[j]}: {corr.iloc[i, j]:.2f}")
        
        return jsonify({
            "image": img_base64,
            "insights": top_corr[:3]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/undo", methods=["POST"])
def undo():
    global current_df, history_stack
    if not history_stack:
        return jsonify({"error": "Nothing to undo"}), 400
    current_df = history_stack.pop()
    return jsonify({"message": "Undo successful", "summary": get_data_summary(current_df), "history_depth": len(history_stack)})

@app.route("/api/sort", methods=["POST"])
def sort_data():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    data = request.json
    col = data.get("column")
    ascending = data.get("ascending", True)
    try:
        if col not in current_df.columns:
            return jsonify({"error": f"Column '{col}' not found"}), 400
        save_history()
        current_df = current_df.sort_values(by=col, ascending=ascending).reset_index(drop=True)
        direction = "ascending" if ascending else "descending"
        return jsonify({"message": f"Sorted by '{col}' ({direction})", "summary": get_data_summary(current_df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/describe", methods=["GET"])
def describe_columns():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset uploaded"}), 400
    try:
        result = {}
        for col in current_df.columns:
            s = current_df[col]
            stats = {"dtype": str(s.dtype), "missing": int(s.isnull().sum()), "unique": int(s.nunique())}
            if pd.api.types.is_numeric_dtype(s):
                stats.update({
                    "mean": round(float(s.mean()), 2),
                    "std": round(float(s.std()), 2),
                    "min": round(float(s.min()), 2),
                    "max": round(float(s.max()), 2),
                    "median": round(float(s.median()), 2),
                })
            else:
                stats["top_values"] = {str(k): int(v) for k, v in s.value_counts().head(3).items()}
            result[col] = stats
        return jsonify({"columns": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/export/excel", methods=["GET"])
def export_excel():
    global current_df
    if current_df is None: return jsonify({"error": "No dataset loaded"}), 400
    try:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            current_df.to_excel(writer, index=False, sheet_name='Data')
            desc = current_df.describe()
            desc.to_excel(writer, sheet_name='Statistics')
        output.seek(0)
        return send_file(output, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                         as_attachment=True, download_name="DataMind_Export.xlsx")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/reset", methods=["POST"])
def reset_data():
    global current_df, history_stack
    current_df = None
    history_stack = []
    return jsonify({"message": "Data reset successfully"})

if __name__ == "__main__":
    app.run(debug=True, port=5000, host='0.0.0.0')