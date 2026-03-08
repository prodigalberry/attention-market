import { useState, useEffect, useRef } from "react";

function useMarketSimulation() {
  const [viewers, setViewers] = useState(14820);
  const [price, setPrice] = useState(0);
  const [supply, setSupply] = useState(12400);
  const [priceHistory, setPriceHistory] = useState([]);
  const [viewerHistory, setViewerHistory] = useState([]);
  const [trades, setTrades] = useState([]);
  const [marketState, setMarketState] = useState("LIVE");
  const [ewma, setEwma] = useState(14820);
  const tickRef = useRef(0);
  const priceRef = useRef(0);

  const a = 0.00004, b = 0.5;
  const calcPrice = (v) => a * v * v + b;

  useEffect(() => {
    const hist = [], vhist = [];
    let v = 12000;
    for (let i = 60; i >= 0; i--) {
      v = Math.max(500, v + (Math.random() - 0.48) * 600);
      const t = Date.now() - i * 4000;
      hist.push({ t, price: calcPrice(v), v });
      vhist.push({ t, v: Math.round(v) });
    }
    setPriceHistory(hist);
    setViewerHistory(vhist);
    const seedTrades = [];
    const names = ["0x3f2a","0xb91c","0x77ae","0x44df","0x12bc","0x9934"];
    for (let i = 0; i < 8; i++) {
      seedTrades.push({
        id: i, type: Math.random() > 0.45 ? "BUY" : "SELL",
        wallet: names[i % names.length],
        amount: (Math.random() * 800 + 50).toFixed(0),
        price: (calcPrice(12000 + i * 400)).toFixed(4),
        ts: Date.now() - (8 - i) * 7000,
      });
    }
    setTrades(seedTrades);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;
      setViewers(prev => {
        const drift = (Math.random() - 0.47) * 380;
        const spike = tick % 23 === 0 ? 1200 : 0;
        return Math.round(Math.max(800, Math.min(80000, prev + drift + spike)));
      });
      setEwma(prev => {
        setViewers(v => {
          const newEwma = 0.15 * v + 0.85 * prev;
          const newPrice = calcPrice(newEwma);
          priceRef.current = newPrice;
          setPrice(newPrice);
          setPriceHistory(h => [...h, { t: Date.now(), price: newPrice, v: newEwma }].slice(-80));
          setViewerHistory(h => [...h, { t: Date.now(), v: Math.round(v) }].slice(-80));
          return newEwma;
        });
        return prev;
      });
      setSupply(s => Math.max(0, s + (Math.random() - 0.47) * 120));
      if (tick % 4 === 0) {
        const names = ["0x3f2a","0xb91c","0x77ae","0x44df","0x12bc","0x9934","0xcc01","0x55fa"];
        setTrades(prev => [{
          id: tick,
          type: Math.random() > 0.42 ? "BUY" : "SELL",
          wallet: names[Math.floor(Math.random() * names.length)],
          amount: (Math.random() * 1200 + 20).toFixed(0),
          price: priceRef.current > 0 ? priceRef.current.toFixed(4) : "—",
          ts: Date.now(),
        }, ...prev].slice(0, 12));
      }
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return { viewers, ewma, price, supply, priceHistory, viewerHistory, trades, marketState, setMarketState };
}

function Sparkline({ data, color, height = 60, valueKey = "price" }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const vals = data.map(d => d[valueKey]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const px = (i) => (i / (data.length - 1)) * W;
    const py = (v) => H - ((v - min) / range) * (H - 8) - 4;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(px(0), H);
    data.forEach((d, i) => ctx.lineTo(px(i), py(d[valueKey])));
    ctx.lineTo(px(data.length - 1), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    data.forEach((d, i) => {
      if (i === 0) ctx.moveTo(px(i), py(d[valueKey]));
      else ctx.lineTo(px(i), py(d[valueKey]));
    });
    ctx.stroke();
  }, [data, color, valueKey]);
  return <canvas ref={ref} width={300} height={height} style={{ width: "100%", height, display: "block" }} />;
}

function PriceChart({ priceHistory, viewerHistory }) {
  const ref = useRef(null);
  const [mode, setMode] = useState("price");
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const data = mode === "price" ? priceHistory : viewerHistory;
    const key = mode === "price" ? "price" : "v";
    const color = mode === "price" ? "#00ffb4" : "#63b3ed";
    if (data.length < 2) return;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (i / 5) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const x = (i / 8) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    const vals = data.map(d => d[key]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const px = (i) => (i / (data.length - 1)) * (W - 10) + 5;
    const py = (v) => H - 20 - ((v - min) / range) * (H - 40);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + "30");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(px(0), H - 20);
    data.forEach((d, i) => ctx.lineTo(px(i), py(d[key])));
    ctx.lineTo(px(data.length - 1), H - 20);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    data.forEach((d, i) => {
      if (i === 0) ctx.moveTo(px(i), py(d[key]));
      else ctx.lineTo(px(i), py(d[key]));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    const last = data[data.length - 1];
    const lx = px(data.length - 1), ly = py(last[key]);
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "10px 'Courier New'";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillText(max.toFixed(mode === "price" ? 3 : 0), 6, 16);
    ctx.fillText(min.toFixed(mode === "price" ? 3 : 0), 6, H - 6);
  }, [priceHistory, viewerHistory, mode]);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <span style={{ fontFamily: "Courier New", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, flex: 1 }}>LIVE CHART</span>
        {["price", "viewers"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            background: mode === m ? "rgba(0,255,180,0.1)" : "none",
            border: `1px solid ${mode === m ? "rgba(0,255,180,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: mode === m ? "#00ffb4" : "rgba(255,255,255,0.3)",
            fontFamily: "Courier New", fontSize: 9, padding: "3px 10px", borderRadius: 3, cursor: "pointer", letterSpacing: 1
          }}>{m.toUpperCase()}</button>
        ))}
      </div>
      <canvas ref={ref} width={700} height={200} style={{ width: "100%", height: 200, display: "block", borderRadius: 6 }} />
    </div>
  );
}

function BondingCurveWidget({ currentViewers }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const a = 0.00004, b = 0.5;
    const maxV = 50000;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, H, W, 0);
    grad.addColorStop(0, "rgba(0,255,180,0)");
    grad.addColorStop(1, "rgba(0,255,180,0.12)");
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let px2 = 0; px2 <= W; px2++) {
      const v = (px2 / W) * maxV;
      const p = a * v * v + b;
      const py = H - (p / (a * maxV * maxV + b)) * (H - 4) - 2;
      ctx.lineTo(px2, py);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#00ffb4";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#00ffb4";
    ctx.shadowBlur = 5;
    for (let px2 = 0; px2 <= W; px2++) {
      const v = (px2 / W) * maxV;
      const p = a * v * v + b;
      const py = H - (p / (a * maxV * maxV + b)) * (H - 4) - 2;
      if (px2 === 0) ctx.moveTo(px2, py);
      else ctx.lineTo(px2, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    const cv = currentViewers;
    const cpx = (cv / maxV) * W;
    const cp = a * cv * cv + b;
    const cpy = H - (cp / (a * maxV * maxV + b)) * (H - 4) - 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(255,107,53,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cpx, cpy); ctx.lineTo(cpx, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cpx, cpy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6b35";
    ctx.shadowColor = "#ff6b35";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "bold 10px 'Courier New'";
    ctx.fillStyle = "#ff6b35";
    const lx = cpx > W - 100 ? cpx - 95 : cpx + 8;
    ctx.fillText(`P=${cp.toFixed(3)}`, lx, cpy - 8);
  }, [currentViewers]);
  return <canvas ref={ref} width={300} height={120} style={{ width: "100%", height: 120, display: "block" }} />;
}

export default function App() {
  const { viewers, ewma, price, supply, priceHistory, viewerHistory, trades, marketState, setMarketState } = useMarketSimulation();
  const [tab, setTab] = useState("trade");
  const [orderType, setOrderType] = useState("BUY");
  const [amount, setAmount] = useState("500");
  const prevPrice = useRef(price);
  const [priceDir, setPriceDir] = useState("up");

  useEffect(() => {
    if (price > prevPrice.current) setPriceDir("up");
    else if (price < prevPrice.current) setPriceDir("down");
    prevPrice.current = price;
  }, [price]);

  const tokensOut = price > 0 ? (parseFloat(amount || 0) / price).toFixed(2) : "—";
  const slippage = price > 0 ? ((parseFloat(amount || 0) / (supply * price)) * 100).toFixed(3) : "0.000";
  const viewerDrift = Math.abs(viewers - ewma);
  const driftPct = ((viewerDrift / viewers) * 100).toFixed(1);
  const fmtNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n).toString();
  const timeAgo = (ts) => {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.round(s / 60)}m ago`;
  };
  const stateColor = { LIVE: "#00ffb4", SETTLING: "#ff6b35", SETTLED: "#e53e3e", IDLE: "#4a5568" };

  return (
    <div style={{ background: "#060b10", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e2e8f0", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,180,0.2); border-radius: 2px; }
        input[type=range] { -webkit-appearance: none; height: 3px; border-radius: 2px; background: rgba(0,255,180,0.2); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #00ffb4; cursor: pointer; box-shadow: 0 0 8px #00ffb4; }
        .tbtn { transition: all 0.15s; }
        .tbtn:hover { transform: translateY(-1px); }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(0,255,180,0.2)} 50%{box-shadow:0 0 20px rgba(0,255,180,0.5)} }
      `}</style>

      {/* Top Bar */}
      <div style={{ background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(0,255,180,0.1)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, backdropFilter: "blur(10px)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #00ffb4, #0066ff)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold", color: "#000", fontFamily: "Rajdhani, sans-serif" }}>◈</div>
          <div>
            <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: 1 }}>ATTENTIONEX</div>
            <div style={{ fontSize: 8, color: "rgba(0,255,180,0.4)", letterSpacing: 2 }}>LIVE SYNTHETIC MARKET</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,255,180,0.06)", border: "1px solid rgba(0,255,180,0.15)", borderRadius: 6, padding: "5px 12px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: stateColor[marketState], animation: marketState === "LIVE" ? "blink 1.2s infinite" : "none", boxShadow: `0 0 8px ${stateColor[marketState]}` }} />
          <span style={{ fontSize: 10, color: stateColor[marketState], letterSpacing: 1 }}>{marketState}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>·</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>xQcOW</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>CURRENT PRICE</div>
            <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 22, color: priceDir === "up" ? "#00ffb4" : "#ff6b35", transition: "color 0.3s" }}>${price.toFixed(4)}</div>
          </div>
          <div style={{ padding: "3px 8px", borderRadius: 4, background: priceDir === "up" ? "rgba(0,255,180,0.15)" : "rgba(255,107,53,0.15)", color: priceDir === "up" ? "#00ffb4" : "#ff6b35", fontSize: 11, fontWeight: "bold" }}>{priceDir === "up" ? "▲" : "▼"}</div>
        </div>
        {[["VIEWERS", fmtNum(viewers), "#63b3ed"], ["EWMA", fmtNum(ewma), "#00ffb4"], ["SUPPLY", fmtNum(supply), "#d6bcfa"], ["DRIFT", `${driftPct}%`, parseFloat(driftPct) > 5 ? "#ff6b35" : "rgba(255,255,255,0.3)"]].map(([label, val, color]) => (
          <div key={label} style={{ textAlign: "center", padding: "0 8px", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color, fontWeight: "bold" }}>{val}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 5, borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: 14 }}>
          {["LIVE","SETTLING","SETTLED"].map(s => (
            <button key={s} onClick={() => setMarketState(s)} style={{ background: marketState === s ? `${stateColor[s]}20` : "none", border: `1px solid ${marketState === s ? stateColor[s] : "rgba(255,255,255,0.1)"}`, color: marketState === s ? stateColor[s] : "rgba(255,255,255,0.25)", fontSize: 8, padding: "3px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "Courier New", letterSpacing: 1 }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "calc(100vh - 54px)", overflow: "hidden" }}>
        <div style={{ overflowY: "auto", padding: "16px 0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 18 }}>
            <PriceChart priceHistory={priceHistory} viewerHistory={viewerHistory} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 8, color: "rgba(99,179,237,0.5)", letterSpacing: 2, marginBottom: 12 }}>▸ ORACLE / INGESTOR</div>
              <Sparkline data={viewerHistory.slice(-30)} color="#63b3ed" height={50} valueKey="v" />
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {[["RAW", fmtNum(viewers), "#63b3ed"], ["EWMA", fmtNum(ewma), "#00ffb4"], ["DRIFT", `${driftPct}%`, parseFloat(driftPct) > 5 ? "#ff6b35" : "#4a5568"], ["SOURCE", "EventSub WS", "rgba(255,255,255,0.3)"], ["LATENCY", "23ms", "#00ffb4"]].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>{k}</span>
                    <span style={{ fontSize: 10, color: c, fontWeight: "bold" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,180,0.15)", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 8, color: "rgba(0,255,180,0.5)", letterSpacing: 2, marginBottom: 10 }}>▸ BONDING CURVE</div>
              <BondingCurveWidget currentViewers={ewma} />
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {[["FORMULA", "a·v²+b", "#00ffb4"], ["a", "4.00e-5", "rgba(255,255,255,0.4)"], ["b (floor)", "0.5000", "rgba(255,255,255,0.4)"], ["SPOT P", `$${price.toFixed(4)}`, "#00ffb4"]].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>{k}</span>
                    <span style={{ fontSize: 10, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${stateColor[marketState]}25`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 8, color: `${stateColor[marketState]}60`, letterSpacing: 2, marginBottom: 12 }}>▸ SETTLEMENT FSM</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["IDLE","LIVE","SETTLING","SETTLED"].map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: marketState === s ? `${stateColor[s]}12` : "transparent", border: `1px solid ${marketState === s ? stateColor[s] + "40" : "transparent"}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: marketState === s ? stateColor[s] : "rgba(255,255,255,0.1)", boxShadow: marketState === s ? `0 0 8px ${stateColor[s]}` : "none", animation: marketState === s && s === "LIVE" ? "blink 1.2s infinite" : "none" }} />
                    <span style={{ fontSize: 10, color: marketState === s ? stateColor[s] : "rgba(255,255,255,0.2)" }}>{s}</span>
                    {marketState === s && <span style={{ marginLeft: "auto", fontSize: 8, color: `${stateColor[s]}80` }}>◀ CURRENT</span>}
                  </div>
                ))}
              </div>
              {marketState === "SETTLING" && (
                <div style={{ marginTop: 10, padding: 10, background: "rgba(255,107,53,0.08)", borderRadius: 6, border: "1px solid rgba(255,107,53,0.2)" }}>
                  <div style={{ fontSize: 9, color: "#ff6b35" }}>⚠ GRACE PERIOD</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>30s until finalization</div>
                </div>
              )}
              {marketState === "SETTLED" && (
                <div style={{ marginTop: 10, padding: 10, background: "rgba(229,62,62,0.08)", borderRadius: 6, border: "1px solid rgba(229,62,62,0.2)" }}>
                  <div style={{ fontSize: 9, color: "#e53e3e" }}>◼ MARKET CLOSED</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Funds redistributed</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 12 }}>▸ RECENT TRADES (LIVE)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
              {trades.map((t, i) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "50px 80px 1fr 1fr 80px", gap: 12, alignItems: "center", padding: "7px 10px", borderRadius: 5, background: i === 0 ? (t.type === "BUY" ? "rgba(0,255,180,0.05)" : "rgba(255,107,53,0.05)") : "transparent", animation: i === 0 ? "slideIn 0.3s ease" : "none", borderLeft: i === 0 ? `2px solid ${t.type === "BUY" ? "#00ffb4" : "#ff6b35"}` : "2px solid transparent" }}>
                  <span style={{ fontSize: 9, color: t.type === "BUY" ? "#00ffb4" : "#ff6b35", fontWeight: "bold" }}>{t.type}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{t.wallet}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>{t.amount} USDC</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>@ ${t.price}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>{timeAgo(t.ts)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", overflowY: "auto", background: "rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["trade","info"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "#00ffb4" : "transparent"}`, color: tab === t ? "#00ffb4" : "rgba(255,255,255,0.25)", cursor: "pointer", fontFamily: "Courier New", fontSize: 9, letterSpacing: 2 }}>{t.toUpperCase()}</button>
            ))}
          </div>
          {tab === "trade" && (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {marketState !== "LIVE" && (
                <div style={{ padding: 12, borderRadius: 8, background: `${stateColor[marketState]}10`, border: `1px solid ${stateColor[marketState]}30` }}>
                  <div style={{ fontSize: 9, color: stateColor[marketState] }}>{marketState === "SETTLING" ? "⚠ SETTLING — TRADES LOCKED" : "◼ MARKET CLOSED"}</div>
                </div>
              )}
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                {["BUY","SELL"].map(o => (
                  <button key={o} onClick={() => setOrderType(o)} className="tbtn" style={{ flex: 1, padding: "10px 0", background: orderType === o ? (o === "BUY" ? "rgba(0,255,180,0.15)" : "rgba(255,107,53,0.15)") : "transparent", border: "none", color: orderType === o ? (o === "BUY" ? "#00ffb4" : "#ff6b35") : "rgba(255,255,255,0.2)", cursor: "pointer", fontFamily: "Courier New", fontSize: 11, fontWeight: "bold", letterSpacing: 2, borderRight: o === "BUY" ? "1px solid rgba(255,255,255,0.08)" : "none" }}>{o}</button>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 6 }}>AMOUNT (USDC)</div>
                <div style={{ position: "relative" }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: "100%", padding: "10px 50px 10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontFamily: "Courier New", fontSize: 14, outline: "none" }} />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>USDC</span>
                </div>
                <input type="range" min={10} max={10000} value={amount} onChange={e => setAmount(e.target.value)} style={{ width: "100%", marginTop: 8 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[100, 250, 500, 1000].map(v => (
                  <button key={v} onClick={() => setAmount(v.toString())} style={{ padding: "6px 0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "Courier New", borderRadius: 4, cursor: "pointer" }}>${v}</button>
                ))}
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 10 }}>ORDER SUMMARY</div>
                {[["Spot Price", `$${price.toFixed(5)}`], ["You Pay", `$${parseFloat(amount || 0).toFixed(2)} USDC`], ["Tokens Out", `≈ ${tokensOut}`], ["Est. Slippage", `${slippage}%`], ["Max Slippage", "15.000%"], ["Oracle (EWMA)", `${fmtNum(ewma)} viewers`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{k}</span>
                    <span style={{ fontSize: 9, color: k === "Est. Slippage" && parseFloat(slippage) > 10 ? "#ff6b35" : "rgba(255,255,255,0.6)" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="tbtn" disabled={marketState !== "LIVE"} style={{ width: "100%", padding: "14px 0", background: marketState !== "LIVE" ? "rgba(255,255,255,0.04)" : orderType === "BUY" ? "linear-gradient(135deg, rgba(0,255,180,0.25), rgba(0,255,180,0.1))" : "linear-gradient(135deg, rgba(255,107,53,0.25), rgba(255,107,53,0.1))", border: `1px solid ${marketState !== "LIVE" ? "rgba(255,255,255,0.08)" : orderType === "BUY" ? "rgba(0,255,180,0.4)" : "rgba(255,107,53,0.4)"}`, color: marketState !== "LIVE" ? "rgba(255,255,255,0.2)" : orderType === "BUY" ? "#00ffb4" : "#ff6b35", fontFamily: "Courier New", fontSize: 12, fontWeight: "bold", letterSpacing: 3, borderRadius: 8, cursor: marketState === "LIVE" ? "pointer" : "not-allowed", animation: marketState === "LIVE" ? "glow 2s infinite" : "none" }}>
                {marketState !== "LIVE" ? "MARKET CLOSED" : `CONFIRM ${orderType}`}
              </button>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", textAlign: "center", lineHeight: 1.5 }}>Settled on Solana · Non-custodial · Price oracle: Twitch EWMA</div>
            </div>
          )}
          {tab === "info" && (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 8, color: "rgba(0,255,180,0.5)", letterSpacing: 2, marginBottom: 4 }}>▸ MARKET INFO</div>
              {[["Stream","xQcOW"],["Market State",marketState],["Oracle","EventSub WS"],["Algorithm","Quadratic Bonding"],["Settlement","Solana / Anchor"],["Protocol Fee","1.00%"],["Max Position","5% supply"],["Trade Cooldown","60 seconds"],["Anti-Bot","3-Layer"],["Total Supply",fmtNum(supply)],["Total Liquidity",`$${(supply * price).toFixed(0)}`]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{k}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: 12, background: "rgba(0,255,180,0.04)", borderRadius: 8, border: "1px solid rgba(0,255,180,0.1)" }}>
                <div style={{ fontSize: 8, color: "rgba(0,255,180,0.5)", letterSpacing: 2, marginBottom: 6 }}>BONDING CURVE PARAMS</div>
                <div style={{ fontSize: 10, color: "#00ffb4" }}>P(v) = 4e-5 · v² + 0.5</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.6 }}>Price is a function of the smoothed (EWMA) viewer count. Large buys are priced via definite integration.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
