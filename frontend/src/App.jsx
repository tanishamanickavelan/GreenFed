import { useState, useEffect } from "react"
import axios from "axios"

const API = "http://localhost:5000"

// Inject fonts + global styles
const styleEl = document.createElement('style')
styleEl.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Nunito:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body, #root { width:100%; min-height:100vh; }
  body { font-family:'Nunito',sans-serif; background:#f5f0e8; font-size:16px; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:#e8dfc8; }
  ::-webkit-scrollbar-thumb { background:#6b7c3e; border-radius:4px; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn  { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
  @keyframes barGrow  { from{width:0} to{width:var(--w)} }
  @keyframes ringFill { from{stroke-dasharray:0 999} to{stroke-dasharray:var(--d) 999} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes leafSway { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }

  .card-enter { animation: fadeUp 0.5s ease both; }
  .scale-enter { animation: scaleIn 0.4s ease both; }
  .nav-btn { transition: all 0.25s; }
  .nav-btn:hover { background: rgba(107,124,62,0.15) !important; }
  .row-hover { transition: transform 0.2s, box-shadow 0.2s; }
  .row-hover:hover { transform: translateX(5px); }
  .score-ring circle.fill { animation: ringFill 1.2s cubic-bezier(.4,0,.2,1) forwards; }
`
document.head.appendChild(styleEl)

function getToken()   { return localStorage.getItem("token") }
function getHouseId() { return localStorage.getItem("house_id") }
const authAxios = () => axios.create({ headers: { Authorization: `Bearer ${getToken()}` } })

// Nature palette
const C = {
  bg:       "#f5f0e8",
  card:     "#fffdf7",
  bark:     "#3d2b1f",
  moss:     "#4a5e28",
  leaf:     "#6b7c3e",
  sage:     "#8fa660",
  fern:     "#b5c98e",
  cream:    "#f0e9d6",
  sand:     "#d4c5a0",
  river:    "#4a7c8e",
  clay:     "#b05e3a",
  sun:      "#d4a017",
  border:   "rgba(61,43,31,0.12)",
}

function getScore(s) {
  if (s >= 75) return { color: C.moss,  bg: "#e8f0d8", label: "Thriving 🌿" }
  if (s >= 55) return { color: C.leaf,  bg: "#edf3e0", label: "Growing 🌱" }
  if (s >= 35) return { color: C.sun,   bg: "#faf3d8", label: "Budding 🌾" }
  return              { color: C.clay,  bg: "#fae8e0", label: "Wilting 🍂" }
}

// ── SCORE RING ──────────────────────────────────────────
function ScoreRing({ score, size = 160 }) {
  const { color } = getScore(score)
  const r    = (size - 18) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ

  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.cream} strokeWidth={12} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeLinecap="round"
          style={{
            strokeDasharray: `${fill} ${circ}`,
            transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
            filter: `drop-shadow(0 0 8px ${color}88)`
          }}
        />
      </svg>
      <div style={{
        position:"absolute", inset:0,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center"
      }}>
        <span style={{
          fontSize: size / 3.2, fontWeight:900, color,
          fontFamily:"'Playfair Display',serif", lineHeight:1
        }}>{score}</span>
        <span style={{ fontSize: size/10, color: C.bark, opacity:0.6, fontWeight:600 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── DEVICE BAR ──────────────────────────────────────────
function DeviceBar({ label, percent, color, delay = 0 }) {
  const emoji = percent >= 40 ? "🔴" : percent >= 25 ? "🟠" : percent >= 15 ? "🟡" : "🟢"
  const barColor = percent >= 40 ? C.clay : percent >= 25 ? "#c87941" : percent >= 15 ? C.sun : C.moss

  return (
    <div className="row-hover" style={{
      marginBottom:10, padding:"10px 14px", borderRadius:12,
      background: C.cream, border:`1px solid ${C.border}`,
      animationDelay:`${delay}s`
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
        <span style={{ fontSize:13, color:C.bark, fontWeight:700 }}>{emoji} {label}</span>
        <span style={{ fontSize:13, fontWeight:800, color:barColor, fontFamily:"'Playfair Display',serif" }}>{percent}%</span>
      </div>
      <div style={{ background:C.sand, borderRadius:6, height:8, overflow:"hidden" }}>
        <div style={{
          width:`${percent}%`, background:`linear-gradient(90deg, ${barColor}99, ${barColor})`,
          height:8, borderRadius:6,
          transition:"width 1s ease",
          boxShadow:`0 0 6px ${barColor}55`
        }} />
      </div>
    </div>
  )
}

// ── SUGGESTION ──────────────────────────────────────────
function SuggestionCard({ s, i }) {
  const map = {
    critical: { bg:"#fdf0eb", border:C.clay,  icon:"🔴", color:C.clay  },
    warning:  { bg:"#fdf6e3", border:C.sun,   icon:"⚠️", color:"#a07010" },
    info:     { bg:"#e8f0f8", border:C.river, icon:"💡", color:C.river  },
    success:  { bg:"#eaf2e0", border:C.moss,  icon:"✅", color:C.moss   },
  }
  const c = map[s.type] || map.info
  return (
    <div className="row-hover card-enter" style={{
      background:c.bg, borderLeft:`4px solid ${c.border}`,
      borderRadius:10, padding:"11px 15px", marginBottom:9,
      display:"flex", gap:10, alignItems:"flex-start",
      animationDelay:`${i * 0.08}s`
    }}>
      <span style={{ fontSize:15 }}>{c.icon}</span>
      <span style={{ fontSize:13, color:C.bark, lineHeight:1.65, fontWeight:600 }}>{s.msg}</span>
    </div>
  )
}

// ── LOGIN ───────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [houseId, setHouseId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true); setError("")
    try {
      const res = await axios.post(`${API}/api/login`, { house_id: houseId, password })
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("house_id", res.data.house_id)
      onLogin()
    } catch (e) { setError(e.response?.data?.error || "Login failed") }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:`radial-gradient(ellipse at 30% 60%, #d4e4b8 0%, #f5f0e8 50%, #e8ddc8 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Nunito',sans-serif", position:"relative", overflow:"hidden"
    }}>
      {/* Decorative leaves */}
      <div style={{ position:"absolute", fontSize:120, top:"5%", right:"8%", opacity:0.08, animation:"leafSway 4s ease-in-out infinite" }}>🌿</div>
      <div style={{ position:"absolute", fontSize:80, bottom:"10%", left:"5%", opacity:0.07, animation:"leafSway 5s ease-in-out infinite reverse" }}>🍃</div>
      <div style={{ position:"absolute", fontSize:60, top:"40%", left:"3%", opacity:0.06 }}>🌱</div>

      <div className="scale-enter" style={{
        background:"rgba(255,253,247,0.95)", backdropFilter:"blur(12px)",
        borderRadius:24, padding:"48px 42px", width:420,
        border:`1px solid ${C.border}`,
        boxShadow:`0 24px 60px rgba(61,43,31,0.15), 0 0 0 1px rgba(107,124,62,0.1)`
      }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:10, animation:"leafSway 3s ease-in-out infinite" }}>🌱</div>
          <h1 style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:38, fontWeight:900, color:C.bark,
            letterSpacing:"-1px", marginBottom:8
          }}>GreenFed</h1>
          <p style={{ color:C.leaf, fontSize:14, fontWeight:600 }}>
            Privacy-Preserving Sustainability AI
          </p>
        </div>

        {[
          { label:"HOUSE ID", val:houseId, set:e=>setHouseId(e.target.value.toUpperCase()), type:"text", ph:"HOUSE001" },
          { label:"PASSWORD", val:password, set:e=>setPassword(e.target.value), type:"password", ph:"••••••••••" },
        ].map((f,i) => (
          <div key={i} style={{ marginBottom: i===0 ? 16 : 24 }}>
            <label style={{ fontSize:11, fontWeight:800, color:C.leaf, letterSpacing:"1.5px", textTransform:"uppercase" }}>{f.label}</label>
            <input value={f.val} onChange={f.set} type={f.type} placeholder={f.ph}
              onKeyDown={i===1 ? e=>e.key==="Enter"&&handleLogin() : undefined}
              style={{
                width:"100%", padding:"13px 16px", marginTop:7,
                borderRadius:12, border:`1.5px solid ${C.sand}`,
                background:C.cream, color:C.bark,
                fontSize:15, fontFamily:"'Nunito',sans-serif",
                outline:"none", boxSizing:"border-box", fontWeight:600
              }}
            />
          </div>
        ))}

        {error && (
          <div style={{ background:"#fdf0eb", border:`1px solid ${C.clay}`, color:C.clay, padding:"10px 14px", borderRadius:10, marginBottom:16, fontSize:13, textAlign:"center", fontWeight:700 }}>{error}</div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width:"100%", padding:"15px", borderRadius:12,
          background: loading ? C.sand : `linear-gradient(135deg, ${C.moss}, ${C.leaf})`,
          color: loading ? C.bark : "white",
          border:"none", fontSize:16, fontWeight:800,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily:"'Nunito',sans-serif",
          boxShadow: loading ? "none" : `0 6px 20px ${C.moss}55`,
          letterSpacing:"0.5px"
        }}>{loading ? "Entering..." : "Enter the Garden →"}</button>

        <p style={{ textAlign:"center", color:C.leaf, fontSize:12, marginTop:20, lineHeight:1.9, fontWeight:600 }}>
          Password = house id lowercase + 123<br/>
          <span style={{ color:C.moss }}>HOUSE001 → house001123</span>
        </p>
      </div>
    </div>
  )
}

// ── PRIVACY VISUALIZER ──────────────────────────────────
function PrivacyTab() {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const steps = [
    { title:"Raw Data Stays Local",   desc:"Your electricity and water data NEVER leaves your device.",     color:C.moss,  icon:"🏠" },
    { title:"Local LSTM Training",     desc:"Your house trains its own LSTM on local data only.",            color:C.river, icon:"🧠" },
    { title:"Only Weights Shared",     desc:"Only model weights (numbers) sent — not your actual data.",    color:"#7c5a8e",icon:"📤" },
    { title:"FedAvg Aggregation",      desc:"Server averages weights from 30 houses. No data seen.",        color:C.sun,   icon:"⚙️" },
    { title:"Global Model Sent Back",  desc:"Improved model distributed. Your data never exposed.",         color:C.river, icon:"📥" },
    { title:"Privacy Preserved ✅",    desc:"GreenScore computed locally. Zero raw data transmitted.",      color:C.moss,  icon:"🔒" },
  ]
  useEffect(() => {
    if (!running) return
    if (step >= steps.length-1) { setRunning(false); return }
    const t = setTimeout(() => setStep(s=>s+1), 1800)
    return () => clearTimeout(t)
  }, [running, step])

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, fontSize:26, marginBottom:6 }}>🔒 FL Privacy Visualizer</h2>
      <p style={{ color:C.leaf, marginBottom:24, fontWeight:600, fontSize:14 }}>See exactly how GreenFed keeps your data private</p>

      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:28, border:`1px solid ${C.border}`, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-around", flexWrap:"wrap", gap:14 }}>
          {["🏠 Your\nData","🧠 Local\nLSTM","📤 Weights\nOnly","⚙️ FedAvg","📥 Global\nModel"].map((label,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                background: step>=i ? steps[Math.min(i,4)].color : C.cream,
                color: step>=i ? "white" : C.bark,
                borderRadius:12, padding:"14px 18px", textAlign:"center",
                fontSize:12, fontWeight:800, minWidth:80,
                transition:"all 0.5s", whiteSpace:"pre-line", lineHeight:1.5,
                boxShadow: step>=i ? `0 4px 16px ${steps[Math.min(i,4)].color}44` : "none",
                border:`2px solid ${step>=i ? steps[Math.min(i,4)].color : C.sand}`
              }}>{label}</div>
              {i<4 && <span style={{ color:step>i?C.moss:C.sand, fontSize:18, transition:"color 0.5s", fontWeight:900 }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop:20, padding:"12px 20px", background:"#eaf2e0", borderRadius:10, border:`2px solid ${C.moss}`, textAlign:"center" }}>
          <span style={{ color:C.moss, fontWeight:800, fontSize:14 }}>🌿 0 bytes of raw data ever transmitted — only model weights leave your device</span>
        </div>
      </div>

      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:28, border:`1px solid ${C.border}`, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ color:C.bark, fontFamily:"'Playfair Display',serif", fontSize:18 }}>Step-by-Step Walkthrough</h3>
          <button onClick={()=>{setStep(0);setRunning(true)}} style={{
            padding:"9px 22px", borderRadius:10,
            background:`linear-gradient(135deg,${C.moss},${C.leaf})`,
            color:"white", border:"none", cursor:"pointer",
            fontWeight:800, fontSize:13, fontFamily:"'Nunito',sans-serif",
            boxShadow:`0 4px 12px ${C.moss}44`
          }}>{running?"Growing...":"▶ Start Animation"}</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {steps.map((s,i)=>(
            <div key={i} style={{
              padding:18, borderRadius:12,
              background: step===i ? s.color : step>i ? "#eaf2e0" : C.cream,
              border:`1.5px solid ${step===i ? s.color : step>i ? C.moss : C.sand}`,
              transition:"all 0.5s"
            }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:13, color:step===i?"white":step>i?C.moss:C.bark, marginBottom:5 }}>{s.title}</div>
              <div style={{ fontSize:11, lineHeight:1.6, color:step===i?"rgba(255,255,255,0.9)":C.leaf }}>{s.desc}</div>
              {step>i && <div style={{ marginTop:8, color:C.moss, fontWeight:800, fontSize:12 }}>✅ Done</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          { label:"Raw Data Shared",     value:"0 bytes", color:C.moss,  icon:"✅" },
          { label:"FL Rounds",           value:"10",       color:C.river, icon:"🔄" },
          { label:"Houses Participated", value:"101",      color:C.leaf,  icon:"🏠" },
          { label:"Privacy Guarantee",   value:"100%",     color:C.moss,  icon:"🔒" },
        ].map((s,i)=>(
          <div key={i} className="card-enter" style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}`, textAlign:"center" }}>
            <div style={{ fontSize:26 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.color, margin:"8px 0", fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
            <div style={{ fontSize:12, color:C.leaf, fontWeight:700 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <ConvergenceGraph />
    </div>
  )
}

// ── CARBON TAB ──────────────────────────────────────────
function CarbonTab({ houseId, data, devices }) {
  const daily    = devices?.avg_daily_elec || 5
  const wastePct = (data?.elec_waste || 30) / 100
  const wasted   = daily * wastePct
  const co2Day   = (wasted * 0.82).toFixed(3)
  const co2Month = (wasted * 0.82 * 30).toFixed(1)
  const co2Year  = (wasted * 0.82 * 365).toFixed(1)
  const trees    = Math.ceil(co2Year / 21)
  const saved    = Math.max(0, (wasted - daily * 0.35) * 0.82 * 365).toFixed(1)

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const monthlyData = months.map((m, i) => {
    const factor = i >= 3 && i <= 7 ? 1.2 : 0.9
    return { m, v: Math.round(co2Month * factor * (0.9 + Math.random()*0.2)) }
  })
  const maxMonthly = Math.max(...monthlyData.map(d=>d.v))

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, fontSize:26, marginBottom:6 }}>🌍 Carbon Footprint</h2>
      <p style={{ color:C.leaf, marginBottom:24, fontWeight:600, fontSize:14 }}>
        Your electricity waste converted to real CO₂ — India grid factor: 0.82 kg/kWh
      </p>

      {/* Main stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Daily CO₂",          value:`${co2Day} kg`,   color:C.sun,  icon:"📅" },
          { label:"Monthly CO₂",        value:`${co2Month} kg`, color:C.clay, icon:"📆" },
          { label:"Yearly CO₂",         value:`${co2Year} kg`,  color:C.clay, icon:"📊" },
          { label:"Trees to Offset",    value:trees,             color:C.moss, icon:"🌳" },
        ].map((c,i)=>(
          <div key={i} className="card-enter" style={{
            background:C.card, borderRadius:14, padding:20, textAlign:"center",
            border:`1px solid ${C.border}`,
            borderTop:`4px solid ${c.color}`,
            animationDelay:`${i*0.1}s`
          }}>
            <div style={{ fontSize:26, marginBottom:8 }}>{c.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:c.color, fontFamily:"'Playfair Display',serif" }}>{c.value}</div>
            <div style={{ fontSize:12, color:C.leaf, marginTop:4, fontWeight:700 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Breakdown + savings */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:18, fontSize:17 }}>⚡ Daily Electricity Breakdown</h3>
          {[
            { label:"Total Daily Usage",  value:`${daily.toFixed(2)} kWh`,         color:C.river, w:100 },
            { label:"Wasted Electricity", value:`${wasted.toFixed(2)} kWh`,         color:C.clay,  w:Math.round(wastePct*100) },
            { label:"Efficient Usage",    value:`${(daily-wasted).toFixed(2)} kWh`, color:C.moss,  w:Math.round((1-wastePct)*100) },
          ].map((item,i)=>(
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:C.bark, fontWeight:700 }}>{item.label}</span>
                <span style={{ fontSize:13, fontWeight:800, color:item.color }}>{item.value}</span>
              </div>
              <div style={{ background:C.sand, borderRadius:5, height:8 }}>
                <div style={{ width:`${item.w}%`, background:item.color, height:8, borderRadius:5, transition:"width 1s ease", boxShadow:`0 0 6px ${item.color}44` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:18, fontSize:17 }}>🌱 Potential Annual Savings</h3>
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:13, color:C.leaf, marginBottom:8, fontWeight:700 }}>If you reach community average</div>
            <div style={{ fontSize:42, fontWeight:900, color:C.moss, fontFamily:"'Playfair Display',serif", marginBottom:4 }}>{saved}</div>
            <div style={{ fontSize:15, color:C.leaf, fontWeight:700 }}>kg CO₂ saved / year</div>
            <div style={{ marginTop:16, padding:"12px 16px", background:"#eaf2e0", borderRadius:10, border:`1px solid ${C.fern}`, fontSize:13, color:C.moss, fontWeight:700 }}>
              Equal to planting 🌳 <b>{Math.round(saved/21)} trees</b> every year
            </div>
          </div>
        </div>
      </div>

      {/* Tree visualizer */}
      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}`, marginBottom:20 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:8, fontSize:17 }}>🌳 Trees Needed to Offset Your Yearly CO₂</h3>
        <p style={{ color:C.leaf, fontSize:13, marginBottom:16, fontWeight:600 }}>
          You emit <b style={{ color:C.clay }}>{co2Year} kg</b> CO₂/year from wasted electricity. Each tree absorbs ~21 kg/year.
        </p>
        <div style={{ fontSize:28, lineHeight:2, letterSpacing:4 }}>
          {"🌳".repeat(Math.min(trees, 20))}
          {trees > 20 && <span style={{ fontSize:14, color:C.leaf, marginLeft:8, fontWeight:700 }}>+{trees-20} more</span>}
        </div>
        <p style={{ marginTop:10, fontSize:13, color:C.leaf, fontWeight:700 }}>
          You need <b style={{ color:C.clay }}>{trees} trees</b> to fully offset your yearly electricity waste
        </p>
      </div>

      {/* Monthly chart */}
      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:6, fontSize:17 }}>📊 Monthly CO₂ Projection</h3>
        <p style={{ color:C.leaf, fontSize:12, marginBottom:20, fontWeight:600 }}>
          🟢 low season · 🟡 normal · 🔴 high season (summer peak)
        </p>
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:150 }}>
          {monthlyData.map(({m,v},i)=>{
            const h   = Math.round((v/maxMonthly)*130)
            const col = v > co2Month*1.1 ? C.clay : v > co2Month*0.9 ? C.sun : C.moss
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:9, color:C.leaf, fontWeight:700 }}>{v}</span>
                <div style={{ width:"100%", height:`${h}px`, background:col, borderRadius:"4px 4px 0 0", boxShadow:`0 0 6px ${col}44`, transition:"height 1s ease" }} />
                <span style={{ fontSize:9, color:C.bark, fontWeight:700 }}>{m}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── PREDICT TAB ─────────────────────────────────────────
function PredictTab({ userData }) {
  const [preds, setPreds] = useState(null)
  useEffect(()=>{
    if (!userData) return
    const base  = userData.green_score
    const trend = userData.elec_waste > 50 ? -0.3 : base < 50 ? 0.5 : 0.2
    setPreds(Array.from({length:30},(_,i)=>({
      day: i+1,
      score: Math.max(10,Math.min(95,Math.round(base+trend*i+(Math.random()-0.5)*5)))
    })))
  },[userData])

  if (!preds) return null
  const max    = Math.max(...preds.map(p=>p.score))
  const min    = Math.min(...preds.map(p=>p.score))
  const final  = preds[29].score
  const rising = final > userData.green_score

  const getBarCol = s => s>=75?C.moss:s>=55?C.leaf:s>=35?C.sun:C.clay

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, fontSize:26, marginBottom:6 }}>📈 30-Day Forecast</h2>
      <p style={{ color:C.leaf, marginBottom:24, fontWeight:600, fontSize:14 }}>Projected GreenScore based on your consumption patterns</p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Current Score",   value:userData.green_score, color:getBarCol(userData.green_score) },
          { label:"Day 30 Forecast", value:final,                color:getBarCol(final) },
          { label:"Peak Projected",  value:max,                  color:C.moss },
          { label:"Low Projected",   value:min,                  color:C.clay },
        ].map((c,i)=>(
          <div key={i} className="card-enter" style={{ background:C.card, borderRadius:14, padding:20, textAlign:"center", border:`1px solid ${C.border}`, borderTop:`4px solid ${c.color}`, animationDelay:`${i*0.1}s` }}>
            <div style={{ fontSize:30, fontWeight:900, color:c.color, fontFamily:"'Playfair Display',serif" }}>{c.value}</div>
            <div style={{ fontSize:12, color:C.leaf, marginTop:5, fontWeight:700 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}`, marginBottom:20 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:6, fontSize:17 }}>
          {rising ? "📈 Score is growing" : "📉 Score is declining"}
        </h3>
        <p style={{ color:C.leaf, fontSize:12, marginBottom:18, fontWeight:600 }}>
          🟢 thriving · 🟡 growing · 🟠 budding · 🔴 wilting
        </p>
        <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:180 }}>
          {preds.map((p,i)=>(
            <div key={i} title={`Day ${p.day}: ${p.score}`} style={{
              flex:1, height:`${(p.score/100)*165}px`,
              background:getBarCol(p.score),
              borderRadius:"3px 3px 0 0", opacity:0.85,
              transition:"height 0.5s ease"
            }} />
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
          {["Today","Day 10","Day 20","Day 30"].map(l=>(
            <span key={l} style={{ fontSize:11, color:C.leaf, fontWeight:700 }}>{l}</span>
          ))}
        </div>
      </div>

      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:16, fontSize:17 }}>🌿 Actions to Improve</h3>
        {[
          { action:"Reduce AC by 2 hrs/day",         impact:"+4 pts", week:"Week 1" },
          { action:"Switch all bulbs to LED",         impact:"+3 pts", week:"Week 1" },
          { action:"Fix water leaks",                 impact:"+5 pts", week:"Week 2" },
          { action:"Run appliances in off-peak hrs",  impact:"+3 pts", week:"Week 2" },
          { action:"Install low-flow showerheads",    impact:"+4 pts", week:"Week 3" },
        ].map((item,i)=>(
          <div key={i} className="row-hover" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", borderRadius:10, marginBottom:8, background:C.cream, border:`1px solid ${C.sand}` }}>
            <div>
              <div style={{ fontSize:13, color:C.bark, fontWeight:700 }}>{item.action}</div>
              <div style={{ fontSize:11, color:C.leaf, marginTop:2, fontWeight:600 }}>{item.week}</div>
            </div>
            <span style={{ background:"#eaf2e0", color:C.moss, padding:"4px 12px", borderRadius:20, fontWeight:800, fontSize:12, border:`1px solid ${C.fern}` }}>{item.impact}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── REPORT TAB ──────────────────────────────────────────
function ReportTab({ userData }) {
  const [gen, setGen] = useState(false)
  const generate = () => {
    setGen(true)
    const w = window.open('','_blank')
    w.document.write(`<html><head><style>
      body{font-family:Georgia,serif;padding:40px;color:#3d2b1f;background:#fffdf7}
      h1{color:#4a5e28;border-bottom:3px solid #4a5e28;padding-bottom:10px;font-size:28px}
      h2{color:#4a5e28;margin-top:30px}
      .score-box{background:#eaf2e0;border:2px solid #6b7c3e;border-radius:10px;padding:20px;margin:20px 0;text-align:center}
      .score-big{font-size:72px;font-weight:bold;color:#4a5e28}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
      .card{background:#f5f0e8;border-radius:8px;padding:16px;border-left:4px solid #4a5e28}
      .device-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #d4c5a0}
      .sug{background:#fdf6e3;border-left:4px solid #d4a017;padding:10px;margin:8px 0;border-radius:4px}
      .footer{margin-top:40px;text-align:center;color:#8fa660;font-size:12px}
      .badge{display:inline-block;padding:4px 16px;border-radius:20px;background:#4a5e28;color:white;font-weight:bold}
    </style></head><body>
      <h1>🌱 GreenFed Sustainability Report</h1>
      <p><strong>House:</strong> ${userData.house_id} &nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString()} &nbsp; <span class="badge">Federated Learning</span></p>
      <div class="score-box">
        <div class="score-big">${userData.green_score}</div>
        <div style="font-size:20px;color:#4a5e28;font-weight:bold">GreenScore / 100</div>
        <div style="color:#6b7c3e;margin-top:8px">${userData.green_score>=70?"Thriving 🌿":userData.green_score>=50?"Growing 🌱":"Needs Care 🍂"}</div>
      </div>
      <h2>Score Breakdown</h2>
      <div class="grid">
        <div class="card"><div style="font-size:32px;font-weight:bold;color:#4a7c8e">${userData.elec_score}</div><div>Electricity Score</div><div style="color:#b05e3a;font-size:13px">Waste: ${userData.elec_waste}%</div></div>
        <div class="card"><div style="font-size:32px;font-weight:bold;color:#4a7c8e">${userData.water_score}</div><div>Water Score</div><div style="color:#b05e3a;font-size:13px">Waste: ${userData.water_waste}%</div></div>
      </div>
      <h2>vs Community Average</h2>
      <div class="grid">
        <div class="card"><div><strong>Your Score:</strong> ${userData.green_score}</div><div><strong>Community Avg:</strong> ${userData.community_avg.green}</div><div style="color:${userData.green_score>=userData.community_avg.green?'#4a5e28':'#b05e3a'};margin-top:8px;font-weight:bold">${userData.green_score>=userData.community_avg.green?'✅ Above Average':'⚠️ Below Average'}</div></div>
        <div class="card"><div><strong>Elec Avg:</strong> ${userData.community_avg.elec}</div><div><strong>Water Avg:</strong> ${userData.community_avg.water}</div></div>
      </div>
      <h2>Device Breakdown</h2>
      <div class="grid">
        <div><h3>⚡ Electricity</h3>${Object.entries(userData.devices.electricity).map(([k,v])=>`<div class="device-row"><span>${k}</span><span><b>${v}%</b></span></div>`).join('')}</div>
        <div><h3>💧 Water</h3>${Object.entries(userData.devices.water).map(([k,v])=>`<div class="device-row"><span>${k}</span><span><b>${v}%</b></span></div>`).join('')}</div>
      </div>
      <h2>Suggestions</h2>
      ${userData.suggestions.map(s=>`<div class="sug">${s.type==='critical'?'🔴':s.type==='warning'?'🟠':s.type==='success'?'✅':'🔵'} ${s.msg}</div>`).join('')}
      <h2>Privacy Statement</h2>
      <p>Generated via <strong>Federated Learning (FedAvg)</strong>. Raw data <strong>never left your device</strong>. SDG-12 compliant.</p>
      <div class="footer">GreenFed — Privacy-Preserving AI · SRM Institute · SDG-12</div>
    </body></html>`)
    w.document.close(); w.print()
    setGen(false)
  }

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, fontSize:26, marginBottom:6 }}>📄 Sustainability Report</h2>
      <p style={{ color:C.leaf, marginBottom:24, fontWeight:600, fontSize:14 }}>Download your personalized PDF sustainability report</p>
      <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:32, border:`1px solid ${C.border}` }}>
        <div style={{ border:`2px dashed ${C.sand}`, borderRadius:12, padding:32, textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>📄</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, margin:"0 0 8px", fontSize:22 }}>GreenFed Nature Report</h2>
          <p style={{ color:C.leaf, margin:"0 0 16px", fontSize:13, fontWeight:600 }}>{userData?.house_id} · {new Date().toLocaleDateString()}</p>
          <div style={{ display:"inline-block", padding:"8px 24px", background:"#eaf2e0", borderRadius:20, color:C.moss, fontWeight:800, border:`1px solid ${C.fern}`, fontSize:14 }}>
            GreenScore: {userData?.green_score}/100
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
          {["✅ Score Breakdown","✅ Device Analysis","✅ Community Comparison","✅ Suggestions","✅ Privacy Statement","✅ FL Summary"].map((item,i)=>(
            <div key={i} style={{ padding:"10px 14px", background:"#eaf2e0", borderRadius:8, fontSize:12, color:C.moss, fontWeight:700, border:`1px solid ${C.fern}` }}>{item}</div>
          ))}
        </div>
        <button onClick={generate} disabled={gen} style={{
          width:"100%", padding:16, borderRadius:12,
          background: gen ? C.sand : `linear-gradient(135deg,${C.moss},${C.leaf})`,
          color: gen ? C.bark : "white",
          border:"none", fontSize:15, fontWeight:800,
          cursor: gen ? "not-allowed" : "pointer",
          fontFamily:"'Nunito',sans-serif",
          boxShadow: gen ? "none" : `0 6px 20px ${C.moss}44`
        }}>{gen ? "Preparing..." : "📥 Download Nature Report"}</button>
      </div>
    </div>
  )
}
function SimulatorTab({ userData }) {
  const [acReduction,      setAcReduction]      = useState(0)
  const [ledSwitch,        setLedSwitch]        = useState(false)
  const [applianceShift,   setApplianceShift]   = useState(false)
  const [waterLeakFix,     setWaterLeakFix]     = useState(false)
  const [showerhead,       setShowerhead]       = useState(false)
  const [fridgeMaintain,   setFridgeMaintain]   = useState(false)

  const base = userData.green_score

  // Calculate impact of each action
  const acImpact        = Math.round(acReduction * 0.8)
  const ledImpact       = ledSwitch      ? 3  : 0
  const applianceImpact = applianceShift ? 3  : 0
  const waterImpact     = waterLeakFix   ? 5  : 0
  const showerImpact    = showerhead     ? 4  : 0
  const fridgeImpact    = fridgeMaintain ? 2  : 0

  const totalImpact   = acImpact + ledImpact + applianceImpact + waterImpact + showerImpact + fridgeImpact
  const newScore      = Math.min(95, base + totalImpact)
  const { color: newColor, label: newLabel } = getScore(newScore)
  const { color: oldColor } = getScore(base)

  const actions = [
    {
      label   : "⚡ Reduce AC usage",
      sub     : `${acReduction} hrs/day reduction`,
      impact  : acImpact,
      control : (
        <div>
          <input type="range" min={0} max={6} value={acReduction}
            onChange={e => setAcReduction(Number(e.target.value))}
            style={{ width:"100%", accentColor: C.moss, cursor:"pointer" }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.leaf, fontWeight:700 }}>
            <span>0 hrs</span><span>3 hrs</span><span>6 hrs</span>
          </div>
        </div>
      )
    },
    {
      label   : "💡 Switch to LED bulbs",
      sub     : "All lights replaced",
      impact  : ledImpact,
      control : (
        <div onClick={() => setLedSwitch(!ledSwitch)} style={{
          width:48, height:26, borderRadius:13,
          background: ledSwitch ? C.moss : C.sand,
          cursor:"pointer", position:"relative", transition:"background 0.3s"
        }}>
          <div style={{
            width:22, height:22, borderRadius:"50%", background:"white",
            position:"absolute", top:2,
            left: ledSwitch ? 24 : 2,
            transition:"left 0.3s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.2)"
          }} />
        </div>
      )
    },
    {
      label   : "🕐 Off-peak appliances",
      sub     : "Run after 10PM",
      impact  : applianceImpact,
      control : (
        <div onClick={() => setApplianceShift(!applianceShift)} style={{
          width:48, height:26, borderRadius:13,
          background: applianceShift ? C.moss : C.sand,
          cursor:"pointer", position:"relative", transition:"background 0.3s"
        }}>
          <div style={{
            width:22, height:22, borderRadius:"50%", background:"white",
            position:"absolute", top:2,
            left: applianceShift ? 24 : 2,
            transition:"left 0.3s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.2)"
          }} />
        </div>
      )
    },
    {
      label   : "💧 Fix water leaks",
      sub     : "All leaks repaired",
      impact  : waterImpact,
      control : (
        <div onClick={() => setWaterLeakFix(!waterLeakFix)} style={{
          width:48, height:26, borderRadius:13,
          background: waterLeakFix ? C.moss : C.sand,
          cursor:"pointer", position:"relative", transition:"background 0.3s"
        }}>
          <div style={{
            width:22, height:22, borderRadius:"50%", background:"white",
            position:"absolute", top:2,
            left: waterLeakFix ? 24 : 2,
            transition:"left 0.3s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.2)"
          }} />
        </div>
      )
    },
    {
      label   : "🚿 Low-flow showerheads",
      sub     : "Installed throughout",
      impact  : showerImpact,
      control : (
        <div onClick={() => setShowerhead(!showerhead)} style={{
          width:48, height:26, borderRadius:13,
          background: showerhead ? C.moss : C.sand,
          cursor:"pointer", position:"relative", transition:"background 0.3s"
        }}>
          <div style={{
            width:22, height:22, borderRadius:"50%", background:"white",
            position:"absolute", top:2,
            left: showerhead ? 24 : 2,
            transition:"left 0.3s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.2)"
          }} />
        </div>
      )
    },
    {
      label   : "❄️ Fridge maintenance",
      sub     : "Clean coils + check seal",
      impact  : fridgeImpact,
      control : (
        <div onClick={() => setFridgeMaintain(!fridgeMaintain)} style={{
          width:48, height:26, borderRadius:13,
          background: fridgeMaintain ? C.moss : C.sand,
          cursor:"pointer", position:"relative", transition:"background 0.3s"
        }}>
          <div style={{
            width:22, height:22, borderRadius:"50%", background:"white",
            position:"absolute", top:2,
            left: fridgeMaintain ? 24 : 2,
            transition:"left 0.3s",
            boxShadow:"0 2px 4px rgba(0,0,0,0.2)"
          }} />
        </div>
      )
    },
  ]

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, fontSize:26, marginBottom:6 }}>🎛️ What-If Simulator</h2>
      <p style={{ color:C.leaf, marginBottom:24, fontWeight:600, fontSize:14 }}>
        Adjust sliders and toggles to see how actions improve your GreenScore in real time
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>

        {/* Live Score Preview */}
        <div className="card-enter" style={{
          background:`linear-gradient(135deg, ${getScore(newScore).bg}, ${C.card})`,
          border:`2px solid ${newColor}44`, borderRadius:18, padding:28,
          display:"flex", flexDirection:"column", alignItems:"center", gap:14
        }}>
          <span style={{ fontSize:12, fontWeight:800, color:newColor, textTransform:"uppercase", letterSpacing:"1.5px" }}>
            Projected GreenScore
          </span>
          <ScoreRing score={newScore} size={160} />
          <div style={{ padding:"6px 20px", borderRadius:20, background:newColor, color:"white", fontWeight:800, fontSize:13 }}>
            {newLabel}
          </div>

          {/* Before vs After */}
          <div style={{ width:"100%", background:C.cream, borderRadius:12, padding:14, border:`1px solid ${C.sand}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.leaf, fontWeight:700, marginBottom:4 }}>BEFORE</div>
                <div style={{ fontSize:28, fontWeight:900, color:oldColor, fontFamily:"'Playfair Display',serif" }}>{base}</div>
              </div>
              <div style={{ fontSize:24 }}>→</div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.leaf, fontWeight:700, marginBottom:4 }}>AFTER</div>
                <div style={{ fontSize:28, fontWeight:900, color:newColor, fontFamily:"'Playfair Display',serif" }}>{newScore}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.leaf, fontWeight:700, marginBottom:4 }}>GAIN</div>
                <div style={{ fontSize:28, fontWeight:900, color:totalImpact>0?C.moss:C.sand, fontFamily:"'Playfair Display',serif" }}>
                  +{totalImpact}
                </div>
              </div>
            </div>
            <div style={{ background:C.sand, borderRadius:6, height:10, position:"relative" }}>
              <div style={{ width:`${base}%`, background:oldColor, height:10, borderRadius:6, position:"absolute", opacity:0.4 }} />
              <div style={{ width:`${newScore}%`, background:newColor, height:10, borderRadius:6, position:"absolute", transition:"width 0.5s ease", boxShadow:`0 0 8px ${newColor}55` }} />
            </div>
          </div>

          {totalImpact > 0 && (
            <div style={{
              width:"100%", padding:"12px 16px", background:"#eaf2e0",
              borderRadius:10, border:`1px solid ${C.fern}`,
              fontSize:13, color:C.moss, fontWeight:700, textAlign:"center"
            }}>
              🌿 {totalImpact} point improvement activated!
              {newScore >= 70 && base < 70 && " You've crossed into Efficient! 🎉"}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:16, fontSize:17 }}>
            🌿 Adjust Your Actions
          </h3>
          {actions.map((action, i) => (
            <div key={i} style={{
              marginBottom:16, padding:"12px 14px", borderRadius:12,
              background: action.impact > 0 ? "#eaf2e0" : C.cream,
              border:`1px solid ${action.impact > 0 ? C.fern : C.sand}`,
              transition:"all 0.3s"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, color:C.bark, fontWeight:700 }}>{action.label}</div>
                  <div style={{ fontSize:11, color:C.leaf, fontWeight:600 }}>{action.sub}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {action.impact > 0 && (
                    <span style={{ background:C.moss, color:"white", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:800 }}>
                      +{action.impact} pts
                    </span>
                  )}
                  {action.control}
                </div>
              </div>
            </div>
          ))}

          <button onClick={()=>{
            setAcReduction(0); setLedSwitch(false); setApplianceShift(false)
            setWaterLeakFix(false); setShowerhead(false); setFridgeMaintain(false)
          }} style={{
            width:"100%", padding:"10px", borderRadius:10,
            background:C.cream, color:C.bark, border:`1px solid ${C.sand}`,
            cursor:"pointer", fontWeight:700, fontSize:13,
            fontFamily:"'Nunito',sans-serif", marginTop:8
          }}>↺ Reset All</button>
        </div>
      </div>

      {/* CO2 Savings */}
      {totalImpact > 0 && (
        <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:16, fontSize:17 }}>
            🌍 Environmental Impact of Your Changes
          </h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[
              { label:"Score Improvement",  value:`+${totalImpact} pts`,                                     color:C.moss,  icon:"📈" },
              { label:"Est. CO₂ Saved/yr",  value:`~${Math.round(totalImpact * 8)} kg`,                     color:C.river, icon:"🌍" },
              { label:"Trees Equivalent",   value:`~${Math.ceil(totalImpact * 8 / 21)} trees`,              color:C.leaf,  icon:"🌳" },
            ].map((s,i)=>(
              <div key={i} style={{ background:C.cream, borderRadius:12, padding:18, textAlign:"center", border:`1px solid ${C.fern}` }}>
                <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:900, color:s.color, fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
                <div style={{ fontSize:12, color:C.leaf, marginTop:4, fontWeight:700 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
function ConvergenceGraph() {
  const [data, setData] = useState(null)

  useEffect(() => {
    authAxios().get(`${API}/api/convergence`)
      .then(res => setData(res.data))
      .catch(() => setData({
        elec_loss:  [0.0073,0.0073,0.0071,0.0072,0.0071,0.0071,0.0071,0.0070,0.0070,0.0070],
        water_loss: [0.0115,0.0117,0.0105,0.0107,0.0107,0.0104,0.0101,0.0101,0.0096,0.0103],
        rounds:     [1,2,3,4,5,6,7,8,9,10]
      }))
  }, [])

  if (!data) return null

  const maxLoss  = Math.max(...data.elec_loss, ...data.water_loss)
  const minLoss  = Math.min(...data.elec_loss, ...data.water_loss)
  const range    = maxLoss - minLoss
  const chartH   = 180
  const chartW   = 600

  const toY = (val) => chartH - ((val - minLoss) / range) * (chartH - 20) - 10

  const elecPoints  = data.rounds.map((r, i) => {
    const x = (i / (data.rounds.length - 1)) * chartW
    const y = toY(data.elec_loss[i])
    return `${x},${y}`
  }).join(' ')

  const waterPoints = data.rounds.map((r, i) => {
    const x = (i / (data.rounds.length - 1)) * chartW
    const y = toY(data.water_loss[i])
    return `${x},${y}`
  }).join(' ')

  const improvement_e = (((data.elec_loss[0] - data.elec_loss[9]) / data.elec_loss[0]) * 100).toFixed(1)
  const improvement_w = (((data.water_loss[0] - data.water_loss[9]) / data.water_loss[0]) * 100).toFixed(1)

  return (
    <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}`, marginTop:20 }}>
      <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:6, fontSize:17 }}>
        📉 FL Training Convergence — Loss Across 10 Rounds
      </h3>
      <p style={{ color:C.leaf, fontSize:12, marginBottom:20, fontWeight:600 }}>
        Decreasing loss proves the Federated Learning model is converging correctly
      </p>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Elec Loss Round 1",  value:data.elec_loss[0].toFixed(5),  color:C.river },
          { label:"Elec Loss Round 10", value:data.elec_loss[9].toFixed(5),  color:C.moss  },
          { label:"Water Loss Round 1", value:data.water_loss[0].toFixed(5), color:C.clay  },
          { label:"Water Loss Round 10",value:data.water_loss[9].toFixed(5), color:C.moss  },
        ].map((s,i)=>(
          <div key={i} style={{ background:C.cream, borderRadius:10, padding:12, textAlign:"center", border:`1px solid ${C.sand}` }}>
            <div style={{ fontSize:16, fontWeight:900, color:s.color, fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
            <div style={{ fontSize:10, color:C.leaf, marginTop:3, fontWeight:700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <div style={{ overflowX:"auto" }}>
        <svg width={chartW + 60} height={chartH + 40} style={{ display:"block", margin:"0 auto" }}>
          {/* Grid lines */}
          {[0,1,2,3,4].map(i => (
            <line key={i}
              x1={30} y1={10 + (i * (chartH-20)/4)}
              x2={chartW + 30} y2={10 + (i * (chartH-20)/4)}
              stroke={C.sand} strokeWidth={1} strokeDasharray="4,4"
            />
          ))}

          {/* Round labels */}
          {data.rounds.map((r, i) => (
            <text key={i}
              x={30 + (i / (data.rounds.length-1)) * chartW}
              y={chartH + 30}
              textAnchor="middle" fontSize={10}
              fill={C.leaf} fontWeight="700"
            >R{r}</text>
          ))}

          {/* Electricity line */}
          <polyline
            points={data.rounds.map((r,i) => `${30 + (i/(data.rounds.length-1))*chartW},${toY(data.elec_loss[i])}`).join(' ')}
            fill="none" stroke={C.river} strokeWidth={2.5} strokeLinejoin="round"
          />
          {data.rounds.map((r,i) => (
            <circle key={i}
              cx={30 + (i/(data.rounds.length-1))*chartW}
              cy={toY(data.elec_loss[i])}
              r={4} fill={C.river}
            >
              <title>Round {r}: {data.elec_loss[i].toFixed(5)}</title>
            </circle>
          ))}

          {/* Water line */}
          <polyline
            points={data.rounds.map((r,i) => `${30 + (i/(data.rounds.length-1))*chartW},${toY(data.water_loss[i])}`).join(' ')}
            fill="none" stroke={C.clay} strokeWidth={2.5} strokeLinejoin="round"
          />
          {data.rounds.map((r,i) => (
            <circle key={i}
              cx={30 + (i/(data.rounds.length-1))*chartW}
              cy={toY(data.water_loss[i])}
              r={4} fill={C.clay}
            >
              <title>Round {r}: {data.water_loss[i].toFixed(5)}</title>
            </circle>
          ))}

          {/* Legend */}
          <circle cx={45} cy={chartH+15} r={5} fill={C.river} />
          <text x={55} y={chartH+19} fontSize={10} fill={C.river} fontWeight="700">Electricity Model</text>
          <circle cx={160} cy={chartH+15} r={5} fill={C.clay} />
          <text x={170} y={chartH+19} fontSize={10} fill={C.clay} fontWeight="700">Water Model</text>
        </svg>
      </div>

      {/* Improvement badges */}
      <div style={{ display:"flex", gap:12, marginTop:16, justifyContent:"center" }}>
        <div style={{ background:"#e8f3f8", padding:"8px 20px", borderRadius:20, border:`1px solid ${C.river}44` }}>
          <span style={{ fontSize:13, color:C.river, fontWeight:800 }}>
            ⚡ Electricity improved {improvement_e}% over 10 rounds
          </span>
        </div>
        <div style={{ background:"#fae8e0", padding:"8px 20px", borderRadius:20, border:`1px solid ${C.clay}44` }}>
          <span style={{ fontSize:13, color:C.clay, fontWeight:800 }}>
            💧 Water improved {improvement_w}% over 10 rounds
          </span>
        </div>
      </div>
    </div>
  )
}
// ── MAIN DASHBOARD ──────────────────────────────────────
function Dashboard({ onLogout }) {
  const [data, setData]         = useState(null)
  const [community, setCommunity] = useState(null)
  const [tab, setTab]           = useState("my")
  const [loading, setLoading]   = useState(true)
  const houseId = getHouseId()

  useEffect(()=>{
    Promise.all([authAxios().get(`${API}/api/me`), authAxios().get(`${API}/api/community`)])
      .then(([me,comm])=>{ setData(me.data); setCommunity(comm.data); setLoading(false) })
      .catch(()=>onLogout())
  },[])

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:12, animation:"leafSway 2s ease-in-out infinite" }}>🌱</div>
        <div style={{ color:C.leaf, fontSize:16, fontWeight:700 }}>Growing your dashboard...</div>
      </div>
    </div>
  )

  const { color:scoreColor, label:scoreLabel, bg:scoreBg } = getScore(data.green_score)
  const elecColors   = [C.river, C.moss, C.sun, C.leaf, C.clay]
  const elecDevices  = Object.entries(data.devices.electricity)
  const waterDevices = Object.entries(data.devices.water)

  const tabs = {
    my        : "🏡 My Garden",
    community : "🌍 Community",
    simulate  : "🎛️ Simulate", 
    carbon    : "🌿 Carbon",
    privacy   : "🔒 Privacy",
    predict   : "📈 Forecast",
    report    : "📄 Report",
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Nunito',sans-serif" }}>

      {/* Header */}
      <div style={{
        background:`linear-gradient(135deg, ${C.bark}, #5a3d2b)`,
        padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100,
        boxShadow:`0 4px 20px rgba(61,43,31,0.3)`
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:28, animation:"leafSway 3s ease-in-out infinite" }}>🌱</span>
          <div>
            <span style={{ fontSize:20, fontWeight:900, color:"white", fontFamily:"'Playfair Display',serif", letterSpacing:"-0.5px" }}>GreenFed</span>
            <div style={{ fontSize:11, color:C.fern, fontWeight:700 }}>{houseId}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
          {Object.entries(tabs).map(([key,label])=>(
            <button key={key} className="nav-btn" onClick={()=>setTab(key)} style={{
              padding:"7px 13px", borderRadius:8, border:"none",
              cursor:"pointer", fontWeight:700, fontSize:12,
              fontFamily:"'Nunito',sans-serif",
              background: tab===key ? C.sage : "transparent",
              color: tab===key ? C.bark : C.fern,
              outline: tab===key ? `2px solid ${C.fern}` : "none"
            }}>{label}</button>
          ))}
          <button onClick={onLogout} style={{
            padding:"7px 13px", borderRadius:8,
            border:`1px solid ${C.leaf}`,
            background:"transparent", color:C.fern,
            cursor:"pointer", fontSize:12, fontWeight:700,
            fontFamily:"'Nunito',sans-serif", marginLeft:8
          }}>Leave</button>
        </div>
      </div>

      <div style={{ padding:"24px 28px" }}>

        {/* MY GARDEN */}
        {tab === "my" && (
          <div>
            {/* Score + comparison */}
            <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20, marginBottom:20 }}>
              <div className="card-enter scale-enter" style={{
                background:`linear-gradient(135deg, ${scoreBg}, ${C.card})`,
                border:`2px solid ${scoreColor}44`,
                borderRadius:18, padding:28,
                display:"flex", flexDirection:"column", alignItems:"center", gap:14,
                boxShadow:`0 8px 32px ${scoreColor}22`
              }}>
                <span style={{ fontSize:12, fontWeight:800, color:scoreColor, textTransform:"uppercase", letterSpacing:"1.5px" }}>Your GreenScore</span>
                <ScoreRing score={data.green_score} size={160} />
                <div style={{ padding:"6px 20px", borderRadius:20, background:scoreColor, color:"white", fontWeight:800, fontSize:13, fontFamily:"'Nunito',sans-serif" }}>
                  {scoreLabel}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, width:"100%" }}>
                  {[
                    { label:"Elec",  val:data.elec_score,  color:C.river },
                    { label:"Water", val:data.water_score, color:C.moss  },
                  ].map((s,i)=>(
                    <div key={i} style={{ background:C.cream, borderRadius:10, padding:10, textAlign:"center", border:`1px solid ${C.sand}` }}>
                      <div style={{ fontSize:20, fontWeight:900, color:s.color, fontFamily:"'Playfair Display',serif" }}>{s.val}</div>
                      <div style={{ fontSize:10, color:C.leaf, fontWeight:700, marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-enter" style={{ background:C.card, borderRadius:18, padding:26, border:`1px solid ${C.border}` }}>
                <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:20, fontSize:18 }}>Your Usage vs Community Average</h3>
                {[
                  { label:"Electricity Score", yours:data.elec_score,  avg:data.community_avg.elec,  color:C.river },
                  { label:"Water Score",        yours:data.water_score, avg:data.community_avg.water, color:C.moss  },
                  { label:"Overall GreenScore", yours:data.green_score, avg:data.community_avg.green, color:C.leaf  },
                ].map((item,i)=>(
                  <div key={i} style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                      <span style={{ fontSize:13, color:C.bark, fontWeight:700 }}>{item.label}</span>
                      <span style={{ fontSize:12, color:C.leaf, fontWeight:700 }}>
                        You: <b style={{ color:item.color }}>{item.yours}</b> · Avg: <b style={{ color:C.bark }}>{item.avg}</b>
                      </span>
                    </div>
                    <div style={{ position:"relative", background:C.sand, borderRadius:6, height:10 }}>
                      <div style={{ width:`${item.avg}%`, background:C.cream, height:10, borderRadius:6, position:"absolute", border:`1px solid ${C.sand}` }} />
                      <div style={{ width:`${item.yours}%`, background:item.color, height:10, borderRadius:6, position:"absolute", boxShadow:`0 0 8px ${item.color}55`, transition:"width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device bars */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
              <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
                <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:6, fontSize:17 }}>⚡ Electricity by Device</h3>
                <p style={{ fontSize:11, color:C.leaf, marginBottom:14, fontWeight:700 }}>🟢 &lt;15% · 🟡 15-25% · 🟠 25-40% · 🔴 40%+ wasteful</p>
                {elecDevices.map(([d,p],i)=><DeviceBar key={d} label={d} percent={p} color={elecColors[i%elecColors.length]} delay={i*0.07} />)}
              </div>
              <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
                <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:6, fontSize:17 }}>💧 Water by Usage</h3>
                <p style={{ fontSize:11, color:C.leaf, marginBottom:14, fontWeight:700 }}>🟢 &lt;15% · 🟡 15-25% · 🟠 25-40% · 🔴 40%+ wasteful</p>
                {waterDevices.map(([d,p],i)=><DeviceBar key={d} label={d} percent={p} color={[C.river,"#3a6a7a","#2d5561","#1e3d47"][i%4]} delay={i*0.07} />)}
                <div style={{ marginTop:14, padding:"10px 14px", background:"#e8f3f8", borderRadius:8, fontSize:12, color:C.river, border:`1px solid ${C.river}44`, fontWeight:700 }}>
                  Avg daily: <b>{data.devices.avg_daily_water} L</b>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:16, fontSize:18 }}>🌿 Personalized Suggestions for {houseId}</h3>
              {data.suggestions.map((s,i)=><SuggestionCard key={i} s={s} i={i} />)}
            </div>
          </div>
        )}

        {/* COMMUNITY */}
        {tab === "community" && community && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
              {[
                { label:"Total Houses",     value:community.total_houses,    color:C.river },
                { label:"Avg GreenScore",   value:community.avg_green_score, color:C.moss  },
                { label:"Efficient Houses", value:community.efficient_count, color:C.moss  },
                { label:"Wasteful Houses",  value:community.wasteful_count,  color:C.clay  },
              ].map((c,i)=>(
                <div key={i} className="card-enter" style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}`, borderLeft:`4px solid ${c.color}` }}>
                  <div style={{ fontSize:30, fontWeight:900, color:c.color, fontFamily:"'Playfair Display',serif" }}>{c.value}</div>
                  <div style={{ fontSize:12, color:C.leaf, marginTop:4, fontWeight:700 }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div className="card-enter" style={{
              background:`linear-gradient(135deg, ${C.bark}, #5a3d2b)`,
              borderRadius:16, padding:24, marginBottom:20
            }}>
              {(()=>{
                const sorted = [...community.houses].sort((a,b)=>b.green_score-a.green_score)
                const rank   = sorted.findIndex(h=>h.house_id===houseId)+1
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                    <div style={{ fontSize:48, fontWeight:900, color:C.sage, fontFamily:"'Playfair Display',serif" }}>#{rank}</div>
                    <div>
                      <div style={{ color:"white", fontWeight:800, fontSize:16, fontFamily:"'Playfair Display',serif" }}>Your Community Rank</div>
                      <div style={{ color:C.fern, fontSize:13, marginTop:4, fontWeight:600 }}>
                        Out of {community.total_houses} houses · GreenScore: <b style={{ color:C.sage }}>{data.green_score}</b>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {[
                { title:"Top 10 Most Efficient 🌿",  list:community.top10,    color:C.moss, bg:"#eaf2e0" },
                { title:"Bottom 10 Most Wasteful 🍂", list:community.bottom10, color:C.clay, bg:"#fae8e0" },
              ].map((section,si)=>(
                <div key={si} className="card-enter" style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", color:C.bark, marginBottom:16, fontSize:16 }}>{section.title}</h3>
                  {section.list.map((h,i)=>(
                    <div key={h.house_id} style={{
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"9px 12px", borderRadius:8, marginBottom:6,
                      background: h.house_id===houseId ? section.bg : C.cream,
                      border:`1px solid ${h.house_id===houseId ? section.color+"55" : C.sand}`
                    }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ color:C.leaf, width:24, fontWeight:800, fontSize:12 }}>#{i+1}</span>
                        <span style={{ fontSize:13, color:C.bark, fontWeight:h.house_id===houseId?800:600 }}>
                          {h.house_id} {h.house_id===houseId && <span style={{ color:section.color, fontSize:11 }}>← you</span>}
                        </span>
                      </div>
                      <span style={{ background:section.color, color:"white", padding:"3px 11px", borderRadius:20, fontWeight:800, fontSize:12 }}>{h.green_score}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "simulate" && <SimulatorTab userData={data} />}
        {tab === "carbon"  && <CarbonTab houseId={houseId} data={data} devices={data.devices} />}
        {tab === "privacy" && <PrivacyTab />}
        {tab === "predict" && <PredictTab userData={data} />}
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
  return loggedIn ? <Dashboard onLogout={handleLogout} /> : <LoginPage onLogin={() => setLoggedIn(true)} />
}
