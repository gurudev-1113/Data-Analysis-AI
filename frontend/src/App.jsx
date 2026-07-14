import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function App() {
  const [file, setFile] = useState(null);
  const [dataSummary, setDataSummary] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! I am DataMind AI, your intelligent data analyst. Upload a dataset (CSV or Excel) and I will help you discover insights with smart visuals and predictions.' }
  ]);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [suggestions, setSuggestions] = useState([
    "Bar Chart", "Line Trend", "Pie Distribution", "How to Rename?", "How to Merge?"
  ]);
  const [chartType, setChartType] = useState('bar');
  const [activeTool, setActiveTool] = useState(null);

  const [renameData, setRenameData] = useState({ old: '', new: '' });
  const [mergeData, setMergeData] = useState({ col1: '', col2: '', new: '', op: 'concat' });
  const [createColData, setCreateColData] = useState({ col1: '', col2: '', new: '', op: 'add' });
  const [crudData, setCrudData] = useState({ index: 0, column: '', value: '', action: 'update_cell' });
  const [filterData, setFilterData] = useState({ column: '', op: '>', value: '' });
  const [predictionTarget, setPredictionTarget] = useState('');
  const [qualityData, setQualityData] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [theme, setTheme] = useState('light');
  const [proResults, setProResults] = useState({ clusters: null, comparison: null });
  const [rightTab, setRightTab] = useState('visuals');

  // Mobile: which panel is active — 'data' (left) or 'right'
  const [mobilePanel, setMobilePanel] = useState('data');

  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (dataSummary) {
      const cols = dataSummary.columns;
      const types = dataSummary.data_types;
      const numCols = cols.filter(c => types[c].includes('int') || types[c].includes('float') || types[c].includes('number'));
      const catCols = cols.filter(c => !numCols.includes(c));
      const unnamedCols = cols.filter(c => c.toLowerCase().includes('unnamed'));

      const newSuggestions = [];
      if (unnamedCols.length > 0) newSuggestions.push(`Fix ${unnamedCols[0]} name`);
      if (numCols.length > 0) newSuggestions.push(`Plot ${numCols[0]}`);
      if (numCols.length > 1) newSuggestions.push(`Trend: ${numCols[0]} vs ${numCols[1]}`);
      if (catCols.length > 0) newSuggestions.push(`Chart for ${catCols[0]}`);
      newSuggestions.push(`Summarize data`);
      setSuggestions(newSuggestions);

      if (cols.length > 0) {
        setRenameData(prev => ({ ...prev, old: cols[0] }));
        setMergeData(prev => ({ ...prev, col1: cols[0], col2: cols[1] || cols[0] }));
        setCreateColData(prev => ({ ...prev, col1: cols[0], col2: cols[1] || cols[0] }));
        setCrudData(prev => ({ ...prev, column: cols[0] }));
        setFilterData(prev => ({ ...prev, column: cols[0] }));
        setPredictionTarget(cols[0]);
      }
    }
  }, [dataSummary]);

  // ── FILE UPLOAD (input or drag-drop) ──
  const processFile = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setDataSummary(response.data.summary);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Dataset "${uploadedFile.name}" ready. I've detected ${response.data.summary.columns.length} columns. Performing quality audit and correlation analysis…`
      }]);

      fetchAdvancedInsights();

      const summaryRes = await axios.get(`${API_BASE}/summary`);
      setMessages(prev => [...prev, { role: 'ai', content: summaryRes.data.summary }]);

      // On mobile, switch to data panel after upload
      setMobilePanel('data');
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Upload failed: ' + (error.response?.data?.error || error.message) }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const fetchAdvancedInsights = async () => {
    try {
      const [qualityRes, corrRes] = await Promise.all([
        axios.get(`${API_BASE}/quality`),
        axios.get(`${API_BASE}/correlation`)
      ]);
      setQualityData(qualityRes.data);
      setCorrelationData(corrRes.data);
    } catch (err) {
      console.error("Advanced insights failed", err);
    }
  };

  const handleTransform = async (action, params) => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_BASE}/transform`, { action, ...params });
      setDataSummary(response.data.summary);
      setMessages(prev => [...prev, { role: 'ai', content: `✅ ${response.data.message}` }]);
      setActiveTool(null);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `Operation failed: ${error.response?.data?.error || error.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCRUD = async (action, params) => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_BASE}/crud`, { action, ...params });
      setDataSummary(response.data.summary);
      setMessages(prev => [...prev, { role: 'ai', content: `✅ ${response.data.message}` }]);
      setActiveTool(null);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `CRUD operation failed: ${error.response?.data?.error || error.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuery = async (manualQuery) => {
    const activeQuery = manualQuery || query;
    if (!activeQuery.trim()) return;

    const lowerQuery = activeQuery.toLowerCase();
    if (lowerQuery.includes('rename') || lowerQuery.includes('fix name')) {
      setActiveTool('rename');
      return;
    }
    if (lowerQuery.includes('merge')) {
      setActiveTool('merge');
      return;
    }

    const newMessages = [...messages, { role: 'user', content: activeQuery }];
    setMessages(newMessages);
    setQuery('');
    setIsProcessing(true);

    try {
      const response = await axios.post(`${API_BASE}/query`, { query: activeQuery });
      setMessages([...newMessages, {
        role: 'ai',
        content: response.data.answer,
        data: response.data.data,
        type: response.data.type,
        image: response.data.image
      }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'ai', content: 'Analysis failed. Try rephrasing your question.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePredict = async () => {
    if (!predictionTarget) return;

    const target = predictionTarget;
    const features = dataSummary.columns.filter(c => c !== target);

    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_BASE}/predict`, { target, features });
      setPredictionResult(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── MOBILE NAV HANDLER ──
  const handleMobileNav = (panel) => {
    setMobilePanel(panel);
  };

  // ── RIGHT PANEL CONTENT ──
  const RightPanelContent = () => (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', background: 'var(--card-bg)', padding: '0.4rem', borderRadius: '14px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
        {[
          { id: 'visuals', label: 'Visuals' },
          { id: 'tools', label: 'Tools' },
          { id: 'advanced', label: 'AI Models' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setRightTab(tab.id)}
            style={{ flex: 1, background: rightTab === tab.id ? 'var(--accent-color)' : 'transparent', color: rightTab === tab.id ? 'white' : 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.5rem 0.25rem', minHeight: '36px' }}
          >{tab.label}</button>
        ))}
      </div>

      {rightTab === 'visuals' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ marginBottom: 0 }}>Visual Insights</h2>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', flexWrap: 'wrap', gap: '2px' }}>
                {['bar', 'line', 'scatter', 'pie', 'correlation'].map(ct => (
                  <button key={ct}
                    onClick={() => setChartType(ct)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '8px', background: chartType === ct ? 'white' : 'transparent', color: chartType === ct ? 'var(--accent-color)' : '#64748b', boxShadow: chartType === ct ? 'var(--shadow-sm)' : 'none', border: 'none', textTransform: 'capitalize', minHeight: '32px' }}
                  >{ct === 'correlation' ? 'Heatmap' : ct.charAt(0).toUpperCase() + ct.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="charts-container">
              {dataSummary ? (
                <>
                  {chartType === 'correlation' && correlationData ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img src={`data:image/png;base64,${correlationData.image}`} alt="Correlation" style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: '12px' }} />
                    </div>
                  ) : chartType === 'pie' ? (() => {
                    const catCols = dataSummary.columns.filter(c => {
                      const t = dataSummary.data_types[c];
                      return !t.includes('int') && !t.includes('float') && !t.includes('number');
                    });
                    const pieCol = catCols[0];
                    if (!pieCol) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No categorical columns for pie chart</div>;
                    const counts = {};
                    dataSummary.head.forEach(r => { const v = r[pieCol]; counts[v] = (counts[v] || 0) + 1; });
                    const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));
                    const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  })() : chartType === 'scatter' ? (() => {
                    const numCols = dataSummary.columns.filter(c => {
                      const t = dataSummary.data_types[c];
                      return t.includes('int') || t.includes('float') || t.includes('number');
                    });
                    if (numCols.length < 2) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Need 2+ numeric columns for scatter</div>;
                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey={numCols[0]} name={numCols[0]} stroke="#94a3b8" fontSize={11} />
                          <YAxis dataKey={numCols[1]} name={numCols[1]} stroke="#94a3b8" fontSize={11} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name={`${numCols[0]} vs ${numCols[1]}`} data={dataSummary.head} fill="var(--accent-color)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={dataSummary.head}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey={dataSummary.columns[0]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Legend />
                          {dataSummary.columns.filter(c => {
                            const t = dataSummary.data_types[c];
                            return c !== dataSummary.columns[0] && (t.includes('int') || t.includes('float') || t.includes('number'));
                          }).slice(0, 3).map((col, i) => {
                            const fills = ['#6366f1', '#a855f7', '#10b981'];
                            return <Bar key={col} dataKey={col} fill={fills[i]} radius={[6, 6, 0, 0]} barSize={28} />;
                          })}
                        </BarChart>
                      ) : (
                        <LineChart data={dataSummary.head}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey={dataSummary.columns[0]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Legend />
                          {dataSummary.columns.filter(c => {
                            const t = dataSummary.data_types[c];
                            return c !== dataSummary.columns[0] && (t.includes('int') || t.includes('float') || t.includes('number'));
                          }).slice(0, 3).map((col, i) => {
                            const colors = ['#6366f1', '#a855f7', '#10b981'];
                            return <Line key={col} type="monotone" dataKey={col} stroke={colors[i]} strokeWidth={3} dot={{ r: 4, fill: colors[i], strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />;
                          })}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '1rem' }}>
                  <p>Upload a dataset to see visual trends</p>
                </div>
              )}
            </div>
          </div>

          {correlationData && correlationData.insights.length > 0 && (
            <div className="card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <h2>Automated Insights</h2>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {correlationData.insights.map((insight, i) => (
                  <li key={i} style={{ background: 'white', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 800 }}>💡</span>
                    <span>{insight} correlation detected.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {rightTab === 'advanced' && (
        <>
          <div className="card">
            <h2>Smart Predictions</h2>
            {dataSummary ? (
              <div className="prediction-form">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Select a target variable and we'll build a custom ML model.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>TARGET COLUMN</label>
                    <select
                      id="target-select"
                      style={{ width: '100%' }}
                      value={predictionTarget}
                      onChange={(e) => setPredictionTarget(e.target.value)}
                    >
                      {dataSummary.columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <button onClick={handlePredict} disabled={isProcessing}>
                    {isProcessing ? 'Training…' : '🚀 Train Model'}
                  </button>
                </div>
                {predictionResult && (
                  <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--accent-color)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CONFIDENCE</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{(predictionResult.accuracy * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>TYPE</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'capitalize' }}>{predictionResult.type}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CV AVG</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{(predictionResult.cv_avg * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    {predictionResult.rmse != null && (
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem' }}>
                        <span>MAE: {predictionResult.mae?.toFixed(2)}</span>
                        <span>RMSE: {predictionResult.rmse?.toFixed(2)}</span>
                      </div>
                    )}
                    {predictionResult.f1_score != null && (
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem' }}>
                        F1 Score: {(predictionResult.f1_score * 100).toFixed(1)}% &bull; Classes: {predictionResult.n_classes}
                      </div>
                    )}
                    {predictionResult.top_features && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>TOP FEATURES</p>
                        {predictionResult.top_features.map((f, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <span>{f.name}</span>
                            <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{(f.importance * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {predictionResult.importance_chart && (
                      <div style={{ marginTop: '1rem' }}>
                        <img src={`data:image/png;base64,${predictionResult.importance_chart}`} alt="Feature Importance" style={{ width: '100%', borderRadius: '12px' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center' }}>Upload data to unlock predictions</div>
            )}
          </div>

          <div className="card">
            <h2>Data Tools (PRO)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!activeTool ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button onClick={() => setActiveTool('rename')} disabled={!dataSummary} style={{ background: '#f8fafc', color: '#1e293b' }}>✏️ Rename</button>
                  <button onClick={() => setActiveTool('merge')} disabled={!dataSummary} style={{ background: '#f8fafc', color: '#1e293b' }}>🔗 Merge</button>
                  <button onClick={() => setActiveTool('create')} disabled={!dataSummary} style={{ background: '#f8fafc', color: '#1e293b' }}>🧮 Calculate</button>
                  <button onClick={() => setActiveTool('filter')} disabled={!dataSummary} style={{ background: '#f8fafc', color: '#1e293b' }}>🔍 Filter</button>
                  <button onClick={() => setActiveTool('crud')} disabled={!dataSummary} style={{ background: '#f8fafc', color: '#1e293b', gridColumn: 'span 2' }}>📋 Manage Rows</button>
                </div>
              ) : activeTool === 'rename' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <select value={renameData.old} onChange={(e) => setRenameData({ ...renameData, old: e.target.value })}>
                    {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={renameData.new} onChange={(e) => setRenameData({ ...renameData, new: e.target.value })} placeholder="New name" />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleTransform('rename', { old_name: renameData.old, new_name: renameData.new })} style={{ flex: 1 }}>Rename</button>
                    <button onClick={() => setActiveTool(null)} style={{ background: '#ef4444' }}>Back</button>
                  </div>
                </div>
              ) : activeTool === 'merge' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select style={{ flex: 1 }} value={mergeData.col1} onChange={(e) => setMergeData({ ...mergeData, col1: e.target.value })}>
                      {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select style={{ flex: 1 }} value={mergeData.col2} onChange={(e) => setMergeData({ ...mergeData, col2: e.target.value })}>
                      {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <select value={mergeData.op} onChange={(e) => setMergeData({ ...mergeData, op: e.target.value })}>
                    <option value="concat">Combine Text</option>
                    <option value="sum">Sum Numbers</option>
                  </select>
                  <input type="text" value={mergeData.new} onChange={(e) => setMergeData({ ...mergeData, new: e.target.value })} placeholder="New column name" />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleTransform('merge', { col1: mergeData.col1, col2: mergeData.col2, new_name: mergeData.new, op: mergeData.op })} style={{ flex: 1 }}>Merge</button>
                    <button onClick={() => setActiveTool(null)} style={{ background: '#ef4444' }}>Back</button>
                  </div>
                </div>
              ) : activeTool === 'create' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select style={{ flex: 1, minWidth: '100px' }} value={createColData.col1} onChange={(e) => setCreateColData({ ...createColData, col1: e.target.value })}>
                      {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select style={{ width: '60px' }} value={createColData.op} onChange={(e) => setCreateColData({ ...createColData, op: e.target.value })}>
                      <option value="add">+</option>
                      <option value="sub">-</option>
                      <option value="mul">*</option>
                      <option value="div">/</option>
                    </select>
                    <select style={{ flex: 1, minWidth: '100px' }} value={createColData.col2} onChange={(e) => setCreateColData({ ...createColData, col2: e.target.value })}>
                      {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <input type="text" value={createColData.new} onChange={(e) => setCreateColData({ ...createColData, new: e.target.value })} placeholder="New column name" />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleTransform('create_column', { col1: createColData.col1, col2: createColData.col2, new_name: createColData.new, op: createColData.op })} style={{ flex: 1 }}>Calculate</button>
                    <button onClick={() => setActiveTool(null)} style={{ background: '#ef4444' }}>Back</button>
                  </div>
                </div>
              ) : activeTool === 'filter' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select style={{ flex: 1, minWidth: '100px' }} value={filterData.column} onChange={(e) => setFilterData({ ...filterData, column: e.target.value })}>
                      {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select style={{ width: '90px' }} value={filterData.op} onChange={(e) => setFilterData({ ...filterData, op: e.target.value })}>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value="==">=</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                      <option value="!=">!=</option>
                      <option value="contains">contains</option>
                    </select>
                    <input type="text" style={{ flex: 1, minWidth: '80px' }} value={filterData.value} onChange={(e) => setFilterData({ ...filterData, value: e.target.value })} placeholder="Value" />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleTransform('filter', filterData)} style={{ flex: 1 }}>Apply Filter</button>
                    <button onClick={() => setActiveTool(null)} style={{ background: '#ef4444' }}>Back</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <select value={crudData.action} onChange={(e) => setCrudData({ ...crudData, action: e.target.value })}>
                    <option value="update_cell">Edit Cell</option>
                    <option value="delete_column">Delete Column</option>
                  </select>
                  {crudData.action === 'update_cell' ? (
                    <>
                      <input type="number" placeholder="Row Index" value={crudData.index} onChange={(e) => setCrudData({ ...crudData, index: e.target.value })} />
                      <select value={crudData.column} onChange={(e) => setCrudData({ ...crudData, column: e.target.value })}>
                        {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="text" placeholder="New Value" value={crudData.value} onChange={(e) => setCrudData({ ...crudData, value: e.target.value })} />
                    </>
                  ) : (
                    <select value={crudData.column} onChange={(e) => setCrudData({ ...crudData, column: e.target.value })}>
                      {dataSummary.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleCRUD(crudData.action, crudData)} style={{ flex: 1 }}>Apply</button>
                    <button onClick={() => setActiveTool(null)} style={{ background: '#ef4444' }}>Back</button>
                  </div>
                </div>
              )}
              {!dataSummary && <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>Upload a dataset to unlock these tools</p>}
            </div>
          </div>
        </>
      )}

      {rightTab === 'tools' && (
        <>
          <div className="card">
            <h2>Smart Data Tools</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>K-Means Clustering</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" placeholder="K" style={{ width: '70px' }} id="cluster-k" defaultValue="3" />
                  <button onClick={async () => {
                    try {
                      const k = document.getElementById('cluster-k').value;
                      const res = await axios.post(`${API_BASE}/cluster`, { clusters: k });
                      setDataSummary(res.data.summary);
                      setMessages(prev => [...prev, { role: 'ai', content: `✅ ${res.data.message}` }]);
                    } catch (err) { setMessages(prev => [...prev, { role: 'ai', content: `❌ Clustering failed: ${err.response?.data?.error || err.message}` }]); }
                  }} style={{ flex: 1 }} disabled={!dataSummary}>Run K-Means</button>
                </div>
              </div>

              <div style={{ background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Model Leaderboard</p>
                <button onClick={async () => {
                  try {
                    const res = await axios.post(`${API_BASE}/compare`, { target: predictionTarget });
                    setProResults({ ...proResults, comparison: res.data.results });
                  } catch (err) { setMessages(prev => [...prev, { role: 'ai', content: `❌ Comparison failed: ${err.response?.data?.error || err.message}` }]); }
                }} style={{ width: '100%' }} disabled={!dataSummary}>Run Leaderboard</button>
                {proResults.comparison && (
                  <div style={{ marginTop: '1rem', fontSize: '0.75rem' }}>
                    {proResults.comparison.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <span>{r.name}</span>
                        <span style={{ fontWeight: 700 }}>{(r.score * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                style={{ flex: 1, background: '#fef3c7', color: '#92400e', minWidth: '90px' }}
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API_BASE}/undo`);
                    setDataSummary(res.data.summary);
                    setMessages(prev => [...prev, { role: 'ai', content: `↩️ ${res.data.message}` }]);
                  } catch (err) { setMessages(prev => [...prev, { role: 'ai', content: `Cannot undo: ${err.response?.data?.error || err.message}` }]); }
                }}
                disabled={!dataSummary}
              >↩ Undo</button>
              <button
                style={{ flex: 1, background: '#dbeafe', color: '#1e40af', minWidth: '90px' }}
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API_BASE}/clean`);
                    setDataSummary(res.data.summary);
                    setMessages(prev => [...prev, { role: 'ai', content: `🧹 ${res.data.message}` }]);
                    fetchAdvancedInsights();
                  } catch (err) { setMessages(prev => [...prev, { role: 'ai', content: `Clean failed: ${err.response?.data?.error || err.message}` }]); }
                }}
                disabled={!dataSummary}
              >🧹 Clean</button>
              <button
                style={{ flex: 1, background: '#f0fdf4', color: '#166534', minWidth: '90px' }}
                onClick={async () => {
                  if (!dataSummary) return;
                  const col = dataSummary.columns[0];
                  try {
                    const res = await axios.post(`${API_BASE}/sort`, { column: col, ascending: true });
                    setDataSummary(res.data.summary);
                    setMessages(prev => [...prev, { role: 'ai', content: `📊 ${res.data.message}` }]);
                  } catch (err) { setMessages(prev => [...prev, { role: 'ai', content: `Sort failed: ${err.response?.data?.error || err.message}` }]); }
                }}
                disabled={!dataSummary}
              >↕ Sort</button>
            </div>

            <h2>Export</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                style={{ flex: 1, background: 'var(--sidebar-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', minWidth: '80px' }}
                onClick={() => window.open(`${API_BASE}/report`, '_blank')}
                disabled={!dataSummary}
              >📄 CSV</button>
              <button
                style={{ flex: 1, background: '#065f46', color: 'white', minWidth: '80px' }}
                onClick={() => window.open(`${API_BASE}/export/excel`, '_blank')}
                disabled={!dataSummary}
              >📊 Excel</button>
              <button
                style={{ flex: 1, background: 'var(--accent-color)', color: 'white', minWidth: '80px' }}
                onClick={() => window.open(`${API_BASE}/report/pdf`, '_blank')}
                disabled={!dataSummary}
              >📑 PDF</button>
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          DataMind AI
          <span style={{ fontSize: '0.55rem', background: 'var(--accent-color)', color: 'white', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>PRO</span>
        </div>
        <div className="status">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{ background: 'var(--sidebar-bg)', color: 'var(--text-primary)', padding: '0.4rem', borderRadius: '50%', width: '36px', height: '36px', minHeight: '36px', fontSize: '1rem' }}
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {dataSummary ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="status-badge">● Live</span>
                <button
                  onClick={() => { window.location.reload(); }}
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', minHeight: '32px' }}
                >
                  New
                </button>
              </div>
            ) : (
              <span className="status-badge" style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Ready</span>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* LEFT PANEL — Data + Chat */}
        <section
          className={`left-panel ${mobilePanel !== 'data' ? 'mobile-hidden' : ''}`}
        >
          {!dataSummary ? (
            <div className="card">
              <h2>📂 Upload Data</h2>
              <label
                className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                />
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drop your file here or tap to browse
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Supports CSV (.csv), Excel (.xlsx, .xls)
                </p>
                {isProcessing && (
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                    Analysing…
                  </div>
                )}
              </label>
            </div>
          ) : (
            <div className="card">
              <h2>📋 Data Snapshot</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>ROWS</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{dataSummary.rows}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>COLUMNS</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{dataSummary.columns.length}</p>
                </div>
              </div>

              {qualityData && (
                <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '1rem', borderRadius: '16px', border: '1px solid #bbf7d0', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>DATA HEALTH</p>
                      <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#14532d' }}>{qualityData.score}%</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: '#16a34a', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>{qualityData.health}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#166534', flexWrap: 'wrap' }}>
                    <span>● {qualityData.missing} Missing</span>
                    <span>● {qualityData.duplicates} Duplicates</span>
                    <span>● {qualityData.outliers} Outliers</span>
                  </div>
                </div>
              )}

              <div className="data-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Del</th>
                      {dataSummary.columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {dataSummary.head.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td>
                          <button
                            onClick={() => handleCRUD('delete_row', { index: row.index })}
                            style={{ padding: '0.2rem 0.4rem', background: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', minHeight: '28px' }}
                          >✕</button>
                        </td>
                        {dataSummary.columns.map(col => <td key={col}>{String(row[col] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Chat */}
          <div className="card chat-card">
            <h2>💬 AI Assistant</h2>
            <div className="chat-box">
              <div className="messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <div className="content">{msg.content}</div>
                    {msg.image && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <img src={`data:image/png;base64,${msg.image}`} alt="Analysis" style={{ width: '100%', borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                      </div>
                    )}
                    {msg.type === 'table' && msg.data && (
                      <div className="data-preview" style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
                        <pre style={{ fontSize: '0.7rem', background: '#fafafa', padding: '8px', borderRadius: '8px' }}>{JSON.stringify(msg.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
                {isProcessing && <div className="message ai">🤔 Thinking…</div>}
                <div ref={messagesEndRef} />
              </div>

              {suggestions.length > 0 && !isProcessing && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', padding: '0.1rem' }}>
                  {suggestions.map((s, i) => (
                    <button key={i} className="suggestion-chip" onClick={() => handleQuery(s)} style={{ border: 'none', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="input-area">
                <input
                  type="text"
                  placeholder="Ask anything about your data…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={() => handleQuery()}
                  disabled={isProcessing || !dataSummary}
                  style={{ padding: '0.625rem 1rem', minWidth: '48px' }}
                >
                  <span>↗</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL — Visuals / Tools / AI Models */}
        <section
          className={`right-panel ${mobilePanel !== 'data' ? 'mobile-active' : ''}`}
        >
          <RightPanelContent />
        </section>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav className="mobile-bottom-nav" role="navigation" aria-label="Main navigation">
        <button
          className={`mobile-nav-btn ${mobilePanel === 'data' ? 'active' : ''}`}
          onClick={() => handleMobileNav('data')}
        >
          <span className="nav-icon">📋</span>
          <span>Data</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobilePanel !== 'data' && rightTab === 'visuals' ? 'active' : ''}`}
          onClick={() => { setRightTab('visuals'); handleMobileNav('visuals'); }}
        >
          <span className="nav-icon">📈</span>
          <span>Visuals</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobilePanel !== 'data' && rightTab === 'tools' ? 'active' : ''}`}
          onClick={() => { setRightTab('tools'); handleMobileNav('tools'); }}
        >
          <span className="nav-icon">🔧</span>
          <span>Tools</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobilePanel !== 'data' && rightTab === 'advanced' ? 'active' : ''}`}
          onClick={() => { setRightTab('advanced'); handleMobileNav('advanced'); }}
        >
          <span className="nav-icon">🤖</span>
          <span>AI Models</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
