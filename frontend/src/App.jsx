import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell, Tooltip, Legend, XAxis, YAxis, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  LayoutDashboard, BarChart3, BrainCircuit, Radar as RadarIcon, TrendingUp,
  FlaskConical, PieChart as PieIcon, Wrench, MessageSquare, UploadCloud,
  Sparkles, RefreshCw, Undo2, Download, FileSpreadsheet, FileText,
  Moon, Sun, CheckCircle2, AlertTriangle, Play, Sliders, Trash2, ArrowRight,
  Shield, Users, Lock, LogIn, LogOut, UserPlus, Key, UserCheck, Activity,
  Database, X, ChevronUp, Bot, Send, User, Mail, Eye, EyeOff, ShieldAlert, Check,
  Info, HelpCircle, ChevronDown, BookOpen, Target, Compass
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const CHART_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'];

// Intuitive Formal Guidance Ribbon for Every Analytical Module (Clean & Uncluttered)
function ModuleGuide({ badge, title, purpose, steps, expected }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`module-guide-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="module-guide-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="guide-badge-pill">
            <Compass size={12} />
            <span>{badge || 'GUIDE'}</span>
          </span>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: isExpanded ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
            color: isExpanded ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontSize: '0.725rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.25rem 0.65rem',
            cursor: 'pointer'
          }}
        >
          <span>{isExpanded ? 'Hide Instructions' : 'How to Use & Interpret'}</span>
          <ChevronDown size={13} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {isExpanded && (
        <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.35rem' }}>
          {purpose && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem', lineHeight: '1.45' }}>
              <Target size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span><strong>Objective:</strong> {purpose}</span>
            </div>
          )}

          {steps && steps.length > 0 && (
            <div className="guide-steps-grid">
              {steps.map((st, i) => (
                <div key={i} className="guide-step-item">
                  <div className="guide-step-num">{i + 1}</div>
                  <div className="guide-step-text">
                    <strong>{st.title}</strong>
                    <span>{st.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expected && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.45rem' }}>
              <Info size={13} color="var(--accent-secondary)" />
              <span><strong>Interpretation:</strong> {expected}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('datamind_token') || '');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ email: '', username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Data Decision Catalog & Filter Playbook Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSection, setCatalogSection] = useState('types'); // 'types' | 'tabs' | 'goals'

  // Admin Dashboard State
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [newAdminUser, setNewAdminUser] = useState({ email: '', username: '', password: '', role: 'user' });

  // Floating Chatbot Widget State
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);

  // Data & Analytics State
  const [dataSummary, setDataSummary] = useState(null);
  const [deepProfile, setDeepProfile] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [sampleDatasets, setSampleDatasets] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Table pagination & search
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const rowsPerPage = 10;

  // Visual Studio Controls
  const [chartType, setChartType] = useState('bar');
  const [chartX, setChartX] = useState('');
  const [chartY, setChartY] = useState('');
  const [chartAgg, setChartAgg] = useState('sum');

  // Predictive AI & Simulator
  const [targetCol, setTargetCol] = useState('');
  const [modelAlgo, setModelAlgo] = useState('random_forest');
  const [trainResult, setTrainResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [simInputs, setSimInputs] = useState({});
  const [simOutput, setSimOutput] = useState(null);

  // Anomaly Detection
  const [contamination, setContamination] = useState(0.05);
  const [anomalyData, setAnomalyData] = useState(null);

  // Forecast
  const [forecastMetric, setForecastMetric] = useState('');
  const [forecastSteps, setForecastSteps] = useState(10);
  const [forecastData, setForecastData] = useState(null);

  // Hypothesis Testing
  const [testType, setTestType] = useState('ttest');
  const [testCol1, setTestCol1] = useState('');
  const [testCol2, setTestCol2] = useState('');
  const [testResult, setTestResult] = useState(null);

  // Pareto
  const [paretoDim, setParetoDim] = useState('');
  const [paretoMetric, setParetoMetric] = useState('');
  const [paretoData, setParetoData] = useState(null);

  // Feature Engineering
  const [feAction, setFeAction] = useState('log_transform');
  const [feCol, setFeCol] = useState('');

  // AI Copilot Chat Messages
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: '👋 Welcome to **DataMind AI Studio**! Ask me any question about your data, statistical distributions, or model insights.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Derived columns list
  const numericColumns = useMemo(() => {
    if (!dataSummary?.columns) return [];
    return dataSummary.columns.filter(c => {
      const t = String(dataSummary.data_types[c] || '').toLowerCase();
      return t.includes('int') || t.includes('float') || t.includes('number');
    });
  }, [dataSummary]);

  const categoricalColumns = useMemo(() => {
    if (!dataSummary?.columns) return [];
    return dataSummary.columns.filter(c => !numericColumns.includes(c));
  }, [dataSummary, numericColumns]);

  // Set Auth headers for Axios
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      localStorage.setItem('datamind_token', authToken);
      // Fetch user profile
      axios.get(`${API_BASE}/auth/me`)
        .then(res => {
          if (res.data.authenticated) setCurrentUser(res.data.user);
          else handleLogout();
        })
        .catch(() => handleLogout());
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('datamind_token');
      setCurrentUser(null);
    }
  }, [authToken]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load sample datasets catalogue on mount
  useEffect(() => {
    axios.get(`${API_BASE}/sample-datasets`)
      .then(res => setSampleDatasets(res.data.datasets || []))
      .catch(err => console.error(err));
  }, []);

  // Sync selectors when data updates
  useEffect(() => {
    if (dataSummary && dataSummary.columns.length > 0) {
      const cols = dataSummary.columns;
      const numCols = cols.filter(c => {
        const t = String(dataSummary.data_types[c] || '').toLowerCase();
        return t.includes('int') || t.includes('float') || t.includes('number');
      });
      const catCols = cols.filter(c => !numCols.includes(c));

      setChartX(catCols[0] || cols[0]);
      setChartY(numCols[0] || cols[1] || cols[0]);
      setTargetCol(catCols[0] || numCols[numCols.length - 1] || cols[cols.length - 1]);
      setForecastMetric(numCols[0] || cols[0]);
      setParetoDim(catCols[0] || cols[0]);
      setParetoMetric(numCols[0] || cols[1] || cols[0]);
      setFeCol(numCols[0] || cols[0]);
      setTestCol1(numCols[0] || cols[0]);
      setTestCol2(catCols[0] || cols[1] || cols[0]);

      refreshAllAnalytics();
    }
  }, [dataSummary?.columns?.length]);

  const refreshAllAnalytics = async () => {
    try {
      const [profileRes, qualityRes, corrRes] = await Promise.all([
        axios.get(`${API_BASE}/deep-profile`),
        axios.get(`${API_BASE}/quality`),
        axios.get(`${API_BASE}/correlation`).catch(() => ({ data: null }))
      ]);
      setDeepProfile(profileRes.data);
      setQualityData(qualityRes.data);
      if (corrRes?.data) setCorrelationData(corrRes.data);
    } catch (e) {
      console.error("Analytics refresh error", e);
    }
  };

  // Auth Functions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsProcessing(true);
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const res = await axios.post(`${API_BASE}${endpoint}`, authForm);
      setAuthToken(res.data.token);
      setCurrentUser(res.data.user);
      setAuthSuccess(authMode === 'login' ? `Welcome back, ${res.data.user.username}!` : 'Account created successfully!');
      
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccess('');
        setAuthForm({ email: '', username: '', password: '' });
        setShowPassword(false);
      }, 750);
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    if (activeTab === 'admin') setActiveTab('overview');
  };

  // Admin Functions
  const fetchAdminData = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsProcessing(true);
    try {
      const [usersRes, logsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/users`),
        axios.get(`${API_BASE}/admin/audit-logs`),
        axios.get(`${API_BASE}/admin/system-stats`)
      ]);
      setAdminUsers(usersRes.data.users);
      setAdminAuditLogs(logsRes.data.logs);
      setAdminStats(statsRes.data);
    } catch (err) {
      alert("Failed to load admin telemetry: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') fetchAdminData();
  }, [activeTab]);

  const toggleUserStatus = async (userId) => {
    try {
      await axios.post(`${API_BASE}/admin/users/toggle-status`, { user_id: userId });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await axios.post(`${API_BASE}/admin/users/role`, { user_id: userId, role: newRole });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this user account?")) return;
    try {
      await axios.delete(`${API_BASE}/admin/users/${userId}`);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleAdminCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/admin/users/create`, newAdminUser);
      setNewAdminUser({ email: '', username: '', password: '', role: 'user' });
      fetchAdminData();
      alert("User created successfully!");
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    setIsProcessing(true);
    setStatusMessage('Uploading and parsing dataset...');
    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      setDataSummary(res.data.summary);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `📁 **${file.name}** uploaded successfully (${res.data.summary.rows} rows, ${res.data.summary.columns.length} columns).`
      }]);
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const loadSample = async (id) => {
    setIsProcessing(true);
    setStatusMessage('Synthesizing sample dataset...');
    try {
      const res = await axios.post(`${API_BASE}/load-sample`, { dataset_id: id });
      setDataSummary(res.data.summary);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `✨ Loaded **${res.data.message}**.`
      }]);
    } catch (err) {
      alert("Failed to load sample: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleClean = async () => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/clean`);
      setDataSummary(res.data.summary);
      refreshAllAnalytics();
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async () => {
    try {
      const res = await axios.post(`${API_BASE}/undo`);
      setDataSummary(res.data.summary);
      refreshAllAnalytics();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset active dataset session?")) return;
    try {
      await axios.post(`${API_BASE}/reset`);
      setDataSummary(null);
      setDeepProfile(null);
      setQualityData(null);
      setTrainResult(null);
      setSimOutput(null);
      setAnomalyData(null);
      setForecastData(null);
      setTestResult(null);
      setParetoData(null);
    } catch (err) {
      console.error(err);
    }
  };

  // ML Training
  const runModelTraining = async () => {
    if (!targetCol) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/predict`, {
        target: targetCol,
        algorithm: modelAlgo
      });
      setTrainResult(res.data);
      const defaults = {};
      res.data.simulator_inputs?.forEach(inp => {
        defaults[inp.name] = inp.default;
      });
      setSimInputs(defaults);
      simulate(targetCol, defaults);
    } catch (err) {
      alert("Model training error: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const runLeaderboard = async () => {
    if (!targetCol) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/compare`, { target: targetCol });
      setLeaderboard(res.data.results);
    } catch (err) {
      alert("Leaderboard error: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const simulate = async (target, inputs) => {
    try {
      const res = await axios.post(`${API_BASE}/simulate`, { target, inputs });
      setSimOutput(res.data);
    } catch (err) {
      console.error("Simulation error", err);
    }
  };

  const handleSimInputChange = (name, val) => {
    const updated = { ...simInputs, [name]: val };
    setSimInputs(updated);
    simulate(targetCol, updated);
  };

  // Anomaly Detection
  const runAnomalyDetection = async () => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/anomalies`, { contamination: parseFloat(contamination) });
      setAnomalyData(res.data);
    } catch (err) {
      alert("Anomaly detection failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const purgeAnomalies = async () => {
    if (!window.confirm("Purge detected anomalous rows from the active dataset?")) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/anomalies/remove`, { contamination: parseFloat(contamination) });
      setDataSummary(res.data.summary);
      refreshAllAnalytics();
      runAnomalyDetection();
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Forecasting
  const runForecast = async () => {
    const colToUse = forecastMetric || numericColumns[0] || dataSummary?.columns[0];
    if (!colToUse) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/forecast`, {
        metric_col: colToUse,
        steps: parseInt(forecastSteps)
      });
      setForecastData(res.data);
    } catch (err) {
      alert("Forecasting failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Hypothesis Test
  const runHypothesisTest = async () => {
    if (!testCol1 || !testCol2) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/hypothesis-test`, {
        test_type: testType,
        col1: testCol1,
        col2: testCol2
      });
      setTestResult(res.data);
    } catch (err) {
      alert("Hypothesis test failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Pareto Analysis
  const runPareto = async () => {
    const dimToUse = paretoDim || categoricalColumns[0] || dataSummary?.columns[0];
    const metricToUse = paretoMetric || numericColumns[0] || dataSummary?.columns[1];
    if (!dimToUse) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/pareto`, {
        dimension: dimToUse,
        metric: metricToUse
      });
      setParetoData(res.data);
    } catch (err) {
      alert("Pareto analysis failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Feature Engineering
  const applyFeatureEngineering = async () => {
    if (!feCol) return;
    setIsProcessing(true);
    try {
      const res = await axios.post(`${API_BASE}/feature-engineer`, {
        column: feCol,
        action: feAction
      });
      setDataSummary(res.data.summary);
      refreshAllAnalytics();
      alert(res.data.message);
    } catch (err) {
      alert("Feature engineering failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // Chat Query
  const sendChatQuery = async (queryText) => {
    const q = queryText || chatInput;
    if (!q.trim()) return;
    const userMsg = { role: 'user', content: q };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsProcessing(true);

    try {
      const res = await axios.post(`${API_BASE}/query`, { query: q });
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: res.data.answer,
        image: res.data.image,
        data: res.data.data
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "⚠️ Could not process query: " + (err.response?.data?.error || err.message) }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Computed Aggregated Data for Visual Studio
  const visualChartData = useMemo(() => {
    if (!dataSummary || !chartX || !chartY) return [];
    const rows = dataSummary.head;
    if (!rows || rows.length === 0) return [];

    const grouped = {};
    rows.forEach(r => {
      const key = String(r[chartX] ?? 'Unknown');
      const val = parseFloat(r[chartY]) || 0;
      if (!grouped[key]) {
        grouped[key] = { count: 0, sum: 0, min: val, max: val, vals: [] };
      }
      grouped[key].count += 1;
      grouped[key].sum += val;
      grouped[key].min = Math.min(grouped[key].min, val);
      grouped[key].max = Math.max(grouped[key].max, val);
      grouped[key].vals.push(val);
    });

    return Object.entries(grouped).map(([k, stat]) => {
      let finalVal = stat.sum;
      if (chartAgg === 'mean') finalVal = stat.sum / stat.count;
      if (chartAgg === 'count') finalVal = stat.count;
      if (chartAgg === 'max') finalVal = stat.max;
      if (chartAgg === 'min') finalVal = stat.min;
      return {
        name: k,
        value: Number(finalVal.toFixed(2)),
        raw_count: stat.count
      };
    }).slice(0, 15);
  }, [dataSummary, chartX, chartY, chartAgg]);

  const filteredTableRows = useMemo(() => {
    if (!dataSummary || !dataSummary.head) return [];
    if (!tableSearch) return dataSummary.head;
    return dataSummary.head.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase()))
    );
  }, [dataSummary, tableSearch]);

  const paginatedRows = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return filteredTableRows.slice(start, start + rowsPerPage);
  }, [filteredTableRows, tablePage]);

  return (
    <div className="app-wrapper">
      {/* Top Header Bar */}
      <header className="top-navbar">
        <div className="brand-area">
          <div className="brand-logo">
            <BrainCircuit size={28} color="#6366f1" />
            <span>DataMind AI</span>
          </div>
          <span className="brand-badge">PRO STUDIO</span>
        </div>

        <div className="nav-controls">
          {/* Group 1: Dataset Connect */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 700 }}>DATASET:</span>
            <select
              style={{ fontSize: '0.8rem', height: '34px', padding: '0 0.6rem' }}
              onChange={(e) => e.target.value && loadSample(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Load Preset...</option>
              {sampleDatasets.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <label className="btn-secondary" style={{ height: '34px', fontSize: '0.775rem', cursor: 'pointer', padding: '0 0.75rem', gap: '0.35rem' }}>
            <UploadCloud size={15} />
            <span>Upload</span>
            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
          </label>

          <button
            className="btn-secondary"
            style={{ height: '34px', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0 0.75rem' }}
            onClick={() => setShowCatalogModal(true)}
            title="Open Data Decision Catalog & Filter Playbook"
          >
            <BookOpen size={14} color="var(--accent-primary)" />
            <span>Playbook</span>
          </button>

          {dataSummary && (
            <>
              <div className="nav-divider" />

              {/* Group 2: Data Tools */}
              <button className="btn-secondary" onClick={handleClean} title="Auto Clean Dataset" style={{ height: '34px', fontSize: '0.775rem', padding: '0 0.65rem', gap: '0.35rem' }}>
                <Sparkles size={14} color="#10b981" />
                <span>Clean</span>
              </button>
              <button className="btn-secondary" onClick={handleUndo} title="Undo Last Change" style={{ height: '34px', fontSize: '0.775rem', padding: '0 0.65rem', gap: '0.35rem' }}>
                <Undo2 size={14} />
                <span>Undo</span>
              </button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <button
                  className="btn-primary"
                  style={{ height: '30px', fontSize: '0.75rem', padding: '0 0.6rem', gap: '0.25rem' }}
                  onClick={() => window.open(`${API_BASE}/report/pdf`, '_blank')}
                  title="Export Analytical Report as PDF"
                >
                  <FileText size={13} />
                  <span>PDF</span>
                </button>
                <button
                  className="btn-secondary"
                  style={{ height: '30px', fontSize: '0.75rem', padding: '0 0.6rem', gap: '0.25rem', border: 'none' }}
                  onClick={() => window.open(`${API_BASE}/export/excel`, '_blank')}
                  title="Export Sanitized Data to Excel"
                >
                  <FileSpreadsheet size={13} />
                  <span>XLS</span>
                </button>
              </div>
            </>
          )}

          <div className="nav-divider" />

          {/* Group 3: User & Session */}
          {currentUser ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'var(--bg-input)', padding: '0 0.65rem', height: '34px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span className={`badge ${currentUser.role === 'admin' ? 'badge-danger' : 'badge-purple'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem', padding: '2px 6px' }}>
                {currentUser.role}
              </span>
              <span style={{ fontSize: '0.775rem', fontWeight: 700 }}>{currentUser.username}</span>
              <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '0 2px', display: 'inline-flex', alignItems: 'center' }} title="Log out">
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button className="btn-primary" style={{ height: '34px', fontSize: '0.775rem', padding: '0 0.75rem', gap: '0.35rem' }} onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
              <LogIn size={14} />
              <span>Login</span>
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ width: '34px', height: '34px', padding: 0, borderRadius: '50%' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
          </button>

          {dataSummary && (
            <button className="btn-danger" onClick={handleReset} title="Reset Session" style={{ width: '34px', height: '34px', padding: 0 }}>
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tab Strip */}
      <nav className="tab-navigation-strip">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'visuals', label: 'Visual Studio', icon: BarChart3 },
          { id: 'ai_models', label: 'Predictive AI', icon: BrainCircuit },
          { id: 'anomalies', label: 'Anomaly Radar', icon: RadarIcon },
          { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
          { id: 'hypothesis', label: 'Hypothesis Lab', icon: FlaskConical },
          { id: 'pareto', label: 'Pareto 80/20', icon: PieIcon },
          { id: 'engineering', label: 'Data Engineering', icon: Wrench },
          { id: 'chat', label: 'AI Copilot', icon: MessageSquare },
          ...(currentUser?.role === 'admin' ? [{ id: 'admin', label: 'Admin Vault', icon: Shield }] : [])
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`nav-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="main-viewport">
        {activeTab === 'admin' ? (
          currentUser?.role === 'admin' ? (
            /* ADMIN SECURITY DASHBOARD */
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <ModuleGuide
                badge="GOVERNANCE & AUDIT"
                title="Enterprise Access Control, User Management & Security Log Vault"
                purpose="Centrally manage team permissions, audit real-time authentication events, enforce least-privilege RBAC, and monitor database telemetry."
                steps={[
                  { title: "Review Telemetry", desc: "Monitor total registered users, active sessions, and database storage capacity." },
                  { title: "Manage Users", desc: "Toggle Active/Disabled status, elevate roles (user/admin), or delete accounts." },
                  { title: "Audit Log Trail", desc: "Inspect immutable security audit logs tracking logins, credential updates, and administrative events." }
                ]}
                expected="All administrative actions are permanently logged with ISO-8601 timestamps and client IP addresses for compliance readiness."
              />

              <div className="glass-card">
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ color: 'var(--accent-primary)' }}>
                      <Shield size={22} />
                      <span>Enterprise Security & Administration Vault</span>
                    </div>
                    <div className="card-subtitle">Manage users, role permissions, system audit logs, and database security</div>
                  </div>
                <button className="btn-secondary" onClick={fetchAdminData}>
                  <RefreshCw size={15} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {adminStats && (
                <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="kpi-card">
                    <span className="kpi-label">TOTAL REGISTERED USERS</span>
                    <span className="kpi-val">{adminStats.total_users}</span>
                    <span className="kpi-sub"><Users size={14} /> User Accounts</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">ACTIVE SESSIONS</span>
                    <span className="kpi-val" style={{ color: 'var(--success)' }}>{adminStats.active_users}</span>
                    <span className="kpi-sub"><UserCheck size={14} /> Verified Users</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">TOTAL AUDIT LOGS</span>
                    <span className="kpi-val">{adminStats.total_logs}</span>
                    <span className="kpi-sub"><Activity size={14} /> Security Events</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">DATABASE VAULT</span>
                    <span className="kpi-val">{adminStats.database_size_kb} KB</span>
                    <span className="kpi-sub"><Database size={14} /> SQLite Storage</span>
                  </div>
                </div>
              )}

              {/* User Management Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Users Table */}
                <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                  <div className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                    <Users size={18} />
                    <span>User Directory & Role Permissions</span>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map(u => (
                          <tr key={u.id}>
                            <td>#{u.id}</td>
                            <td style={{ fontWeight: 700 }}>{u.username}</td>
                            <td>{u.email}</td>
                            <td>
                              <select
                                value={u.role}
                                onChange={(e) => changeUserRole(u.id, e.target.value)}
                                style={{ height: '28px', padding: '0 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                                disabled={u.id === currentUser?.id}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                                {u.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.last_login}</td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <button
                                  className="btn-outline-sm"
                                  style={{ height: '28px', padding: '0 0.6rem', fontSize: '0.75rem' }}
                                  onClick={() => toggleUserStatus(u.id)}
                                  disabled={u.id === currentUser?.id}
                                >
                                  {u.is_active ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  className="btn-danger"
                                  style={{ height: '28px', width: '28px', padding: 0 }}
                                  onClick={() => deleteUser(u.id)}
                                  disabled={u.id === currentUser?.id}
                                  title="Delete user"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create New User Box */}
                <div className="glass-card" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                    <UserPlus size={18} />
                    <span>Create User Account</span>
                  </div>
                  <form onSubmit={handleAdminCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Username"
                      value={newAdminUser.username}
                      onChange={(e) => setNewAdminUser({ ...newAdminUser, username: e.target.value })}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newAdminUser.email}
                      onChange={(e) => setNewAdminUser({ ...newAdminUser, email: e.target.value })}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={newAdminUser.password}
                      onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
                      required
                    />
                    <select
                      value={newAdminUser.role}
                      onChange={(e) => setNewAdminUser({ ...newAdminUser, role: e.target.value })}
                    >
                      <option value="user">User Role</option>
                      <option value="admin">Admin Role</option>
                    </select>
                    <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                      <span>Create Account</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Security Audit Trail Log Table */}
              <div className="glass-card">
                <div className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                  <Activity size={18} />
                  <span>Real-Time Security & Audit Event Logs</span>
                </div>
                <div className="table-responsive" style={{ maxHeight: '350px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Event Details</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAuditLogs.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.timestamp}</td>
                          <td style={{ fontWeight: 700 }}>{l.username}</td>
                          <td><span className="badge badge-purple">{l.action}</span></td>
                          <td>{l.details}</td>
                          <td style={{ fontSize: '0.75rem' }}>{l.ip_address}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </div>
          ) : (
            /* RESTRICTED ACCESS SCREEN FOR NON-ADMIN */
            <div className="glass-card modal-dialog-animate" style={{ textAlign: 'center', padding: '3.5rem 2rem', maxWidth: '580px', margin: '3rem auto' }}>
              <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '50%', marginBottom: '1.25rem', color: 'var(--danger)' }}>
                <ShieldAlert size={46} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.5rem' }}>Access Restricted</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                The Enterprise Security & Administration Vault requires verified <code>admin</code> credentials.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn-primary" onClick={() => setActiveTab('overview')}>
                  <span>Return to Overview</span>
                </button>
                <button className="btn-secondary" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
                  <LogIn size={15} />
                  <span>Sign In as Admin</span>
                </button>
              </div>
            </div>
          )
        ) : !dataSummary ? (
          /* Empty State / Upload Landing Zone */
          <div className="glass-card animate-fade" style={{ textAlign: 'center', padding: '3.5rem 2rem', margin: '2rem auto', maxWidth: '880px' }}>
            <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', marginBottom: '1.25rem' }}>
              <BrainCircuit size={48} color="var(--accent-primary)" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Enterprise Data Intelligence & Analytical Studio
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '620px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
              Upload any CSV or Excel dataset to unlock automated quality auditing, Isolation Forest anomaly radar, predictive machine learning scenario simulators, hypothesis testing, and polynomial forecasting.
            </p>

            {/* Quick 3-Step Flow Ribbon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              flexWrap: 'wrap',
              padding: '0.55rem 1.15rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              maxWidth: '680px',
              margin: '0 auto 2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span className="guide-step-num" style={{ width: '18px', height: '18px', fontSize: '0.7rem' }}>1</span>
                <span>Connect Data</span>
              </div>
              <ArrowRight size={13} color="var(--text-muted)" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span className="guide-step-num" style={{ width: '18px', height: '18px', fontSize: '0.7rem' }}>2</span>
                <span>Instant Profiling</span>
              </div>
              <ArrowRight size={13} color="var(--text-muted)" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span className="guide-step-num" style={{ width: '18px', height: '18px', fontSize: '0.7rem' }}>3</span>
                <span>AI Insights & ML</span>
              </div>
              <button
                className="btn-outline-sm"
                style={{ height: '24px', padding: '0 0.55rem', fontSize: '0.725rem', gap: '0.25rem', marginLeft: '0.35rem' }}
                onClick={() => setShowCatalogModal(true)}
              >
                <BookOpen size={12} color="var(--accent-primary)" />
                <span>Playbook</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem', textAlign: 'left' }}>
              {sampleDatasets.map(s => (
                <div
                  key={s.id}
                  className="glass-card"
                  style={{ cursor: 'pointer', padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  onClick={() => loadSample(s.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</span>
                    <ArrowRight size={16} color="var(--accent-primary)" />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.description}</p>
                </div>
              ))}
            </div>

            <label className="dropzone" style={{ maxWidth: '480px', margin: '0 auto' }}>
              <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
              <UploadCloud size={36} color="var(--accent-primary)" />
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Drop your CSV or Excel file here</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-detection for missing values, types, & distributions</div>
            </label>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW & DEEP PROFILER TAB */}
            {activeTab === 'overview' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="HEALTH & PROFILING"
                  title="Executive Data Audit, Quality Health & Statistical Distribution Profiler"
                  purpose="Assess dataset completeness, inspect distribution asymmetry (skewness and kurtosis), analyze interquartile ranges, and audit raw records."
                  steps={[
                    { title: "Audit KPI Cards", desc: "Inspect total records, detected dimensions, overall Data Health score, and flagged 3σ deviations." },
                    { title: "Review Statistical Profiler", desc: "Evaluate mean, median, IQR bounds, distribution skewness (>0 right-skewed, <0 left-skewed), and kurtosis tail-weights." },
                    { title: "Search & Purge Records", desc: "Use the live data grid search bar to locate specific entries, or safely purge invalid records." }
                  ]}
                  expected="A Data Health score >= 85% indicates analytics-grade data. Skewness within [-0.5, +0.5] indicates near-normal distribution."
                />

                <div className="kpi-grid">
                  <div className="kpi-card">
                    <span className="kpi-label">TOTAL RECORDS</span>
                    <span className="kpi-val">{dataSummary.rows.toLocaleString()}</span>
                    <span className="kpi-sub">Data Rows</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">DIMENSIONS</span>
                    <span className="kpi-val">{dataSummary.columns.length}</span>
                    <span className="kpi-sub">Columns Loaded</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">DATA HEALTH</span>
                    <span className="kpi-val" style={{ color: qualityData?.score > 85 ? 'var(--success)' : 'var(--warning)' }}>
                      {qualityData ? `${qualityData.score}%` : 'Auditing...'}
                    </span>
                    <span className="kpi-sub">{qualityData?.health || 'Quality Check'}</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">OUTLIERS FLAGGED</span>
                    <span className="kpi-val" style={{ color: qualityData?.outliers > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      {qualityData?.outliers ?? 0}
                    </span>
                    <span className="kpi-sub">&gt; 3σ deviations</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">MEMORY FOOTPRINT</span>
                    <span className="kpi-val">{deepProfile ? `${deepProfile.memory_usage_mb} MB` : '< 1 MB'}</span>
                    <span className="kpi-sub">Active buffer</span>
                  </div>
                </div>

                {qualityData?.recommendations?.length > 0 && (
                  <div className="glass-card" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      <Sparkles size={18} />
                      <span>Automated Data Quality Audit Insights</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {qualityData.recommendations.map((rec, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={15} color="var(--success)" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deepProfile && (
                  <div className="glass-card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">🔬 Deep Column Statistical Profiler</div>
                        <div className="card-subtitle">Comprehensive distribution metrics, skewness, kurtosis, and quartiles</div>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Column</th>
                            <th>Data Type</th>
                            <th>Missing %</th>
                            <th>Unique</th>
                            <th>Mean</th>
                            <th>Median</th>
                            <th>Min / Max</th>
                            <th>Skewness</th>
                            <th>Kurtosis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deepProfile.profiles.map(p => (
                            <tr key={p.column}>
                              <td style={{ fontWeight: 700 }}>{p.column}</td>
                              <td><span className="badge badge-purple">{p.dtype}</span></td>
                              <td>
                                {p.missing_pct > 0 ? (
                                  <span className="badge badge-warning">{p.missing_pct}%</span>
                                ) : (
                                  <span className="badge badge-success">0%</span>
                                )}
                              </td>
                              <td>{p.unique_count}</td>
                              <td>{p.mean != null ? p.mean.toLocaleString() : '-'}</td>
                              <td>{p.median != null ? p.median.toLocaleString() : '-'}</td>
                              <td>
                                {p.min != null ? `${p.min} → ${p.max}` : Object.keys(p.top_values || {}).slice(0, 2).join(', ')}
                              </td>
                              <td>
                                {p.skewness != null ? (
                                  <span style={{ color: Math.abs(p.skewness) > 1 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                                    {p.skewness}
                                  </span>
                                ) : '-'}
                              </td>
                              <td>{p.kurtosis != null ? p.kurtosis : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">📋 Live Data Grid</div>
                      <div className="card-subtitle">Interactive sample records with inline deletion and pagination</div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search records..."
                      value={tableSearch}
                      onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: '220px' }}
                    />
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          {dataSummary.columns.map(c => <th key={c}>{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <button
                                className="btn-danger"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                onClick={async () => {
                                  await axios.post(`${API_BASE}/crud`, { action: 'delete_row', index: row.index || idx });
                                  refreshAllAnalytics();
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                            {dataSummary.columns.map(c => (
                              <td key={c}>{row[c] !== null && row[c] !== undefined ? String(row[c]) : ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Showing {Math.min(filteredTableRows.length, (tablePage - 1) * rowsPerPage + 1)} - {Math.min(filteredTableRows.length, tablePage * rowsPerPage)} of {filteredTableRows.length} rows
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        disabled={tablePage === 1}
                        onClick={() => setTablePage(p => p - 1)}
                      >
                        Prev
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        disabled={tablePage * rowsPerPage >= filteredTableRows.length}
                        onClick={() => setTablePage(p => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VISUAL STUDIO TAB */}
            {activeTab === 'visuals' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="MULTIDIMENSIONAL VISUALIZATION"
                  title="Dynamic Visual Studio & Pearson Correlation Matrix Heatmap"
                  purpose="Explore structural business patterns across 6 visualization types and isolate significant linear and inverse inter-variable correlations."
                  steps={[
                    { title: "Select Visual Engine", desc: "Choose Bar Chart, Line Trend, Area Chart, Donut / Pie, Radar Chart, or the full Correlation Matrix Heatmap." },
                    { title: "Configure Dimension & Metric", desc: "Map your category/time axis (X) against your target numeric metric (Y), and pick an aggregator (Sum, Mean, Count, Min, Max)." },
                    { title: "Analyze Correlation Drivers", desc: "Examine positive (+0.7 to +1.0) and inverse (-0.7 to -1.0) associations to discover hidden relationship drivers." }
                  ]}
                  expected="Positive correlations indicate mutual upward movement; negative correlations signify inverse trade-offs. 0 indicates no linear association."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">📊 Visual Studio & Dynamic Charts</div>
                      <div className="card-subtitle">Select axes and aggregation to generate real-time analytics visuals</div>
                    </div>
                    <div className="controls-toolbar">
                      <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Trend</option>
                        <option value="area">Area Chart</option>
                        <option value="pie">Pie / Donut</option>
                        <option value="radar">Radar Chart</option>
                        <option value="correlation">Correlation Heatmap</option>
                      </select>

                      {chartType !== 'correlation' && (
                        <>
                          <select value={chartX} onChange={(e) => setChartX(e.target.value)}>
                            {dataSummary.columns.map(c => <option key={c} value={c}>X: {c}</option>)}
                          </select>
                          <select value={chartY} onChange={(e) => setChartY(e.target.value)}>
                            {dataSummary.columns.map(c => <option key={c} value={c}>Y: {c}</option>)}
                          </select>
                          <select value={chartAgg} onChange={(e) => setChartAgg(e.target.value)}>
                            <option value="sum">Sum</option>
                            <option value="mean">Mean (Average)</option>
                            <option value="count">Count</option>
                            <option value="max">Max</option>
                            <option value="min">Min</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ height: '420px', width: '100%', marginTop: '1rem' }}>
                    {chartType === 'correlation' ? (
                      correlationData?.matrix ? (
                        <div className="table-responsive" style={{ maxHeight: '420px' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Feature</th>
                                {correlationData.columns.map(col => <th key={col}>{col}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {correlationData.matrix.map(row => (
                                <tr key={row.column}>
                                  <td style={{ fontWeight: 700 }}>{row.column}</td>
                                  {correlationData.columns.map(col => {
                                    const val = row[col];
                                    const isPos = val > 0;
                                    const opacity = Math.min(Math.abs(val || 0), 1);
                                    const bg = isPos
                                      ? `rgba(99, 102, 241, ${opacity * 0.7})`
                                      : `rgba(239, 68, 68, ${opacity * 0.7})`;
                                    return (
                                      <td key={col} style={{ background: bg, textAlign: 'center', fontWeight: 700 }}>
                                        {val != null ? val.toFixed(2) : '-'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No numeric columns for correlation</div>
                      )
                    ) : chartType === 'pie' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={visualChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={130}
                            paddingAngle={3}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {visualChartData.map((e, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : chartType === 'radar' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={visualChartData}>
                          <PolarGrid stroke="var(--border-color)" />
                          <PolarAngleAxis dataKey="name" stroke="var(--text-secondary)" />
                          <PolarRadiusAxis stroke="var(--text-muted)" />
                          <Radar name={chartY} dataKey="value" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.4} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : chartType === 'area' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={visualChartData}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                          <Area type="monotone" dataKey="value" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#areaGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : chartType === 'line' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={visualChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--accent-primary)' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visualChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                          <Legend />
                          <Bar dataKey="value" fill="var(--accent-primary)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {correlationData && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <div className="glass-card">
                      <div className="card-title" style={{ fontSize: '0.95rem', color: 'var(--success)' }}>
                        📈 Top Positive Associations
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {correlationData.top_positive?.map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{p.col1} ↔ {p.col2}</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+{p.r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="glass-card">
                      <div className="card-title" style={{ fontSize: '0.95rem', color: 'var(--danger)' }}>
                        📉 Top Inverse / Negative Associations
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {correlationData.top_negative?.map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{p.col1} ↔ {p.col2}</span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{p.r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. PREDICTIVE AI & SIMULATOR TAB */}
            {activeTab === 'ai_models' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="SUPERVISED MACHINE LEARNING"
                  title="Predictive AI Modeling Engine & Dynamic 'What-If' Scenario Simulator"
                  purpose="Train supervised regression or classification algorithms, benchmark models via cross-validation leaderboard, and simulate outcome sensitivity in real time."
                  steps={[
                    { title: "Designate Target Objective", desc: "Select the metric or outcome column you wish to forecast or categorize from the target dropdown." },
                    { title: "Train & Benchmark Algorithms", desc: "Run Random Forest, Gradient Boosting, or Linear/Logistic models, or benchmark all via the Model Leaderboard." },
                    { title: "Simulate Real-Time Scenarios", desc: "Adjust interactive parameter sliders to simulate how changes in input drivers impact the predicted outcome." }
                  ]}
                  expected="Regression models minimize MAE and RMSE (lower error is superior); classification models maximize Accuracy and F1-Score (closer to 100% is ideal)."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">🤖 Predictive Machine Learning Engine</div>
                      <div className="card-subtitle">Train regression or classification models and test real-time scenarios</div>
                    </div>
                    <div className="controls-toolbar">
                      <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)}>
                        {dataSummary.columns.map(c => <option key={c} value={c}>Target: {c}</option>)}
                      </select>
                      <select value={modelAlgo} onChange={(e) => setModelAlgo(e.target.value)}>
                        <option value="random_forest">Random Forest Ensemble</option>
                        <option value="gradient_boosting">Gradient Boosting</option>
                        <option value="linear">Ridge / Linear / Logistic</option>
                      </select>
                      <button className="btn-primary" onClick={runModelTraining} disabled={isProcessing}>
                        <Play size={15} />
                        <span>{isProcessing ? 'Training...' : 'Train Model'}</span>
                      </button>
                      <button className="btn-secondary" onClick={runLeaderboard} disabled={isProcessing}>
                        <span>Leaderboard</span>
                      </button>
                    </div>
                  </div>

                  {trainResult && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                      <div className="kpi-card" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <span className="kpi-label">MODEL CONFIDENCE & FIT</span>
                        <span className="kpi-val" style={{ color: 'var(--accent-primary)' }}>
                          {trainResult.accuracy != null ? `${(trainResult.accuracy * 100).toFixed(1)}%` : 'Trained'}
                        </span>
                        <span className="kpi-sub">
                          {trainResult.type === 'regression' ? `MAE: ${trainResult.mae} | RMSE: ${trainResult.rmse}` : `F1 Score: ${(trainResult.f1_score * 100).toFixed(1)}%`}
                        </span>
                      </div>

                      <div className="glass-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>FEATURE IMPORTANCE</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {trainResult.top_features?.slice(0, 5).map((f, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span>{f.name}</span>
                              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{(f.importance * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {leaderboard && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>🏆 Model Leaderboard Comparison</div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Algorithm</th>
                              <th>Primary Score</th>
                              <th>Secondary Metric</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.map((m, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 700 }}>#{i + 1}</td>
                                <td>{m.name}</td>
                                <td><span className="badge badge-success">{(m.score * 100).toFixed(1)}% ({m.metric_label})</span></td>
                                <td>{m.mae != null ? `MAE: ${m.mae}` : m.f1 != null ? `F1: ${(m.f1 * 100).toFixed(1)}%` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {trainResult && (
                  <div className="glass-card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">🎛️ Interactive "What-If" Scenario Simulator</div>
                        <div className="card-subtitle">Adjust input sliders to see real-time machine learning predictions</div>
                      </div>
                      {simOutput && (
                        <div style={{ textAlign: 'right', background: 'rgba(99, 102, 241, 0.15)', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PREDICTED {targetCol}</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {simOutput.formatted || simOutput.prediction}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                      {trainResult.simulator_inputs?.map(inp => (
                        <div key={inp.name} className="slider-container">
                          <div className="slider-header">
                            <span>{inp.name}</span>
                            <span className="slider-val">{simInputs[inp.name] ?? inp.default}</span>
                          </div>
                          {inp.type === 'numeric' ? (
                            <input
                              type="range"
                              min={inp.min}
                              max={inp.max}
                              step={inp.step}
                              value={simInputs[inp.name] ?? inp.default}
                              onChange={(e) => handleSimInputChange(inp.name, parseFloat(e.target.value))}
                            />
                          ) : (
                            <select
                              value={simInputs[inp.name] ?? inp.default}
                              onChange={(e) => handleSimInputChange(inp.name, e.target.value)}
                            >
                              {inp.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. ANOMALY & OUTLIER RADAR TAB */}
            {activeTab === 'anomalies' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="UNSUPERVISED OUTLIER DETECTION"
                  title="Isolation Forest Multi-Dimensional Anomaly & Risk Radar"
                  purpose="Isolate fraudulent, corrupted, or operational irregularities using high-dimensional Isolation Forest decision trees projected onto 2D PCA space."
                  steps={[
                    { title: "Set Contamination Threshold", desc: "Adjust the contamination rate slider (1% - 20%) to match expected operational outlier tolerance (default: 5%)." },
                    { title: "Execute Radar Scan", desc: "Click 'Scan Anomalies' to calculate multi-attribute anomaly scores and project data points into PCA components." },
                    { title: "Audit & Purge Contaminants", desc: "Review top anomalous records sorted by severity index; purge verified contaminants with 1-click cleaning." }
                  ]}
                  expected="Red cross markers represent statistically severe outliers that deviate significantly from standard operational density clusters."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">🔍 Isolation Forest Multi-Dimensional Anomaly Radar</div>
                      <div className="card-subtitle">Identifies multi-attribute irregular patterns and anomalies</div>
                    </div>
                    <div className="controls-toolbar">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', padding: '0 0.8rem', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contamination:</span>
                        <input
                          type="range"
                          min="0.01"
                          max="0.20"
                          step="0.01"
                          value={contamination}
                          onChange={(e) => setContamination(e.target.value)}
                          style={{ width: '100px', height: 'auto' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', minWidth: '35px' }}>
                          {(contamination * 100).toFixed(0)}%
                        </span>
                      </div>
                      <button className="btn-primary" onClick={runAnomalyDetection} disabled={isProcessing}>
                        <RadarIcon size={15} />
                        <span>Scan Anomalies</span>
                      </button>
                      {anomalyData?.anomaly_count > 0 && (
                        <button className="btn-danger" onClick={purgeAnomalies} disabled={isProcessing}>
                          <Trash2 size={15} />
                          <span>Purge Outliers</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {anomalyData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                      <div className="kpi-grid">
                        <div className="kpi-card">
                          <span className="kpi-label">SAMPLES SCANNED</span>
                          <span className="kpi-val">{anomalyData.total_samples}</span>
                        </div>
                        <div className="kpi-card">
                          <span className="kpi-label">ANOMALIES DETECTED</span>
                          <span className="kpi-val" style={{ color: 'var(--danger)' }}>{anomalyData.anomaly_count}</span>
                        </div>
                        <div className="kpi-card">
                          <span className="kpi-label">OUTLIER RATE</span>
                          <span className="kpi-val">{anomalyData.contamination_pct}%</span>
                        </div>
                      </div>

                      <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="x" name="PCA Axis 1" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis dataKey="y" name="PCA Axis 2" stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip
                              content={({ payload }) => {
                                if (payload && payload[0]) {
                                  const d = payload[0].payload;
                                  return (
                                    <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                      <div style={{ fontWeight: 700, color: d.is_anomaly ? 'var(--danger)' : 'var(--success)' }}>
                                        {d.is_anomaly ? '🚨 Anomaly Record' : '✅ Normal Record'}
                                      </div>
                                      <div>Score: {d.anomaly_score}</div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Scatter
                              name="Normal Points"
                              data={anomalyData.points.filter(p => !p.is_anomaly)}
                              fill="var(--accent-primary)"
                              fillOpacity={0.6}
                            />
                            <Scatter
                              name="Anomalies"
                              data={anomalyData.points.filter(p => p.is_anomaly)}
                              fill="var(--danger)"
                              shape="cross"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="glass-card">
                        <div className="card-title" style={{ fontSize: '0.95rem' }}>🚨 Top Anomalous Records Flagged</div>
                        <div className="table-responsive" style={{ marginTop: '0.75rem' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Severity Index</th>
                                <th>Row #</th>
                                {dataSummary.columns.slice(0, 6).map(c => <th key={c}>{c}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {anomalyData.top_anomalies.map((row, i) => (
                                <tr key={i}>
                                  <td><span className="badge badge-danger">{row._severity}</span></td>
                                  <td>#{row._row_index}</td>
                                  {dataSummary.columns.slice(0, 6).map(c => <td key={c}>{String(row[c] ?? '')}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Click "Scan Anomalies" to initiate the Isolation Forest detector.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. TREND FORECASTING TAB */}
            {activeTab === 'forecast' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="PREDICTIVE TIME-SERIES"
                  title="Polynomial Trend Extrapolation & Confidence Interval Forecasting"
                  purpose="Project numeric business metrics into future operational horizons with rolling moving-average smoothing and 95% statistical confidence bounds."
                  steps={[
                    { title: "Select Target Metric", desc: "Pick any numeric metric column (e.g. Sales, Revenue, Units, Traffic, Temperature)." },
                    { title: "Configure Forecast Depth", desc: "Select projection horizon (+5, +10, or +20 forward time steps)." },
                    { title: "Evaluate Projections & Growth", desc: "Assess Historical Baseline, Projected End Value, Projected Growth %, and Upper/Lower 95% confidence intervals." }
                  ]}
                  expected="Narrow 95% confidence bands indicate high historical predictability; wider bands highlight greater underlying volatility."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">🔮 Polynomial Time-Series & Trend Forecasting</div>
                      <div className="card-subtitle">Project metrics into future periods with 95% confidence intervals</div>
                    </div>
                    <div className="controls-toolbar">
                      <select value={forecastMetric} onChange={(e) => setForecastMetric(e.target.value)}>
                        {(numericColumns.length > 0 ? numericColumns : dataSummary.columns).map(c => (
                          <option key={c} value={c}>Metric: {c}</option>
                        ))}
                      </select>
                      <select value={forecastSteps} onChange={(e) => setForecastSteps(e.target.value)}>
                        <option value="5">Forecast +5 Steps</option>
                        <option value="10">Forecast +10 Steps</option>
                        <option value="20">Forecast +20 Steps</option>
                      </select>
                      <button className="btn-primary" onClick={runForecast} disabled={isProcessing}>
                        <TrendingUp size={15} />
                        <span>Generate Forecast</span>
                      </button>
                    </div>
                  </div>

                  {forecastData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                      <div className="kpi-grid">
                        <div className="kpi-card">
                          <span className="kpi-label">HISTORICAL BASELINE</span>
                          <span className="kpi-val">{forecastData.historical_mean.toLocaleString()}</span>
                        </div>
                        <div className="kpi-card">
                          <span className="kpi-label">PROJECTED END VALUE</span>
                          <span className="kpi-val" style={{ color: 'var(--accent-primary)' }}>
                            {forecastData.forecast_final.toLocaleString()}
                          </span>
                        </div>
                        <div className="kpi-card">
                          <span className="kpi-label">PROJECTED GROWTH</span>
                          <span className="kpi-val" style={{ color: forecastData.projected_growth_pct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {forecastData.projected_growth_pct > 0 ? `+${forecastData.projected_growth_pct}%` : `${forecastData.projected_growth_pct}%`}
                          </span>
                        </div>
                      </div>

                      <div style={{ height: '400px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={forecastData.chart_data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} dot={false} name="Actual Recorded" />
                            <Line type="monotone" dataKey="moving_avg" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Moving Average" />
                            <Line type="monotone" dataKey="forecast" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} name="Projected Forecast" />
                            <Line type="monotone" dataKey="upper_ci" stroke="rgba(244, 63, 94, 0.3)" strokeDasharray="2 2" dot={false} name="Upper 95% Bound" />
                            <Line type="monotone" dataKey="lower_ci" stroke="rgba(244, 63, 94, 0.3)" strokeDasharray="2 2" dot={false} name="Lower 95% Bound" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Select a metric column and click "Generate Forecast".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. HYPOTHESIS TESTING TAB */}
            {activeTab === 'hypothesis' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="INFERENTIAL HYPOTHESIS LAB"
                  title="Scientific Significance Testing, Welch's T-Test, ANOVA & Chi-Square"
                  purpose="Rigorously prove whether observable metric differences or categorical dependencies are statistically significant rather than random noise."
                  steps={[
                    { title: "Select Testing Methodology", desc: "Choose Welch's Two-Sample T-Test (2 numeric means), One-Way ANOVA (3+ groups), Chi-Square (categorical independence), or Pearson r significance." },
                    { title: "Select Variable Columns", desc: "Assign Column 1 and Column 2 to establish your null hypothesis (H₀: No Difference) vs alternative (H₁: Significant Difference)." },
                    { title: "Evaluate the p-Value Verdict", desc: "Click 'Run Test' to generate test statistics, degrees of freedom, and automated plain-English business conclusions." }
                  ]}
                  expected="p < 0.05 rejects the null hypothesis (statistically significant difference confirmed). p >= 0.05 indicates the observed difference may be random chance."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">⚖️ Scientific Hypothesis Testing Lab</div>
                      <div className="card-subtitle">Run formal tests to establish statistical significance (p &lt; 0.05)</div>
                    </div>
                    <div className="controls-toolbar">
                      <select value={testType} onChange={(e) => setTestType(e.target.value)}>
                        <option value="ttest">Welch's Two-Sample T-Test</option>
                        <option value="anova">One-Way ANOVA (F-Test)</option>
                        <option value="chi2">Chi-Square Test of Independence</option>
                        <option value="correlation">Pearson / Spearman Significance</option>
                      </select>
                      <select value={testCol1} onChange={(e) => setTestCol1(e.target.value)}>
                        {dataSummary.columns.map(c => <option key={c} value={c}>Col 1: {c}</option>)}
                      </select>
                      <select value={testCol2} onChange={(e) => setTestCol2(e.target.value)}>
                        {dataSummary.columns.map(c => <option key={c} value={c}>Col 2: {c}</option>)}
                      </select>
                      <button className="btn-primary" onClick={runHypothesisTest} disabled={isProcessing}>
                        <FlaskConical size={15} />
                        <span>Run Test</span>
                      </button>
                    </div>
                  </div>

                  {testResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                      <div className="glass-card" style={{ background: testResult.is_significant ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${testResult.is_significant ? 'var(--success)' : 'var(--danger)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{testResult.test}</span>
                          <span className={`badge ${testResult.is_significant ? 'badge-success' : 'badge-danger'}`}>
                            {testResult.is_significant ? 'STATISTICALLY SIGNIFICANT (p < 0.05)' : 'NOT SIGNIFICANT (p >= 0.05)'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.5rem', fontWeight: 600 }}>
                          {testResult.conclusion}
                        </p>
                      </div>

                      <div className="kpi-grid">
                        <div className="kpi-card">
                          <span className="kpi-label">TEST STATISTIC</span>
                          <span className="kpi-val">{testResult.statistic ?? testResult.pearson_r}</span>
                        </div>
                        <div className="kpi-card">
                          <span className="kpi-label">P-VALUE</span>
                          <span className="kpi-val" style={{ color: testResult.is_significant ? 'var(--success)' : 'var(--danger)' }}>
                            {testResult.p_value ?? testResult.pearson_p}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Configure your hypothesis variables and click "Run Test".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. PARETO 80/20 TAB */}
            {activeTab === 'pareto' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="CONCENTRATION & VITAL FEW"
                  title="Pareto 80/20 Rule Analysis & Cumulative Concentration Curve"
                  purpose="Identify the vital 20% of contributors (customers, products, regions, error types) generating 80% of total business volume or impact."
                  steps={[
                    { title: "Select Dimension", desc: "Choose the categorical entity to analyze (e.g., Customer Segment, SKU, Department, Channel)." },
                    { title: "Select Volume Metric", desc: "Choose the metric to sum (e.g., Revenue, Units, Cost) or leave blank for transaction occurrence frequency." },
                    { title: "Locate the 80% Threshold", desc: "Observe the pink cumulative curve intersecting the 80% line to isolate high-leverage drivers from the trivial many." }
                  ]}
                  expected="Entities to the left of the 80% cumulative cutoff are your vital few. Focus operational optimization and resources on these top contributors."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">📐 80/20 Pareto & Concentration Analysis</div>
                      <div className="card-subtitle">Discover the vital 20% drivers contributing to 80% of total metric volume</div>
                    </div>
                    <div className="controls-toolbar">
                      <select value={paretoDim} onChange={(e) => setParetoDim(e.target.value)}>
                        {dataSummary.columns.map(c => <option key={c} value={c}>Dimension: {c}</option>)}
                      </select>
                      <select value={paretoMetric} onChange={(e) => setParetoMetric(e.target.value)}>
                        <option value="">Count / Frequency</option>
                        {(numericColumns.length > 0 ? numericColumns : dataSummary.columns).map(c => (
                          <option key={c} value={c}>Metric: {c}</option>
                        ))}
                      </select>
                      <button className="btn-primary" onClick={runPareto} disabled={isProcessing}>
                        <PieIcon size={15} />
                        <span>Analyze Pareto</span>
                      </button>
                    </div>
                  </div>

                  {paretoData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                      <div className="glass-card" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--accent-primary)' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)' }}>💡 PARETO RULE FINDING</span>
                        <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {paretoData.pareto_summary}
                        </p>
                      </div>

                      <div style={{ height: '380px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={paretoData.items}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="dimension" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--accent-primary)" fontSize={11} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '10px' }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="value" fill="var(--accent-primary)" name={paretoData.metric} radius={[6, 6, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="cumulative_pct" stroke="#ec4899" strokeWidth={3} name="Cumulative %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Select a dimension and metric, then click "Analyze Pareto".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. DATA ENGINEERING STUDIO TAB */}
            {activeTab === 'engineering' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ModuleGuide
                  badge="FEATURE PIPELINE & HYGIENE"
                  title="Feature Engineering, Mathematical Scalers & 1-Click Automated Hygiene"
                  purpose="Transform skewed feature distributions, standardize variance across columns, winsorize extreme tails, and execute automated data cleansing."
                  steps={[
                    { title: "Select Feature & Method", desc: "Pick a column and select Log1p (for right-skewed data), Z-Score (μ=0, σ=1), Min-Max [0,1], or Winsorization (capping at 3σ)." },
                    { title: "Apply Transformation", desc: "Click 'Apply Transform' to compute and append the engineered feature directly into the active working dataframe." },
                    { title: "Execute 1-Click Hygiene", desc: "Click 'Run Full Data Cleaning' to auto-impute null values (median/mode), deduplicate rows, and standardize headers." }
                  ]}
                  expected="Normalized and scaled features stabilize machine learning training, eliminate scale dominance, and prevent gradient divergence."
                />

                <div className="glass-card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">🛠️ Feature Engineering & Data Transformations</div>
                      <div className="card-subtitle">Apply mathematical scalers, log transforms, and outlier winsorization</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                    {/* Transformation Card */}
                    <div className="glass-card" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Apply Mathematical Transformation</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>TARGET COLUMN</label>
                            <select value={feCol} onChange={(e) => setFeCol(e.target.value)} style={{ width: '100%' }}>
                              {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>TRANSFORMATION METHOD</label>
                            <select value={feAction} onChange={(e) => setFeAction(e.target.value)} style={{ width: '100%' }}>
                              <option value="log_transform">Log1p Transformation (log(x+1))</option>
                              <option value="standard_scale">Z-Score Standard Scaling (μ=0, σ=1)</option>
                              <option value="minmax_scale">Min-Max Scaling [0, 1]</option>
                              <option value="cap_outliers">Winsorize / Cap Outliers (3σ bound)</option>
                              <option value="binning">Discretize into Quantile Bins</option>
                              <option value="extract_date">Extract Date Components</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <button className="btn-primary" onClick={applyFeatureEngineering} disabled={isProcessing} style={{ width: '100%', marginTop: '1.25rem' }}>
                        <span>Apply Transform</span>
                      </button>
                    </div>

                    {/* Data Hygiene Card */}
                    <div className="glass-card" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>1-Click Automated Data Hygiene</div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '0.85rem' }}>
                          Performs an exhaustive data audit: auto-imputes missing numeric fields with the median, fills missing categories with mode, eliminates duplicate rows, and normalizes column headers.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
                            <CheckCircle2 size={14} /> <span>Handles Null & NaN Values</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--info)' }}>
                            <CheckCircle2 size={14} /> <span>Deduplicates Records</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-secondary)' }}>
                            <CheckCircle2 size={14} /> <span>Preserves Original Types</span>
                          </div>
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={handleClean} style={{ width: '100%', marginTop: '1.25rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                        <Sparkles size={16} color="var(--accent-primary)" />
                        <span>Run Full Data Cleaning</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. FULL-PAGE AI COPILOT CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ModuleGuide
                  badge="NATURAL LANGUAGE ANALYST"
                  title="AI Copilot Data Analyst & Natural Language Query Interface"
                  purpose="Interact with your dataset conversationally to perform ad-hoc aggregations, statistical summaries, distribution checks, and automatic visual charts."
                  steps={[
                    { title: "Select a Quick Prompt", desc: "Click any prompt suggestion pill (e.g., 'Average of metric', 'Show correlation heatmap', 'Are there any outliers?')." },
                    { title: "Enter Natural Language Query", desc: "Type complex queries such as 'Which category has the highest standard deviation?' or 'Plot sales distribution'." },
                    { title: "Review Insights & Figures", desc: "Inspect the generated executive summary and dynamically rendered Python analytical charts." }
                  ]}
                  expected="Queries are dynamically translated into analytical computations on the live dataset, returning verified quantitative figures and charts."
                />

                <div className="glass-card" style={{ padding: '1rem' }}>
                  <div className="chat-drawer" style={{ height: '550px' }}>
                    <div className="chat-msg-list">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`chat-bubble ${msg.role}`}>
                          <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
                          {msg.image && (
                            <img
                              src={`data:image/png;base64,${msg.image}`}
                              alt="Analytics Visual"
                              style={{ width: '100%', maxWidth: '450px', marginTop: '0.75rem', borderRadius: '10px' }}
                            />
                          )}
                        </div>
                      ))}
                      {isProcessing && (
                        <div className="chat-bubble ai">
                          <span style={{ color: 'var(--text-muted)' }}>Thinking & calculating...</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderTop: '1px solid var(--border-color)' }}>
                      {['Average of metric', 'Show correlation heatmap', 'Are there any outliers?', 'Summarize dataset'].map(chip => (
                        <button
                          key={chip}
                          className="btn-outline-sm"
                          onClick={() => sendChatQuery(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        placeholder="Ask anything about your data..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChatQuery()}
                        style={{ flex: 1 }}
                      />
                      <button className="btn-primary" onClick={() => sendChatQuery()} disabled={isProcessing}>
                        <Send size={15} />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ALWAYS-ACCESSIBLE FLOATING AI CHATBOT WIDGET (ALL TABS) */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}>
        {!isFloatingChatOpen ? (
          <button
            onClick={() => setIsFloatingChatOpen(true)}
            className="btn-primary"
            style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, boxShadow: '0 8px 24px rgba(99, 102, 241, 0.5)' }}
            title="Open AI Analyst Assistant"
          >
            <Bot size={26} />
          </button>
        ) : (
          <div className="glass-card animate-fade" style={{ width: '380px', height: '500px', display: 'flex', flexDirection: 'column', padding: '0', boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)', border: '1px solid var(--accent-primary)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent-gradient)', padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                <Bot size={20} />
                <span>AI DataMind Assistant</span>
              </div>
              <button onClick={() => setIsFloatingChatOpen(false)} style={{ background: 'transparent', color: '#fff', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role}`} style={{ fontSize: '0.825rem', padding: '0.65rem 0.95rem' }}>
                  <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }} />
                  {msg.image && (
                    <img src={`data:image/png;base64,${msg.image}`} alt="Visual" style={{ width: '100%', marginTop: '0.5rem', borderRadius: '8px' }} />
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="chat-bubble ai" style={{ fontSize: '0.8rem' }}>
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            <div style={{ padding: '0.65rem 0.85rem', display: 'flex', gap: '0.4rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
              <input
                type="text"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatQuery()}
                style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.825rem' }}
              />
              <button className="btn-primary" onClick={() => sendChatQuery()} disabled={isProcessing} style={{ padding: '0.5rem 0.75rem' }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ANIMATED AUTHENTICATION MODAL (LOGIN / REGISTER) */}
      {showAuthModal && (
        <div className="modal-backdrop animate-fade" onClick={(e) => e.target === e.currentTarget && setShowAuthModal(false)}>
          <div className="auth-card modal-dialog-animate">
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
                  {authMode === 'login' ? <Lock size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {authMode === 'login' ? 'Sign in to access your data workspace' : 'Join DataMind AI intelligence studio'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setShowAuthModal(false); setAuthError(''); setAuthSuccess(''); }}
                style={{ background: 'transparent', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%' }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Animated Tab Mode Switcher Pill */}
            <div className="auth-toggle-pill">
              <button
                type="button"
                className={`auth-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                className={`auth-toggle-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
              >
                <UserPlus size={15} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Error Message with Shake Animation */}
            {authError && (
              <div className="animate-shake" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {/* Success Message Banner */}
            {authSuccess && (
              <div className="animate-fade" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', color: 'var(--success)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {authMode === 'register' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    EMAIL ADDRESS
                  </label>
                  <div className="input-icon-group">
                    <Mail size={16} className="input-lead-icon" />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  USERNAME
                </label>
                <div className="input-icon-group">
                  <User size={16} className="input-lead-icon" />
                  <input
                    type="text"
                    placeholder="Username or email"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  PASSWORD
                </label>
                <div className="input-icon-group">
                  <Lock size={16} className="input-lead-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="input-trail-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', height: '42px', marginTop: '0.4rem', fontSize: '0.9rem', fontWeight: 700 }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>{authMode === 'login' ? 'Sign In to Workspace' : 'Create Secure Account'}</span>
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {authMode === 'login' ? (
                <div>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
                    style={{ background: 'transparent', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Register here
                  </button>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    Demo Accounts: <code>admin</code> / <code>admin123</code> | <code>analyst</code> / <code>analyst123</code>
                  </div>
                </div>
              ) : (
                <div>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                    style={{ background: 'transparent', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Sign in here
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE DATA DECISION CATALOG & FILTER PLAYBOOK MODAL */}
      {showCatalogModal && (
        <div className="modal-backdrop animate-fade" onClick={(e) => e.target === e.currentTarget && setShowCatalogModal(false)}>
          <div className="playbook-modal-card modal-dialog-animate">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', pb: '1rem', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
                  <BookOpen size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                    Data Decision Catalog & Filter Playbook
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Quick reference: Match your column types to the right filters, algorithms, and analytical tabs.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%' }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Switcher Pill */}
            <div className="playbook-nav-pill">
              <button
                type="button"
                className={`playbook-nav-btn ${catalogSection === 'types' ? 'active' : ''}`}
                onClick={() => setCatalogSection('types')}
              >
                <Database size={14} />
                <span>By Data Type (What You Have)</span>
              </button>
              <button
                type="button"
                className={`playbook-nav-btn ${catalogSection === 'tabs' ? 'active' : ''}`}
                onClick={() => setCatalogSection('tabs')}
              >
                <Sliders size={14} />
                <span>By Analytical Tab (What Filters to Pick)</span>
              </button>
              <button
                type="button"
                className={`playbook-nav-btn ${catalogSection === 'goals' ? 'active' : ''}`}
                onClick={() => setCatalogSection('goals')}
              >
                <Target size={14} />
                <span>By Business Goal (What You Want)</span>
              </button>
            </div>

            {/* Section 1: BY DATA TYPE */}
            {catalogSection === 'types' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade">
                <div className="playbook-grid-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="playbook-tag playbook-tag-cat">Categorical / Text</span>
                      <strong style={{ fontSize: '0.9rem' }}>Names, Labels, Groups, Categories</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>e.g. Department, City, Product_Type, Customer_Segment, Gender</span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Where to use in DataMind:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                      <li><strong>Visual Studio:</strong> Set as <code>X-Axis</code> (Dimension) with Bar or Pie charts.</li>
                      <li><strong>Pareto 80/20:</strong> Set as <code>Dimension</code> to isolate top driver segments.</li>
                      <li><strong>Hypothesis Lab:</strong> Set as <code>Col 1 (Group)</code> in ANOVA to test if categories perform differently.</li>
                    </ul>
                    <div style={{ marginTop: '0.4rem', color: 'var(--danger)', fontSize: '0.775rem' }}>
                      ⚠️ <em>Rule of Thumb:</em> Never set as Y-Axis with "Sum" aggregator, and never set as a Forecasting metric.
                    </div>
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="playbook-tag playbook-tag-num">Continuous Numeric</span>
                      <strong style={{ fontSize: '0.9rem' }}>Amounts, Counts, Measurements, Money</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>e.g. Revenue, Price, Salary, Quantity, Age, Temperature, Score</span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Where to use in DataMind:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                      <li><strong>Visual Studio:</strong> Set as <code>Y-Axis</code> (Metric). Use <code>Sum</code> for totals, <code>Mean</code> for averages.</li>
                      <li><strong>Predictive AI:</strong> Set as <code>Target Column</code> for continuous Regression predictions.</li>
                      <li><strong>Forecasting:</strong> Set as <code>Metric</code> to extrapolate future trajectory into upcoming intervals.</li>
                      <li><strong>Hypothesis Lab:</strong> Set as <code>Col 1 & Col 2</code> for Welch's Two-Sample T-Test.</li>
                      <li><strong>Data Engineering:</strong> If skewness &gt; 1 in Overview, apply <code>Log1p Transform</code> or <code>Z-Score Standard Scaling</code>.</li>
                    </ul>
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="playbook-tag playbook-tag-date">Date & Time</span>
                      <strong style={{ fontSize: '0.9rem' }}>Timestamps, Dates, Months, Quarters</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>e.g. Order_Date, Created_At, Year, Month, Period</span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Where to use in DataMind:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                      <li><strong>Visual Studio:</strong> Set as <code>X-Axis</code> with <code>Line Trend</code> or <code>Area Chart</code> for chronological time-series.</li>
                      <li><strong>Data Engineering:</strong> Choose <code>Extract Date Components</code> to decompose into Day, Month, Year, and Day of Week for ML models.</li>
                    </ul>
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="playbook-tag playbook-tag-bin">Binary / Class Flags</span>
                      <strong style={{ fontSize: '0.9rem' }}>Two-State Outcomes & Status Indicators</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>e.g. Churned (0/1), Defaulted (Yes/No), Approved (True/False)</span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong>Where to use in DataMind:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                      <li><strong>Predictive AI:</strong> Set as <code>Target Column</code> for Classification. The model will calculate probability and F1 Score.</li>
                      <li><strong>Hypothesis Lab:</strong> Select <code>Chi-Square Test</code> to test whether status rates differ by group.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: BY ANALYTICAL TAB */}
            {catalogSection === 'tabs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade">
                <div className="playbook-grid-card">
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>📊 Visual Studio & Charts</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    • <strong>Bar / Pie Chart:</strong> X = Category column (e.g. Region), Y = Numeric metric (e.g. Sales), Agg = Sum (totals) or Mean (averages).<br />
                    • <strong>Line / Area Chart:</strong> X = Date or Sequence column, Y = Numeric metric, Agg = Sum.<br />
                    • <strong>Correlation Heatmap:</strong> Leave axes untouched. Automatically computes Pearson r for all numeric features simultaneously.
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>🤖 Predictive AI & What-If Simulator</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    • <strong>Target Column:</strong> The single output you want the AI to predict (e.g. Revenue for regression, or Churned for classification).<br />
                    • <strong>Algorithm:</strong> Choose <code>Random Forest</code> as the default (safest for messy real-world data). Choose <code>Gradient Boosting</code> for maximum accuracy.<br />
                    • <strong>Simulator:</strong> Move sliders to see how shifting drivers (e.g. +$100 discount, +5 years tenure) impacts the predicted outcome.
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>🔍 Anomaly Radar (Isolation Forest)</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    • <strong>Contamination Rate:</strong> Leave at default <code>5% (0.05)</code>. Increase to 10% if you expect many defective rows; decrease to 1% for strict anomaly detection.<br />
                    • <strong>Purge Outliers:</strong> Click only after verifying the flagged table to remove corrupt rows from your active session.
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>⚖️ Scientific Hypothesis Lab</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    • <strong>Welch's T-Test:</strong> Col 1 = Numeric, Col 2 = Numeric (tests if their means are significantly different).<br />
                    • <strong>One-Way ANOVA:</strong> Col 1 = Categorical group (e.g. Department), Col 2 = Numeric metric (e.g. Salary).<br />
                    • <strong>Chi-Square:</strong> Col 1 = Categorical, Col 2 = Categorical (tests independence).<br />
                    • <strong>Significance Rule:</strong> If p &lt; 0.05, the finding is statistically verified; if p &ge; 0.05, the difference may be random chance.
                  </div>
                </div>

                <div className="playbook-grid-card">
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>📐 Pareto 80/20 & Data Engineering</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    • <strong>Pareto:</strong> Dimension = Category entity (Customer, SKU, Defect), Metric = Numeric volume (Revenue, Cost) or blank for frequency.<br />
                    • <strong>1-Click Hygiene:</strong> Auto-fills missing numbers with median, missing text with mode, and removes duplicate rows.<br />
                    • <strong>Log1p Transform:</strong> Select whenever a column has a skewness score &gt; 1 in the Overview tab.
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: BY BUSINESS GOAL */}
            {catalogSection === 'goals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} className="animate-fade">
                {[
                  {
                    goal: "Identify the top 20% products or customers generating 80% of revenue",
                    tab: "Pareto 80/20 Tab",
                    filters: "Dimension = 'Product' or 'Customer_ID' | Metric = 'Revenue' | Click 'Analyze Pareto'."
                  },
                  {
                    goal: "Predict whether a customer will churn or loan will default",
                    tab: "Predictive AI Tab",
                    filters: "Target Column = 'Churn' or 'Default' | Algorithm = 'Random Forest' | Click 'Train Model'."
                  },
                  {
                    goal: "Forecast next month's sales or website visits",
                    tab: "Forecasting Tab",
                    filters: "Metric = 'Sales' or 'Visits' | Steps = '+10 Steps' | Click 'Generate Forecast'."
                  },
                  {
                    goal: "Find irregular transactions, data entry errors, or fraudulent records",
                    tab: "Anomaly Radar Tab",
                    filters: "Contamination = '5%' | Click 'Scan Anomalies' | Review flagged records in the table."
                  },
                  {
                    goal: "Prove if A/B Test Variant A drove significantly higher conversions than B",
                    tab: "Hypothesis Lab Tab",
                    filters: "Test Type = 'Welch's Two-Sample T-Test' | Col 1 = 'Metric_A' | Col 2 = 'Metric_B' | Check if p < 0.05."
                  },
                  {
                    goal: "Quickly sanitize missing values and clean bad data",
                    tab: "Data Engineering Tab",
                    filters: "Click 'Run Full Data Cleaning' (1-click automatic median/mode imputation & deduplication)."
                  }
                ].map((item, i) => (
                  <div key={i} className="playbook-grid-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>🎯 {item.goal}</strong>
                      <span className="badge badge-purple" style={{ fontSize: '0.725rem' }}>{item.tab}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <strong>Recommended Configuration:</strong> <code>{item.filters}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button className="btn-primary" onClick={() => setShowCatalogModal(false)}>
                <span>Got it, Return to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
