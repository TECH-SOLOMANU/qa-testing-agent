import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  ShieldAlert, CheckCircle, Bug, Eye, RefreshCw, FileText,
  Activity, Globe, Play, Code, Copy, Check, ExternalLink, Download,
  SlidersHorizontal, Terminal, Zap, Info, ChevronRight
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'bugs' | 'tests' | 'pages' | 'a11y'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [a11yIssues, setA11yIssues] = useState<any[]>([]);
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [selectedCode, setSelectedCode] = useState<any>(null);
  const [targetUrl, setTargetUrl] = useState('http://localhost:4000');
  const [loading, setLoading] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [bugSeverityFilter, setBugSeverityFilter] = useState('ALL');
  const [bugRootCauseFilter, setBugRootCauseFilter] = useState('ALL');
  const [a11ySeverityFilter, setA11ySeverityFilter] = useState('ALL');

  const fetchData = async () => {
    try {
      const [statsRes, timelineRes, bugsRes, tcRes, pagesRes, flowsRes, a11yRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/dashboard/stats`),
        axios.get(`${API_BASE}/dashboard/timeline`),
        axios.get(`${API_BASE}/bugs`),
        axios.get(`${API_BASE}/test-cases`),
        axios.get(`${API_BASE}/pages`),
        axios.get(`${API_BASE}/flows`),
        axios.get(`${API_BASE}/accessibility-issues`),
        axios.get(`${API_BASE}/pipeline/status`)
      ]);
      setStats(statsRes.data);
      setTimeline(timelineRes.data);
      setBugs(bugsRes.data);
      setTestCases(tcRes.data);
      setPages(pagesRes.data);
      setFlows(flowsRes.data);
      setA11yIssues(a11yRes.data);
      setPipelineStatus(statusRes.data);
      setPipelineRunning(statusRes.data?.running || false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    try {
      await axios.post(`${API_BASE}/pipeline/run`, { targetUrl });
      fetchData();
    } catch (err: any) {
      alert('Failed to trigger pipeline: ' + (err.response?.data?.error || err.message));
      setPipelineRunning(false);
    }
  };

  const handleRerunTest = async (tc: any) => {
    try {
      alert(`Triggering live rerun of spec: ${tc.file_path}`);
      await axios.post(`${API_BASE}/test-cases/rerun`, { testCaseId: tc.id, filePath: tc.file_path });
      fetchData();
    } catch (err: any) {
      alert('Rerun failed: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered lists
  const filteredBugs = bugs.filter(b => {
    const matchSev = bugSeverityFilter === 'ALL' || b.severity.toLowerCase() === bugSeverityFilter.toLowerCase();
    const matchRC = bugRootCauseFilter === 'ALL' || b.root_cause === bugRootCauseFilter;
    return matchSev && matchRC;
  });

  const filteredA11y = a11yIssues.filter(a => {
    return a11ySeverityFilter === 'ALL' || a.severity.toLowerCase() === a11ySeverityFilter.toLowerCase();
  });

  const testStatusData = stats ? [
    { name: 'Passed', value: stats.testResults.pass, color: '#10b981' },
    { name: 'Failed', value: stats.testResults.fail, color: '#ef4444' },
    { name: 'Flaky', value: stats.testResults.flaky, color: '#f59e0b' }
  ] : [];

  const bugSeverityData = stats ? [
    { severity: 'Critical', count: stats.bugs.bySeverity.critical },
    { severity: 'High', count: stats.bugs.bySeverity.high },
    { severity: 'Medium', count: stats.bugs.bySeverity.medium },
    { severity: 'Low', count: stats.bugs.bySeverity.low }
  ] : [];

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <ShieldAlert size={26} color="#8b5cf6" />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>QA Agent AI</span>
            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 600 }}>AUTONOMOUS SUITE</div>
          </div>
        </div>

        <nav>
          <div
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} />
            <span>Overview & Analytics</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'bugs' ? 'active' : ''}`}
            onClick={() => setActiveTab('bugs')}
          >
            <Bug size={18} />
            <span>Bugs & Evidence</span>
            {bugs.length > 0 && <span className="nav-badge">{bugs.length}</span>}
          </div>
          <div
            className={`nav-item ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => setActiveTab('tests')}
          >
            <Code size={18} />
            <span>Playwright Tests</span>
            {testCases.length > 0 && <span className="nav-badge info">{testCases.length}</span>}
          </div>
          <div
            className={`nav-item ${activeTab === 'pages' ? 'active' : ''}`}
            onClick={() => setActiveTab('pages')}
          >
            <Globe size={18} />
            <span>App Map & Flows</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'a11y' ? 'active' : ''}`}
            onClick={() => setActiveTab('a11y')}
          >
            <Eye size={18} />
            <span>Accessibility Audit</span>
            {a11yIssues.length > 0 && <span className="nav-badge warning">{a11yIssues.length}</span>}
          </div>
        </nav>

        {/* Live Control Box */}
        <div className="sidebar-footer">
          <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Target Environment URL
          </label>
          <input
            type="text"
            className="url-input"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            disabled={pipelineRunning}
          />
          <button
            onClick={handleRunPipeline}
            className={`btn-pipeline ${pipelineRunning ? 'running' : ''}`}
            disabled={pipelineRunning}
          >
            {pipelineRunning ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Agents Running...</span>
              </>
            ) : (
              <>
                <Play size={16} fill="white" />
                <span>Run Agent Pipeline</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="header-bar">
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Autonomous QA Intelligence Center</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
              Real-time Playwright automated testing, failure evidence correlation & WCAG scans
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="badge badge-low" style={{ fontSize: '13px', padding: '6px 14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span className="pulse-dot"></span>
              Live DB Synced
            </span>
            <button onClick={fetchData} className="btn-secondary">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </header>

        {/* Live Pipeline Execution Progress Banner */}
        {pipelineRunning && (
          <div className="pipeline-running-banner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={20} color="#8b5cf6" className="animate-bounce" />
                <strong style={{ fontSize: '15px' }}>{pipelineStatus?.currentPhase || 'Running Autonomous Agents...'}</strong>
              </div>
              <span style={{ fontSize: '13px', color: '#a78bfa', fontWeight: 700 }}>Active</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${pipelineStatus?.progress || 35}%` }}></div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>
            <RefreshCw className="animate-spin" size={36} style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 600 }}>Loading Autonomous QA Analytics & Evidence...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* Metrics Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-header">
                      <span>App Pages Discovered</span>
                      <Globe size={20} color="#3b82f6" />
                    </div>
                    <div className="stat-value">{stats?.pagesDiscovered || 0}</div>
                    <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '6px' }}>
                      {stats?.flowsMapped || 0} primary user flows mapped
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span>Playwright Tests</span>
                      <Code size={20} color="#8b5cf6" />
                    </div>
                    <div className="stat-value">{stats?.totalTestCases || 0}</div>
                    <div style={{ color: '#10b981', fontSize: '13px', marginTop: '6px' }}>
                      {stats?.testResults.pass || 0} Passed / {stats?.testResults.fail || 0} Failed
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span>Confirmed Bugs</span>
                      <Bug size={20} color="#ef4444" />
                    </div>
                    <div className="stat-value" style={{ color: stats?.bugs.total > 0 ? '#ef4444' : '#fff' }}>
                      {stats?.bugs.total || 0}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '6px' }}>
                      {stats?.bugs.bySeverity.critical || 0} Critical / {stats?.bugs.byRootCause.backend || 0} API Backend
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-header">
                      <span>WCAG Accessibility</span>
                      <Eye size={20} color="#f59e0b" />
                    </div>
                    <div className="stat-value">{stats?.accessibility.total || 0}</div>
                    <div style={{ color: '#f59e0b', fontSize: '13px', marginTop: '6px' }}>
                      @axe-core/playwright audit
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="charts-row">
                  <div className="card">
                    <div className="card-title">
                      <Bug size={18} color="#8b5cf6" />
                      <span>Bug Severity Distribution</span>
                    </div>
                    <div style={{ height: '260px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bugSeverityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis dataKey="severity" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" />
                          <RechartsTooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">
                      <CheckCircle size={18} color="#10b981" />
                      <span>Test Execution Breakdown</span>
                    </div>
                    <div style={{ height: '260px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={testStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {testStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="card">
                  <div className="card-title">
                    <Activity size={18} color="#3b82f6" />
                    <span>Chronological Agent Pipeline Activity Stream</span>
                  </div>

                  <div className="timeline">
                    {timeline.map((evt) => (
                      <div key={evt.id} className="timeline-item">
                        <div className="timeline-icon">
                          {evt.type === 'exploration' && <Globe size={18} />}
                          {evt.type === 'generation' && <FileText size={18} />}
                          {evt.type === 'execution' && <Activity size={18} />}
                          {evt.type === 'bug' && <Bug size={18} color="#ef4444" />}
                          {evt.type === 'accessibility' && <Eye size={18} color="#f59e0b" />}
                        </div>
                        <div className="timeline-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '15px' }}>{evt.title}</strong>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p style={{ color: '#d1d5db', fontSize: '14px' }}>{evt.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* BUGS & EVIDENCE TAB */}
            {activeTab === 'bugs' && (
              <div className="card">
                <div className="card-title" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bug size={18} color="#ef4444" />
                    <span>Detected Bugs & Failure Evidence</span>
                  </div>

                  {/* Bug Filters */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                      className="filter-select"
                      value={bugSeverityFilter}
                      onChange={(e) => setBugSeverityFilter(e.target.value)}
                    >
                      <option value="ALL">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>

                    <select
                      className="filter-select"
                      value={bugRootCauseFilter}
                      onChange={(e) => setBugRootCauseFilter(e.target.value)}
                    >
                      <option value="ALL">All Root Causes</option>
                      <option value="API/backend">API/backend</option>
                      <option value="UI/frontend">UI/frontend</option>
                      <option value="needs investigation">Needs Investigation</option>
                    </select>
                  </div>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Root Cause Hint</th>
                      <th>Actual Result</th>
                      <th>Spec File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBugs.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <span className={`badge badge-${b.severity}`}>
                            {b.severity.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-medium">{b.root_cause}</span>
                        </td>
                        <td style={{ maxWidth: '320px' }}>{b.actual}</td>
                        <td style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
                          {b.file_path || 'crud-flow.spec.ts'}
                        </td>
                        <td>
                          <button
                            className="btn-action"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => setSelectedBug(b)}
                          >
                            View Evidence
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredBugs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>
                          No confirmed bugs match current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PLAYWRIGHT TESTS TAB */}
            {activeTab === 'tests' && (
              <div className="card">
                <div className="card-title">
                  <Code size={18} color="#8b5cf6" />
                  <span>Generated Playwright TypeScript Test Specs</span>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Spec File Path</th>
                      <th>Target Flow</th>
                      <th>Selectors Used</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testCases.map((tc) => (
                      <tr key={tc.id}>
                        <td style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600 }}>
                          {tc.file_path}
                        </td>
                        <td><span className="badge badge-low">{tc.type}</span></td>
                        <td>
                          <span className="badge badge-medium" style={{ fontSize: '11px' }}>
                            ARIA role & data-testid
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-action"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setSelectedCode(tc)}
                          >
                            Inspect Code
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleRerunTest(tc)}
                          >
                            Rerun Spec
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* APP MAP & FLOWS TAB */}
            {activeTab === 'pages' && (
              <div className="card">
                <div className="card-title">
                  <Globe size={18} color="#3b82f6" />
                  <span>Explored Application Pages & Navigation Flows</span>
                </div>

                <h3 style={{ fontSize: '16px', margin: '20px 0 12px 0', color: '#a78bfa' }}>Discovered App Pages</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  {pages.map((p) => (
                    <div key={p.id} className="page-node-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge badge-low">{p.type}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{p.elements?.length || 0} elements</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600, fontSize: '15px' }}>
                        {p.url}
                      </div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '16px', margin: '20px 0 12px 0', color: '#a78bfa' }}>Mapped Primary User Flows</h3>
                <div className="flows-list">
                  {flows.map((f) => (
                    <div key={f.id} className="flow-card">
                      <strong style={{ fontSize: '16px', color: '#fff' }}>{f.name}</strong>
                      <ol style={{ paddingLeft: '20px', margin: '10px 0', color: '#cbd5e1', fontSize: '14px' }}>
                        {f.steps?.map((s: string, idx: number) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACCESSIBILITY TAB */}
            {activeTab === 'a11y' && (
              <div className="card">
                <div className="card-title" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Eye size={18} color="#f59e0b" />
                    <span>WCAG Accessibility Audit (@axe-core/playwright)</span>
                  </div>

                  <select
                    className="filter-select"
                    value={a11ySeverityFilter}
                    onChange={(e) => setA11ySeverityFilter(e.target.value)}
                  >
                    <option value="ALL">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="serious">Serious</option>
                    <option value="moderate">Moderate</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Target DOM Element</th>
                      <th>WCAG Rule</th>
                      <th>Fix Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredA11y.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className={`badge badge-${a.severity === 'serious' ? 'high' : a.severity}`}>
                            {a.severity.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#f3f4f6', maxWidth: '220px' }}>{a.element}</td>
                        <td style={{ color: '#a78bfa', fontWeight: 600 }}>{a.wcag_rule}</td>
                        <td style={{ fontSize: '13px', color: '#cbd5e1' }}>{a.fix_suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* BUG EVIDENCE MODAL */}
        {selectedBug && (
          <div className="modal-backdrop" onClick={() => setSelectedBug(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bug size={24} color="#ef4444" />
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>
                    Bug Failure Evidence & Signals
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedBug(null)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '22px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <span className={`badge badge-${selectedBug.severity}`}>
                  Severity: {selectedBug.severity.toUpperCase()}
                </span>
                <span className="badge badge-medium">
                  Root Cause: {selectedBug.root_cause}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ display: 'block', color: '#9ca3af', marginBottom: '4px' }}>Actual Result (Failure):</strong>
                <p style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid #ef4444', fontFamily: 'monospace' }}>
                  {selectedBug.actual}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ display: 'block', color: '#9ca3af', marginBottom: '4px' }}>Expected Behavior:</strong>
                <p style={{ color: '#86efac', background: 'rgba(34, 197, 94, 0.15)', padding: '12px', borderRadius: '8px', border: '1px solid #22c55e' }}>
                  {selectedBug.expected}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#9ca3af' }}>Steps to Reproduce:</strong>
                  <button
                    onClick={() => copyToClipboard(selectedBug.steps_to_reproduce?.join('\n'))}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}
                  >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Steps'}</span>
                  </button>
                </div>
                <ol style={{ paddingLeft: '20px', color: '#d1d5db', background: '#0b0f19', padding: '14px 14px 14px 30px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                  {selectedBug.steps_to_reproduce?.map((step: string, i: number) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Network Logs Waterfall */}
              {selectedBug.evidence_refs?.networkLogs && selectedBug.evidence_refs.networkLogs.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Correlated Network Logs:</strong>
                  <div style={{ background: '#0b0f19', borderRadius: '8px', border: '1px solid #1f2937', padding: '10px' }}>
                    {selectedBug.evidence_refs.networkLogs.map((net: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', fontSize: '13px', fontFamily: 'monospace', marginBottom: '4px' }}>
                        <span style={{ color: net.status >= 500 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{net.status}</span>
                        <span style={{ color: '#8b5cf6', width: '45px' }}>{net.method}</span>
                        <span style={{ color: '#cbd5e1' }}>{net.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failure Screenshot */}
              {selectedBug.evidence_refs?.screenshotUrl && (
                <div style={{ marginTop: '20px' }}>
                  <strong style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Captured Failure Screenshot:</strong>
                  <img
                    src={selectedBug.evidence_refs.screenshotUrl}
                    alt="Failure Screenshot"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid #374151', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  />
                </div>
              )}

              {/* Playwright Trace Download */}
              {selectedBug.evidence_refs?.traceUrl && (
                <div style={{ marginTop: '20px' }}>
                  <a
                    href={selectedBug.evidence_refs.traceUrl}
                    download
                    className="btn-action"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                  >
                    <Download size={16} />
                    <span>Download Playwright Trace (.zip)</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CODE INSPECTOR MODAL */}
        {selectedCode && (
          <div className="modal-backdrop" onClick={() => setSelectedCode(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Code size={22} color="#8b5cf6" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
                    {selectedCode.file_path}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCode(null)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <pre style={{ background: '#0b0f19', padding: '18px', borderRadius: '10px', border: '1px solid #1f2937', color: '#a78bfa', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', maxHeight: '500px' }}>
                <code>{selectedCode.code || '// Generated Playwright TypeScript Spec'}</code>
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
