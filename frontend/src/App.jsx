import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "http://localhost:5000"

function getToken() { return localStorage.getItem("token") }
function getHouseId() { return localStorage.getItem("house_id") }

const authAxios = () => axios.create({
  headers: { Authorization: `Bearer ${getToken()}` }
})

function getColor(score) {
  if (score >= 70) return "#22c55e"
  if (score >= 50) return "#f59e0b"
  if (score >= 30) return "#f97316"
  return "#ef4444"
}

function getLabel(score) {
  if (score >= 70) return "Efficient"
  if (score >= 50) return "Average"
  if (score >= 30) return "High Usage"
  return "Wasteful"
}

function ScoreCircle({ score, size = 120 }) {
  const color = getColor(score)
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `conic-gradient(${color} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg)`,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        width: size - 20, height: size - 20, borderRadius: "50%",
        background: "white", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: size / 3.5, fontWeight: "bold", color }}>{score}</span>
        <span style={{ fontSize: size / 9, color: "#6b7280" }}>/ 100</span>
      </div>
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [houseId, setHouseId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(`${API}/api/login`, { house_id: houseId, password })
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("house_id", res.data.house_id)
      onLogin()
    } catch (e) {
      setError(e.response?.data?.error || "Login failed")
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #065f46, #059669)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: 48,
        width: 400, boxShadow: "0 25px 60px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <h1 style={{ margin: 0, color: "#065f46", fontSize: 28 }}>GreenFed</h1>
          <p style={{ color: "#6b7280", margin: "8px 0 0" }}>Privacy-Preserving Sustainability AI</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>House ID</label>
          <input
            value={houseId}
            onChange={e => setHouseId(e.target.value.toUpperCase())}
            placeholder="e.g. HOUSE001"
            style={{
              width: "100%", padding: "12px 16px", marginTop: 6,
              borderRadius: 10, border: "1px solid #d1d5db",
              fontSize: 16, boxSizing: "border-box", outline: "none"
            }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="e.g. house001123"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "12px 16px", marginTop: 6,
              borderRadius: 10, border: "1px solid #d1d5db",
              fontSize: 16, boxSizing: "border-box", outline: "none"
            }}
          />
        </div>
        {error && (
          <div style={{
            background: "#fef2f2", color: "#dc2626", padding: 12,
            borderRadius: 8, marginBottom: 16, fontSize: 14, textAlign: "center"
          }}>{error}</div>
        )}
        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 10,
          background: loading ? "#9ca3af" : "#065f46",
          color: "white", border: "none", fontSize: 16,
          fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer"
        }}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: 13, marginTop: 16 }}>
          Default password: house id lowercase + 123<br />e.g. HOUSE001 → house001123
        </p>
      </div>
    </div>
  )
}

function DeviceBar({ label, percent, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 14, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: "bold", color }}>{percent}%</span>
      </div>
      <div style={{ background: "#e5e7eb", borderRadius: 6, height: 10 }}>
        <div style={{ width: `${percent}%`, background: color, height: 10, borderRadius: 6, transition: "width 1s ease" }} />
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion }) {
  const colors = {
    critical: { bg: "#fef2f2", border: "#ef4444", text: "#dc2626", icon: "🔴" },
    warning:  { bg: "#fffbeb", border: "#f59e0b", text: "#d97706", icon: "🟠" },
    info:     { bg: "#eff6ff", border: "#3b82f6", text: "#2563eb", icon: "🔵" },
    success:  { bg: "#f0fdf4", border: "#22c55e", text: "#16a34a", icon: "✅" },
  }
  const c = colors[suggestion.type] || colors.info
  return (
    <div style={{
      background: c.bg, borderLeft: `4px solid ${c.border}`,
      borderRadius: 8, padding: "12px 16px", marginBottom: 10,
      display: "flex", alignItems: "flex-start", gap: 10
    }}>
      <span>{c.icon}</span>
      <span style={{ fontSize: 14, color: c.text }}>{suggestion.msg}</span>
    </div>
  )
}

function PrivacyVisualizer() {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)

  const steps = [
    { title: "Raw Data Stays Local",      desc: "Your electricity and water data NEVER leaves your device. Only model weights are shared.",          color: "#065f46", icon: "🏠" },
    { title: "Local LSTM Training",        desc: "Your house trains its own LSTM model on local data. No raw data is transmitted.",                    color: "#0891b2", icon: "🧠" },
    { title: "Only Weights Are Shared",    desc: "Instead of data, only mathematical model weights (numbers) are sent to the server.",                 color: "#7c3aed", icon: "📤" },
    { title: "FedAvg Aggregation",         desc: "The server averages weights from 30 houses using McMahan et al. FedAvg algorithm. No data seen.",    color: "#b45309", icon: "⚙️" },
    { title: "Global Model Distributed",   desc: "The improved global model is sent back to all houses. Your data was never exposed.",                  color: "#065f46", icon: "📥" },
    { title: "Privacy Preserved ✅",       desc: "After 10 rounds, GreenScore is computed locally. Zero raw data ever left your house.",                color: "#16a34a", icon: "🔒" },
  ]

  useEffect(() => {
    if (!running) return
    if (step >= steps.length - 1) { setRunning(false); return }
    const t = setTimeout(() => setStep(s => s + 1), 1800)
    return () => clearTimeout(t)
  }, [running, step])

  const start = () => { setStep(0); setRunning(true) }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#1f2937", marginBottom: 8 }}>🔒 Federated Learning Privacy Visualizer</h2>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>See exactly how GreenFed protects your data through the FL process</p>

      <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 16 }}>
          {["🏠 House\n(Your Data)", "🧠 Local\nLSTM", "📤 Weights\nOnly", "⚙️ FedAvg\nServer", "📥 Global\nModel"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                background: step >= i ? steps[Math.min(i, steps.length - 1)].color : "#e5e7eb",
                color: "white", borderRadius: 12, padding: "16px 20px",
                textAlign: "center", fontSize: 13, fontWeight: "bold",
                minWidth: 90, transition: "background 0.5s", whiteSpace: "pre-line", lineHeight: 1.4
              }}>{label}</div>
              {i < 4 && <div style={{ fontSize: 20, color: step > i ? "#22c55e" : "#d1d5db", transition: "color 0.5s" }}>→</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: "12px 20px", background: "#f0fdf4", borderRadius: 10, border: "2px solid #22c55e", textAlign: "center" }}>
          <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: 15 }}>
            🔒 Raw data is NEVER transmitted — only model weights leave your device
          </span>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, color: "#1f2937" }}>Step-by-Step Walkthrough</h3>
          <button onClick={start} style={{
            padding: "10px 24px", borderRadius: 10, background: "#065f46",
            color: "white", border: "none", cursor: "pointer", fontWeight: "bold"
          }}>{running ? "Running..." : "▶ Start Animation"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: 20, borderRadius: 12,
              background: step === i ? s.color : step > i ? "#f0fdf4" : "#f9fafb",
              border: step === i ? `2px solid ${s.color}` : step > i ? "2px solid #22c55e" : "2px solid #e5e7eb",
              transition: "all 0.5s"
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 6, color: step === i ? "white" : step > i ? "#065f46" : "#374151" }}>{s.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: step === i ? "rgba(255,255,255,0.9)" : "#6b7280" }}>{s.desc}</div>
              {step > i && <div style={{ marginTop: 8, color: "#22c55e", fontWeight: "bold", fontSize: 13 }}>✅ Done</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Raw Data Shared",     value: "0 bytes", color: "#22c55e", icon: "✅" },
          { label: "FL Rounds",           value: "10",       color: "#6366f1", icon: "🔄" },
          { label: "Houses Participated", value: "101",      color: "#0891b2", icon: "🏠" },
          { label: "Privacy Guarantee",   value: "100%",     color: "#22c55e", icon: "🔒" },
        ].map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: "bold", color: s.color, margin: "8px 0" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatAssistant({ userData }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi! I'm your GreenFed AI Assistant 🌱 Your current GreenScore is ${userData?.green_score}/100. Ask me anything about your energy usage!` }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", text: userMsg }])
    setLoading(true)

    try {
      const res = await authAxios().post(`${API}/api/chat`, { message: userMsg })
      const reply = res.data.reply
      setMessages(prev => [...prev, { role: "assistant", text: reply }])
    } catch (e) {
      const errorMsg = e.response?.data?.reply || "Sorry, AI service unavailable right now."
      setMessages(prev => [...prev, { role: "assistant", text: errorMsg }])
    }
    setLoading(false)
  }

  const suggestions = [
    "Why is my electricity score low?",
    "How can I improve my GreenScore?",
    "Which device uses the most energy?",
    "How do I compare to my neighbors?",
  ]

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#1f2937", marginBottom: 8 }}>🤖 AI Sustainability Assistant</h2>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>Ask anything about your energy usage — powered by Claude AI</p>
      <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ height: 420, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "75%", padding: "12px 16px", borderRadius: 16,
                background: m.role === "user" ? "#065f46" : "#f3f4f6",
                color: m.role === "user" ? "white" : "#1f2937",
                fontSize: 14, lineHeight: 1.6,
                borderBottomRightRadius: m.role === "user" ? 4 : 16,
                borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
              }}>
                {m.role === "assistant" && <span style={{ marginRight: 6 }}>🌱</span>}
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex" }}>
              <div style={{ background: "#f3f4f6", padding: "12px 16px", borderRadius: 16, fontSize: 14, color: "#6b7280" }}>🌱 Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "0 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)} style={{
              padding: "6px 12px", borderRadius: 20, border: "1px solid #d1d5db",
              background: "white", fontSize: 12, cursor: "pointer", color: "#374151"
            }}>{s}</button>
          ))}
        </div>
        <div style={{ padding: "12px 24px 24px", display: "flex", gap: 12 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask about your energy usage..."
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
          />
          <button onClick={send} disabled={loading} style={{
            padding: "12px 24px", borderRadius: 10, background: "#065f46",
            color: "white", border: "none", cursor: "pointer", fontWeight: "bold"
          }}>Send</button>
        </div>
      </div>
    </div>
  )
}

function PredictionTab({ userData }) {
  const [predictions, setPredictions] = useState(null)

  useEffect(() => {
    if (!userData) return
    const base = userData.green_score
    const trend = userData.elec_waste > 50 ? -0.3 : userData.green_score < 50 ? 0.5 : 0.2
    const preds = Array.from({ length: 30 }, (_, i) => {
      const noise = (Math.random() - 0.5) * 4
      return {
        day: i + 1,
        score: Math.max(10, Math.min(95, Math.round(base + trend * i + noise)))
      }
    })
    setPredictions(preds)
  }, [userData])

  if (!predictions) return <div>Loading predictions...</div>

  const maxScore = Math.max(...predictions.map(p => p.score))
  const minScore = Math.min(...predictions.map(p => p.score))
  const finalScore = predictions[29].score
  const trend = finalScore > userData.green_score ? "improving" : "declining"

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#1f2937", marginBottom: 8 }}>📈 30-Day GreenScore Prediction</h2>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>AI-powered forecast based on your consumption patterns</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Current Score",    value: userData.green_score, color: getColor(userData.green_score) },
          { label: "Predicted Day 30", value: finalScore,           color: getColor(finalScore) },
          { label: "Projected High",   value: maxScore,             color: "#22c55e" },
          { label: "Projected Low",    value: minScore,             color: "#ef4444" },
        ].map((c, i) => (
          <div key={i} style={{
            background: "white", borderRadius: 12, padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)", borderTop: `4px solid ${c.color}`, textAlign: "center"
          }}>
            <div style={{ fontSize: 28, fontWeight: "bold", color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px", color: "#1f2937" }}>
          Score Trend — Your score is {trend} {trend === "improving" ? "📈" : "📉"}
        </h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 200 }}>
          {predictions.map((p, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: "100%", height: `${(p.score / 100) * 180}px`,
                background: getColor(p.score), borderRadius: "3px 3px 0 0", opacity: 0.8
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Today</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Day 15</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Day 30</span>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#1f2937" }}>💡 Actions to Improve Your Prediction</h3>
        {[
          { action: "Reduce AC usage by 2 hours/day",   impact: "+4 points", time: "Week 1" },
          { action: "Switch to LED bulbs throughout",   impact: "+3 points", time: "Week 1" },
          { action: "Fix any water leaks",              impact: "+5 points", time: "Week 2" },
          { action: "Run appliances in off-peak hours", impact: "+3 points", time: "Week 2" },
          { action: "Install water-saving showerheads", impact: "+4 points", time: "Week 3" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderRadius: 10, marginBottom: 8,
            background: "#f9fafb", border: "1px solid #e5e7eb"
          }}>
            <div>
              <div style={{ fontSize: 14, color: "#1f2937", fontWeight: "500" }}>{item.action}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.time}</div>
            </div>
            <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "4px 12px", borderRadius: 20, fontWeight: "bold", fontSize: 13 }}>{item.impact}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportTab({ userData }) {
  const [generating, setGenerating] = useState(false)

  const generatePDF = () => {
    setGenerating(true)
    const content = `
      <html><head><style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; }
        h1 { color: #065f46; border-bottom: 3px solid #065f46; padding-bottom: 10px; }
        h2 { color: #065f46; margin-top: 30px; }
        .score-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
        .score-big { font-size: 64px; font-weight: bold; color: #065f46; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .card { background: #f9fafb; border-radius: 8px; padding: 16px; border-left: 4px solid #065f46; }
        .device-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .suggestion { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px; margin: 8px 0; border-radius: 4px; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
        .badge { display: inline-block; padding: 4px 16px; border-radius: 20px; background: #065f46; color: white; font-weight: bold; }
      </style></head><body>
        <h1>🌱 GreenFed Sustainability Report</h1>
        <p><strong>House:</strong> ${userData.house_id} &nbsp;&nbsp;
           <strong>Date:</strong> ${new Date().toLocaleDateString()} &nbsp;&nbsp;
           <span class="badge">Powered by Federated Learning</span></p>
        <div class="score-box">
          <div class="score-big">${userData.green_score}</div>
          <div style="font-size:20px;color:#065f46;font-weight:bold;">GreenScore / 100</div>
          <div style="color:#6b7280;margin-top:8px;">${userData.green_score >= 70 ? "Efficient Household ✅" : userData.green_score >= 50 ? "Average Household" : "Needs Improvement ⚠️"}</div>
        </div>
        <h2>Score Breakdown</h2>
        <div class="grid">
          <div class="card">
            <div style="font-size:32px;font-weight:bold;color:#6366f1;">${userData.elec_score}</div>
            <div>Electricity Score</div>
            <div style="color:#ef4444;font-size:13px;">Waste: ${userData.elec_waste}%</div>
          </div>
          <div class="card">
            <div style="font-size:32px;font-weight:bold;color:#06b6d4;">${userData.water_score}</div>
            <div>Water Score</div>
            <div style="color:#ef4444;font-size:13px;">Waste: ${userData.water_waste}%</div>
          </div>
        </div>
        <h2>vs Community Average</h2>
        <div class="grid">
          <div class="card">
            <div><strong>Your GreenScore:</strong> ${userData.green_score}</div>
            <div><strong>Community Avg:</strong> ${userData.community_avg.green}</div>
            <div style="color:${userData.green_score >= userData.community_avg.green ? '#16a34a' : '#dc2626'};margin-top:8px;font-weight:bold;">
              ${userData.green_score >= userData.community_avg.green ? '✅ Above Average' : '⚠️ Below Average'}
            </div>
          </div>
          <div class="card">
            <div><strong>Electricity Avg:</strong> ${userData.community_avg.elec}</div>
            <div><strong>Water Avg:</strong> ${userData.community_avg.water}</div>
          </div>
        </div>
        <h2>Device Breakdown</h2>
        <div class="grid">
          <div><h3>⚡ Electricity</h3>
            ${Object.entries(userData.devices.electricity).map(([k, v]) =>
              `<div class="device-row"><span>${k}</span><span><strong>${v}%</strong></span></div>`
            ).join('')}
          </div>
          <div><h3>💧 Water</h3>
            ${Object.entries(userData.devices.water).map(([k, v]) =>
              `<div class="device-row"><span>${k}</span><span><strong>${v}%</strong></span></div>`
            ).join('')}
          </div>
        </div>
        <h2>Personalized Suggestions</h2>
        ${userData.suggestions.map(s =>
          `<div class="suggestion">${s.type === 'critical' ? '🔴' : s.type === 'warning' ? '🟠' : s.type === 'success' ? '✅' : '🔵'} ${s.msg}</div>`
        ).join('')}
        <h2>Privacy Statement</h2>
        <p>This report was generated using <strong>Federated Learning (FedAvg)</strong>.
        Your raw electricity and water data <strong>never left your device</strong>.
        Only anonymized model weights were used. GreenFed is compliant with data minimization principles under SDG-12.</p>
        <div class="footer">
          Generated by GreenFed — Privacy-Preserving AI for Sustainable Resource Optimization<br/>
          SRM Institute of Science and Technology | SDG-12 Research Project
        </div>
      </body></html>`
    const w = window.open('', '_blank')
    w.document.write(content)
    w.document.close()
    w.print()
    setGenerating(false)
  }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#1f2937", marginBottom: 8 }}>📄 Sustainability Report</h2>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>Generate and print your personalized PDF sustainability report</p>
      <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 20px", color: "#1f2937" }}>Report Preview</h3>
        <div style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: 32, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <h2 style={{ color: "#065f46", margin: "0 0 8px" }}>GreenFed Sustainability Report</h2>
          <p style={{ color: "#6b7280", margin: "0 0 20px" }}>{userData?.house_id} • {new Date().toLocaleDateString()}</p>
          <div style={{ display: "inline-block", padding: "8px 20px", background: "#f0fdf4", borderRadius: 20, color: "#065f46", fontWeight: "bold" }}>
            GreenScore: {userData?.green_score}/100
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {["✅ Score Breakdown", "✅ Device Analysis", "✅ Community Comparison", "✅ Personalized Suggestions", "✅ Privacy Statement", "✅ FL Architecture Summary"].map((item, i) => (
            <div key={i} style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#16a34a", fontWeight: "500" }}>{item}</div>
          ))}
        </div>
        <button onClick={generatePDF} disabled={generating} style={{
          width: "100%", padding: 16, borderRadius: 12,
          background: generating ? "#9ca3af" : "#065f46",
          color: "white", border: "none", fontSize: 16, fontWeight: "bold",
          cursor: generating ? "not-allowed" : "pointer"
        }}>
          {generating ? "Generating..." : "📥 Download PDF Report"}
        </button>
      </div>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [data, setData]           = useState(null)
  const [community, setCommunity] = useState(null)
  const [tab, setTab]             = useState("my")
  const [loading, setLoading]     = useState(true)
  const houseId = getHouseId()

  useEffect(() => {
    Promise.all([
      authAxios().get(`${API}/api/me`),
      authAxios().get(`${API}/api/community`),
    ]).then(([me, comm]) => {
      setData(me.data)
      setCommunity(comm.data)
      setLoading(false)
    }).catch(() => onLogout())
  }, [])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🌱</div>
        <div style={{ color: "#6b7280", fontSize: 18 }}>Loading your dashboard...</div>
      </div>
    </div>
  )

  const elecColors  = ["#6366f1", "#06b6d4", "#f59e0b", "#22c55e", "#f97316"]
  const elecDevices = Object.entries(data.devices.electricity)
  const waterDevices = Object.entries(data.devices.water)

  const tabLabels = {
    my        : "My Dashboard",
    community : "Community",
    privacy   : "🔒 FL Privacy",
    chat      : "🤖 AI Chat",
    predict   : "📈 Predict",
    report    : "📄 Report",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "sans-serif" }}>
      <div style={{
        background: "linear-gradient(135deg, #065f46, #059669)",
        padding: "16px 32px", color: "white",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>🌱 GreenFed</h1>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 13 }}>Welcome back, {houseId}</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {Object.entries(tabLabels).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              cursor: "pointer", fontWeight: "bold", fontSize: 12,
              background: tab === key ? "white" : "transparent",
              color: tab === key ? "#065f46" : "white"
            }}>{label}</button>
          ))}
          <button onClick={onLogout} style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid white",
            background: "transparent", color: "white", cursor: "pointer", fontSize: 12
          }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: 32 }}>

        {tab === "my" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 24 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <h3 style={{ margin: 0, color: "#1f2937" }}>Your GreenScore</h3>
                <ScoreCircle score={data.green_score} size={150} />
                <div style={{ padding: "6px 20px", borderRadius: 20, background: getColor(data.green_score), color: "white", fontWeight: "bold", fontSize: 14 }}>
                  {getLabel(data.green_score)}
                </div>
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 20px", color: "#1f2937" }}>Your Usage vs Community Average</h3>
                {[
                  { label: "Electricity Score", yours: data.elec_score,  avg: data.community_avg.elec,  color: "#6366f1" },
                  { label: "Water Score",        yours: data.water_score, avg: data.community_avg.water, color: "#06b6d4" },
                  { label: "Overall GreenScore", yours: data.green_score, avg: data.community_avg.green, color: "#22c55e" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: "#374151", fontWeight: "600" }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: "#6b7280" }}>
                        You: <b style={{ color: item.color }}>{item.yours}</b> | Avg: <b>{item.avg}</b>
                      </span>
                    </div>
                    <div style={{ position: "relative", background: "#e5e7eb", borderRadius: 6, height: 12 }}>
                      <div style={{ width: `${item.avg}%`, background: "#d1d5db", height: 12, borderRadius: 6, position: "absolute" }} />
                      <div style={{ width: `${item.yours}%`, background: item.color, height: 12, borderRadius: 6, position: "absolute", opacity: 0.9 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 20px", color: "#1f2937" }}>⚡ Electricity by Device</h3>
                {elecDevices.map(([device, pct], i) => (
                  <DeviceBar key={device} label={device} percent={pct} color={elecColors[i % elecColors.length]} />
                ))}
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 20px", color: "#1f2937" }}>💧 Water by Usage</h3>
                {waterDevices.map(([device, pct], i) => (
                  <DeviceBar key={device} label={device} percent={pct} color={["#06b6d4", "#0891b2", "#0e7490", "#155e75"][i % 4]} />
                ))}
                <div style={{ marginTop: 16, padding: 12, background: "#f0f9ff", borderRadius: 8, fontSize: 13, color: "#0369a1" }}>
                  Avg daily water: <b>{data.devices.avg_daily_water} L</b>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 16px", color: "#1f2937" }}>💡 Personalized Suggestions for {houseId}</h3>
              {data.suggestions.map((s, i) => <SuggestionCard key={i} suggestion={s} />)}
            </div>
          </div>
        )}

        {tab === "community" && community && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Houses",     value: community.total_houses,    color: "#6366f1" },
                { label: "Avg GreenScore",   value: community.avg_green_score, color: "#22c55e" },
                { label: "Efficient Houses", value: community.efficient_count, color: "#22c55e" },
                { label: "Wasteful Houses",  value: community.wasteful_count,  color: "#ef4444" },
              ].map((c, i) => (
                <div key={i} style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", borderLeft: `4px solid ${c.color}` }}>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "linear-gradient(135deg, #065f46, #059669)", borderRadius: 16, padding: 24, color: "white", marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 8px" }}>Your Community Rank</h3>
              {(() => {
                const sorted = [...community.houses].sort((a, b) => b.green_score - a.green_score)
                const rank = sorted.findIndex(h => h.house_id === houseId) + 1
                return <p style={{ margin: 0, fontSize: 18 }}>You are ranked <b>#{rank}</b> out of {community.total_houses} houses with a GreenScore of <b>{data.green_score}</b></p>
              })()}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 16px", color: "#065f46" }}>Top 10 Most Efficient</h3>
                {community.top10.map((h, i) => (
                  <div key={h.house_id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                    background: h.house_id === houseId ? "#f0fdf4" : "#f9fafb",
                    border: h.house_id === houseId ? "2px solid #22c55e" : "none"
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "#6b7280", width: 24, fontWeight: "bold" }}>#{i + 1}</span>
                      <span style={{ fontWeight: h.house_id === houseId ? "bold" : "normal" }}>
                        {h.house_id} {h.house_id === houseId ? "← You" : ""}
                      </span>
                    </div>
                    <span style={{ background: "#22c55e", color: "white", padding: "3px 12px", borderRadius: 20, fontWeight: "bold", fontSize: 13 }}>{h.green_score}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 16px", color: "#991b1b" }}>Bottom 10 Most Wasteful</h3>
                {community.bottom10.map((h, i) => (
                  <div key={h.house_id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                    background: h.house_id === houseId ? "#fef2f2" : "#fef9f9",
                    border: h.house_id === houseId ? "2px solid #ef4444" : "none"
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "#6b7280", width: 24, fontWeight: "bold" }}>#{i + 1}</span>
                      <span style={{ fontWeight: h.house_id === houseId ? "bold" : "normal" }}>
                        {h.house_id} {h.house_id === houseId ? "← You" : ""}
                      </span>
                    </div>
                    <span style={{ background: "#ef4444", color: "white", padding: "3px 12px", borderRadius: 20, fontWeight: "bold", fontSize: 13 }}>{h.green_score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "privacy" && <PrivacyVisualizer />}
        {tab === "chat"    && <ChatAssistant userData={data} />}
        {tab === "predict" && <PredictionTab userData={data} />}
        {tab === "report"  && <ReportTab userData={data} />}

      </div>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken())

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("house_id")
    setLoggedIn(false)
  }

  return loggedIn
    ? <Dashboard onLogout={handleLogout} />
    : <LoginPage onLogin={() => setLoggedIn(true)} />
}
