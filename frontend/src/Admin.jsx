import { useState, useEffect } from "react"
import axios from "axios"

const API = "http://localhost:5000"

const C = {
  bg:     "#f5f0e8",
  card:   "#fffdf7",
  bark:   "#3d2b1f",
  moss:   "#4a5e28",
  leaf:   "#6b7c3e",
  sage:   "#8fa660",
  fern:   "#b5c98e",
  cream:  "#f0e9d6",
  sand:   "#d4c5a0",
  river:  "#4a7c8e",
  clay:   "#b05e3a",
  sun:    "#d4a017",
  border: "rgba(61,43,31,0.12)",
}

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [houses, setHouses]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState("")
  const [sortBy, setSortBy]     = useState("green_score")

  const handleLogin = async () => {
    setLoading(true); setError("")
    try {
      const res = await axios.post(`${API}/api/admin/login`, { username, password })
      localStorage.setItem("admin_token", res.data.token)
      setLoggedIn(true)
      loadHouses(res.data.token)
    } catch (e) {
      setError(e.response?.data?.error || "Invalid credentials")
    }
    setLoading(false)
  }

  const loadHouses = async (token) => {
    try {
      const res = await axios.get(`${API}/api/admin/houses`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHouses(res.data)
    } catch (e) {
      setError("Failed to load houses")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    setLoggedIn(false)
    setHouses([])
  }

  const getColor = (score) => {
    if (score >= 75) return C.moss
    if (score >= 55) return C.leaf
    if (score >= 35) return C.sun
    return C.clay
  }

  const filtered = houses
    .filter(h => h.house_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy])

  if (!loggedIn) return (
    <div style={{
      minHeight:"100vh",
      background:`radial-gradient(ellipse at 30% 60%, #d4e4b8 0%, #f5f0e8 50%, #e8ddc8 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Nunito',sans-serif"
    }}>
      <div style={{
        background:"rgba(255,253,247,0.95)", borderRadius:24, padding:"48px 42px",
        width:400, boxShadow:`0 24px 60px rgba(61,43,31,0.15)`,
        border:`1px solid ${C.border}`
      }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🌿</div>
          <h1 style={{ fontFamily:"Georgia,serif", fontSize:28, color:C.bark, marginBottom:6 }}>GreenFed Admin</h1>
          <p style={{ color:C.leaf, fontSize:13, fontWeight:600 }}>Administrator Portal</p>
        </div>

        {[
          { label:"USERNAME", val:username, set:e=>setUsername(e.target.value), type:"text" },
          { label:"PASSWORD", val:password, set:e=>setPassword(e.target.value), type:"password" },
        ].map((f,i)=>(
          <div key={i} style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:800, color:C.leaf, letterSpacing:"1.5px", textTransform:"uppercase" }}>{f.label}</label>
            <input value={f.val} onChange={f.set} type={f.type}
              onKeyDown={i===1 ? e=>e.key==="Enter"&&handleLogin() : undefined}
              style={{
                width:"100%", padding:"12px 16px", marginTop:6,
                borderRadius:10, border:`1.5px solid ${C.sand}`,
                background:C.cream, color:C.bark, fontSize:14,
                outline:"none", boxSizing:"border-box", fontWeight:600,
                fontFamily:"'Nunito',sans-serif"
              }}
            />
          </div>
        ))}

        {error && (
          <div style={{ background:"#fdf0eb", border:`1px solid ${C.clay}`, color:C.clay, padding:"10px 14px", borderRadius:8, marginBottom:16, fontSize:13, textAlign:"center", fontWeight:700 }}>{error}</div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width:"100%", padding:14, borderRadius:10,
          background:`linear-gradient(135deg, ${C.moss}, ${C.leaf})`,
          color:"white", border:"none", fontSize:15, fontWeight:800,
          cursor:"pointer", fontFamily:"'Nunito',sans-serif",
          boxShadow:`0 6px 20px ${C.moss}55`
        }}>{loading ? "Logging in..." : "Admin Login →"}</button>

        <p style={{ textAlign:"center", color:C.leaf, fontSize:12, marginTop:16, fontWeight:600 }}>
          admin / admin123
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Nunito',sans-serif" }}>

      {/* Header */}
      <div style={{
        background:`linear-gradient(135deg, ${C.bark}, #5a3d2b)`,
        padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:`0 4px 20px rgba(61,43,31,0.3)`
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:26 }}>🌿</span>
          <div>
            <span style={{ fontSize:18, fontWeight:900, color:"white", fontFamily:"Georgia,serif" }}>GreenFed Admin</span>
            <div style={{ fontSize:11, color:C.fern, fontWeight:700 }}>Administrator Dashboard</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          padding:"7px 16px", borderRadius:8, border:`1px solid ${C.leaf}`,
          background:"transparent", color:C.fern, cursor:"pointer", fontSize:12, fontWeight:700
        }}>Logout</button>
      </div>

      <div style={{ padding:"24px 28px" }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Total Houses",     value:houses.length,                                          color:C.river },
            { label:"Avg GreenScore",   value:houses.length ? Math.round(houses.reduce((a,h)=>a+h.green_score,0)/houses.length) : 0, color:C.moss },
            { label:"Efficient (70+)",  value:houses.filter(h=>h.green_score>=70).length,             color:C.moss  },
            { label:"Wasteful (<40)",   value:houses.filter(h=>h.green_score<40).length,              color:C.clay  },
          ].map((s,i)=>(
            <div key={i} style={{ background:C.card, borderRadius:14, padding:20, border:`1px solid ${C.border}`, borderLeft:`4px solid ${s.color}` }}>
              <div style={{ fontSize:28, fontWeight:900, color:s.color, fontFamily:"Georgia,serif" }}>{s.value}</div>
              <div style={{ fontSize:12, color:C.leaf, marginTop:4, fontWeight:700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Sort */}
        <div style={{ display:"flex", gap:12, marginBottom:16 }}>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search house ID..."
            style={{
              flex:1, padding:"10px 16px", borderRadius:10,
              border:`1.5px solid ${C.sand}`, background:C.cream,
              color:C.bark, fontSize:13, outline:"none", fontFamily:"'Nunito',sans-serif", fontWeight:600
            }}
          />
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
            padding:"10px 16px", borderRadius:10, border:`1.5px solid ${C.sand}`,
            background:C.cream, color:C.bark, fontSize:13, fontFamily:"'Nunito',sans-serif", fontWeight:600
          }}>
            <option value="green_score">Sort: GreenScore</option>
            <option value="elec_score">Sort: Elec Score</option>
            <option value="water_score">Sort: Water Score</option>
            <option value="co2_monthly">Sort: CO2</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:`linear-gradient(135deg, ${C.bark}, #5a3d2b)` }}>
                {["#","House ID","GreenScore","Elec Score","Water Score","Elec Waste","Water Waste","Daily kWh","CO2/Month"].map((h,i)=>(
                  <th key={i} style={{ padding:"12px 14px", textAlign:"left", color:"white", fontSize:12, fontWeight:800, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((h,i)=>(
                <tr key={h.house_id} style={{ background: i%2===0 ? C.cream : C.card, borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.leaf, fontWeight:700 }}>{i+1}</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.bark, fontWeight:800 }}>{h.house_id}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ background:getColor(h.green_score), color:"white", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:800 }}>{h.green_score}</span>
                  </td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.river, fontWeight:700 }}>{h.elec_score}</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.moss, fontWeight:700 }}>{h.water_score}</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:h.elec_waste>50?C.clay:C.bark, fontWeight:700 }}>{h.elec_waste}%</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:h.water_waste>50?C.clay:C.bark, fontWeight:700 }}>{h.water_waste}%</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.bark, fontWeight:600 }}>{h.daily_kwh?.toFixed(2)}</td>
                  <td style={{ padding:"10px 14px", fontSize:12, color:C.clay, fontWeight:700 }}>{h.co2_monthly} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign:"center", color:C.leaf, fontSize:12, marginTop:12, fontWeight:600 }}>
          Showing {filtered.length} of {houses.length} houses
        </p>
      </div>
    </div>
  )
}