<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/bea447d1-2365-42bb-a470-5e86ead97234" />
# DataMind AI (AI Data Analyst)

DataMind AI is an end-to-end AI-powered data analytics platform that turns raw datasets into actionable insights. It empowers users to upload datasets, discover insights, and build machine learning models—all through an intuitive dashboard and natural language queries.

## 🚀 Features

- **Smart Data Uploads:** Upload CSV and Excel files for automatic data profiling and quality auditing.
- **Natural Language AI Assistant:** Ask questions about your data in plain English (e.g., *"What is the average salary?"*, *"Show me a bar chart of departments"*).
- **Interactive Visualizations:** Generate dynamic Bar, Line, Scatter, Pie, and Correlation Heatmap charts.
- **Smart Data Tools:** Perform complex data transformations directly from the UI:
  - Rename, Merge, and Calculate new columns.
  - Filter data and manage rows (CRUD operations).
- **Advanced Analytics & ML (PRO):**
  - Train Custom Machine Learning Models (Random Forest) for Regression or Classification tasks.
  - Automatically calculate Feature Importance.
  - Discover data segments using K-Means Clustering.
  - Compare model performance on a leaderboard.
- **One-Click Exports:** Export your cleaned data to CSV, Excel, or generate a professional PDF executive summary.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Recharts (for Data Visualization)
- Vanilla CSS (Custom modern styling and dark mode)

**Backend:**
- Python & Flask (RESTful API)
- Pandas & NumPy (Data processing)
- Scikit-Learn (Machine Learning)
- Matplotlib (Server-side plot generation)

## 💻 Running Locally

### Prerequisites
- Node.js (v16+)
- Python 3.8+

### 1. Start the Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*The backend API will run on `http://localhost:5000`*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`*

## 🐳 Deployment

This project is configured for easy deployment.

### Backend (Docker / Cloud Run)
A `Dockerfile` and `gunicorn` setup is provided.
```bash
cd backend
docker build -t datamind-backend .
docker run -p 5000:5000 datamind-backend
```

### Frontend (Vercel / Netlify)
Set the `VITE_API_BASE` environment variable in your deployment platform to point to your live backend URL.
```bash
cd frontend
npm run build
```

## 📝 License
This project is licensed under the MIT License.
