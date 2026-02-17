import { useState, useEffect, useRef } from "react";

// ── Types / Constants ─────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const CLF_FEATURES = [
  { key: "koi_period",       label: "Orbital Period",         unit: "days",  min: 0.24,    max: 1000,    step: 0.01,  median: 9.753,   tooltip: "Time for one complete orbit around the host star." },
  { key: "koi_duration",     label: "Transit Duration",       unit: "hrs",   min: 0.05,    max: 100,     step: 0.01,  median: 3.79,    tooltip: "Duration of the planetary transit event across the stellar disk." },
  { key: "koi_depth",        label: "Transit Depth",          unit: "ppm",   min: 0,       max: 100000,  step: 1,     median: 421.1,   tooltip: "Fractional stellar flux lost during transit (parts per million). Deeper = larger planet." },
  { key: "koi_impact",       label: "Impact Parameter",       unit: "",      min: 0,       max: 1.5,     step: 0.001, median: 0.537,   tooltip: "Sky-projected distance between transit center & stellar disk center. 0 = central transit." },
  { key: "koi_model_snr",    label: "Transit SNR",            unit: "",      min: 0,       max: 2000,    step: 0.1,   median: 23.0,    tooltip: "Signal-to-noise ratio of the transit model fit. Higher = more reliable detection." },
  { key: "koi_num_transits", label: "Number of Transits",     unit: "",      min: 0,       max: 1000,    step: 1,     median: 143,     tooltip: "Total number of transit events observed in the Kepler dataset." },
  { key: "koi_ror",          label: "Radius Ratio (Rp/Rs)",   unit: "",      min: 0.001,   max: 0.5,     step: 0.0001,median: 0.021,   tooltip: "Ratio of planet radius to stellar radius derived from the transit depth." },
  { key: "st_teff",          label: "Stellar Temp (Teff)",    unit: "K",     min: 2600,    max: 10000,   step: 10,    median: 5783,    tooltip: "Effective temperature of the host star. Sun ≈ 5778 K." },
  { key: "st_logg",          label: "Surface Gravity (logg)", unit: "cgs",   min: 0.1,     max: 5.4,     step: 0.001, median: 4.453,   tooltip: "Log₁₀ of stellar surface gravity. Main-sequence stars ≈ 4.0–4.7." },
  { key: "st_met",           label: "Stellar Metallicity",    unit: "[Fe/H]",min: -2.5,    max: 0.6,     step: 0.01,  median: -0.14,   tooltip: "Iron-to-hydrogen abundance relative to the Sun. 0 = solar metallicity." },
  { key: "st_mass",          label: "Stellar Mass",           unit: "M☉",    min: 0.09,    max: 3.7,     step: 0.001, median: 0.972,   tooltip: "Mass of the host star in solar masses." },
  { key: "st_radius",        label: "Stellar Radius",         unit: "R☉",    min: 0.1,     max: 30,      step: 0.001, median: 0.981,   tooltip: "Radius of the host star in solar radii." },
  { key: "st_dens",          label: "Stellar Density",        unit: "g/cm³", min: 0,       max: 50,      step: 0.001, median: 1.435,   tooltip: "Mean density of the host star, used to constrain the orbital parameters." },
  { key: "teff_err1",        label: "Teff Error (+)",         unit: "K",     min: 0,       max: 700,     step: 1,     median: 153,     tooltip: "Positive uncertainty on stellar effective temperature." },
  { key: "teff_err2",        label: "Teff Error (−)",         unit: "K",     min: -1500,   max: 0,       step: 1,     median: -149,    tooltip: "Negative uncertainty on stellar effective temperature." },
  { key: "logg_err1",        label: "logg Error (+)",         unit: "",      min: 0,       max: 1.2,     step: 0.001, median: 0.074,   tooltip: "Positive uncertainty on stellar surface gravity." },
  { key: "logg_err2",        label: "logg Error (−)",         unit: "",      min: -0.75,   max: 0,       step: 0.001, median: -0.193,  tooltip: "Negative uncertainty on stellar surface gravity." },
  { key: "feh_err1",         label: "[Fe/H] Error (+)",       unit: "",      min: 0,       max: 0.5,     step: 0.001, median: 0.22,    tooltip: "Positive uncertainty on stellar metallicity measurement." },
  { key: "feh_err2",         label: "[Fe/H] Error (−)",       unit: "",      min: -0.75,   max: 0,       step: 0.001, median: -0.26,   tooltip: "Negative uncertainty on stellar metallicity measurement." },
  { key: "mass_err1",        label: "Mass Error (+)",         unit: "M☉",    min: 0,       max: 1.5,     step: 0.001, median: 0.116,   tooltip: "Positive uncertainty on stellar mass." },
  { key: "mass_err2",        label: "Mass Error (−)",         unit: "M☉",    min: -2.6,    max: 0,       step: 0.001, median: -0.098,  tooltip: "Negative uncertainty on stellar mass." },
  { key: "radius_err1",      label: "Radius Error (+)",       unit: "R☉",    min: 0,       max: 26,      step: 0.001, median: 0.356,   tooltip: "Positive uncertainty on stellar radius." },
  { key: "radius_err2",      label: "Radius Error (−)",       unit: "R☉",    min: -101,    max: 0,       step: 0.001, median: -0.114,  tooltip: "Negative uncertainty on stellar radius." },
];

const REG_FEATURES = CLF_FEATURES.filter(f => f.key !== "koi_ror");

const SAMPLE_CONFIRMED = {
  koi_period: 9.488, koi_duration: 2.9575, koi_depth: 615.8, koi_impact: 0.146,
  koi_model_snr: 35.8, koi_num_transits: 142, koi_ror: 0.0223, st_teff: 5762,
  st_logg: 4.426, st_met: 0.14, st_mass: 0.985, st_radius: 0.989, st_dens: 1.469,
  teff_err1: 123, teff_err2: -123, logg_err1: 0.068, logg_err2: -0.243,
  feh_err1: 0.15, feh_err2: -0.15, mass_err1: 0.1315, mass_err2: -0.0868,
  radius_err1: 0.465, radius_err2: -0.114,
};
const SAMPLE_FP = {
  koi_period: 1.737, koi_duration: 2.406, koi_depth: 8079.2, koi_impact: 1.276,
  koi_model_snr: 505.6, koi_num_transits: 621, koi_ror: 0.387, st_teff: 5805,
  st_logg: 4.546, st_met: -0.52, st_mass: 0.831, st_radius: 0.803, st_dens: 2.312,
  teff_err1: 157, teff_err2: -144, logg_err1: 0.053, logg_err2: -0.223,
  feh_err1: 0.3, feh_err2: -0.26, mass_err1: 0.1, mass_err2: -0.072,
  radius_err1: 0.364, radius_err2: -0.068,
};

const PLANET_SIZES = [
  { name: "Mercury", radius: 0.38, color: "#9ca3af" },
  { name: "Earth",   radius: 1.00, color: "#3b82f6" },
  { name: "Neptune", radius: 3.86, color: "#6366f1" },
  { name: "Jupiter", radius: 11.2, color: "#f59e0b" },
];

// ── Utility ───────────────────────────────────────────────────────────────────
function cn(...classes) { return classes.filter(Boolean).join(" "); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Starfield Background ──────────────────────────────────────────────────────
function Starfield() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.005 + 0.002,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.a += s.speed;
        const alpha = 0.3 + 0.5 * Math.abs(Math.sin(s.a));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: "help", color: "#00e5ff", fontSize: 11, fontWeight: 700,
                 background: "rgba(0,229,255,0.15)", borderRadius: "50%",
                 width: 16, height: 16, display: "inline-flex", alignItems: "center",
                 justifyContent: "center", marginLeft: 6 }}
      >?</span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "#0d1630",
          border: "1px solid #1a2240", color: "#94a3b8", fontSize: 11,
          padding: "6px 10px", borderRadius: 6, width: 200, zIndex: 100,
          lineHeight: 1.5, pointerEvents: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)"
        }}>{text}</span>
      )}
    </span>
  );
}

// ── Gauge / Probability Bar ───────────────────────────────────────────────────
function ProbBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4,
                    fontSize: 12, color: "#94a3b8" }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, background: "#0d1a30", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value * 100}%`, background: color,
                      borderRadius: 3, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                      boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

// ── Planet Visual ─────────────────────────────────────────────────────────────
function PlanetViz({ radius }) {
  const maxPx = 100;
  const earthPx = 22;
  const scale = Math.min(Math.log1p(radius) / Math.log1p(15), 1);
  const px = earthPx + scale * (maxPx - earthPx);
  const hue = radius < 1.25 ? 210 : radius < 4 ? 260 : radius < 10 ? 280 : 35;
  const color = `hsl(${hue},75%,55%)`;
  const ringColor = `hsl(${hue},65%,70%)`;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, justifyContent: "center",
                  padding: "20px 0", flexWrap: "wrap" }}>
      {/* Reference planets */}
      {PLANET_SIZES.filter(p => p.radius <= radius * 1.4 + 1).slice(0, 3).map(p => (
        <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: earthPx * p.radius * 0.6, height: earthPx * p.radius * 0.6,
            borderRadius: "50%", background: p.color, opacity: 0.4,
            minWidth: 6, minHeight: 6,
          }} />
          <span style={{ fontSize: 9, color: "#475569" }}>{p.name}</span>
        </div>
      ))}
      {/* Predicted planet */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative" }}>
          <div style={{
            width: px, height: px, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, hsl(${hue},90%,75%), ${color} 50%, hsl(${hue},50%,25%))`,
            boxShadow: `0 0 ${px * 0.4}px ${color}60, 0 0 ${px * 0.8}px ${color}20`,
            animation: "spin 20s linear infinite",
          }} />
          {radius > 8 && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%) rotate(-25deg)",
              width: px * 2.2, height: px * 0.35,
              borderRadius: "50%",
              border: `2px solid ${ringColor}50`,
              pointerEvents: "none",
            }} />
          )}
        </div>
        <span style={{ fontSize: 11, color: "#00e5ff", fontWeight: 700 }}>
          {radius.toFixed(2)} R⊕
        </span>
      </div>
    </div>
  );
}

// ── Feature Importance Chart ──────────────────────────────────────────────────
function ImportanceChart({ data }) {
  if (!data) return null;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = entries[0][1];
  return (
    <div>
      {entries.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11,
                        color: "#64748b", marginBottom: 3 }}>
            <span style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
            <span style={{ color: "#00e5ff" }}>{(v * 100).toFixed(1)}%</span>
          </div>
          <div style={{ height: 4, background: "#0d1a30", borderRadius: 2 }}>
            <div style={{
              height: "100%", width: `${(v / max) * 100}%`,
              background: "linear-gradient(90deg, #7c3aed, #00e5ff)",
              borderRadius: 2,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ history }) {
  if (!history.length) return (
    <div style={{ textAlign: "center", color: "#334155", padding: 40, fontSize: 13 }}>
      No predictions yet. Submit a query to begin.
    </div>
  );
  return (
    <div style={{ maxHeight: 380, overflowY: "auto" }}>
      {history.map((h, i) => (
        <div key={i} style={{
          padding: "10px 14px", marginBottom: 8,
          background: "rgba(13,26,48,0.6)",
          border: "1px solid #1a2240",
          borderRadius: 8, fontSize: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: h.task === "classification" ? "rgba(0,229,255,0.1)" : "rgba(124,58,237,0.1)",
              color: h.task === "classification" ? "#00e5ff" : "#a78bfa",
            }}>{h.task === "classification" ? "CLASSIFY" : "REGRESS"}</span>
            <span style={{ color: "#334155" }}>{new Date(h.timestamp + "Z").toLocaleTimeString()}</span>
          </div>
          {h.task === "classification" ? (
            <span style={{
              color: h.result.prediction === "CONFIRMED" ? "#10b981" : "#ef4444",
              fontWeight: 700,
            }}>
              {h.result.prediction} — {(h.result.confidence * 100).toFixed(1)}% conf.
            </span>
          ) : (
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>
              {h.result.prediction_earth_radii} R⊕ — {h.result.size_category}
            </span>
          )}
          <span style={{ float: "right", color: "#334155" }}>{h.latency_ms}ms</span>
        </div>
      ))}
    </div>
  );
}

// ── Input Field ───────────────────────────────────────────────────────────────
function FeatureInput({ feat, value, onChange, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4,
                      textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {feat.label}
        {feat.unit && <span style={{ color: "#334155", marginLeft: 4 }}>({feat.unit})</span>}
        <Tip text={feat.tooltip} />
      </label>
      <input
        type="number"
        value={value}
        step={feat.step}
        onChange={e => onChange(feat.key, e.target.value)}
        placeholder={`e.g. ${feat.median}`}
        style={{
          width: "100%", padding: "8px 12px", fontSize: 13,
          background: error ? "rgba(239,68,68,0.05)" : "rgba(13,26,48,0.8)",
          border: `1px solid ${error ? "#ef4444" : "#1a2240"}`,
          borderRadius: 6, color: "#e2e8f0",
          outline: "none", boxSizing: "border-box",
          fontFamily: "'JetBrains Mono', monospace",
          transition: "border-color 0.2s",
        }}
        onFocus={e => { e.target.style.borderColor = error ? "#ef4444" : "#00e5ff"; }}
        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#1a2240"; }}
      />
      {error && <div style={{ color: "#ef4444", fontSize: 10, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

// ── Classification Result Panel ───────────────────────────────────────────────
function ClfResult({ result }) {
  const confirmed = result.prediction === "CONFIRMED";
  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Main verdict */}
      <div style={{
        padding: 24, borderRadius: 12, marginBottom: 20, textAlign: "center",
        background: confirmed
          ? "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))"
          : "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))",
        border: `2px solid ${confirmed ? "#10b981" : "#ef4444"}40`,
      }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, letterSpacing: "0.1em",
                      textTransform: "uppercase" }}>Prediction Result</div>
        <div style={{ fontSize: 32, fontWeight: 900,
                      color: confirmed ? "#10b981" : "#ef4444",
                      fontFamily: "'Space Grotesk', sans-serif",
                      letterSpacing: "-0.02em" }}>
          {result.prediction}
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>
          Confidence: <span style={{ color: confirmed ? "#10b981" : "#ef4444", fontWeight: 700 }}>
            {(result.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Probability bars */}
      <div style={{ marginBottom: 20 }}>
        <ProbBar label="P(CONFIRMED)" value={result.prob_confirmed} color="#10b981" />
        <ProbBar label="P(FALSE POSITIVE)" value={result.prob_false_positive} color="#ef4444" />
      </div>

      {/* Model metrics */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20,
      }}>
        {[
          { label: "F1-Score", value: result.model_metrics.f1, note: "Binary classification" },
          { label: "ROC-AUC", value: result.model_metrics.roc_auc, note: "Discrimination ability" },
        ].map(m => (
          <div key={m.label} style={{
            padding: "12px 16px", background: "rgba(13,26,48,0.8)",
            border: "1px solid #1a2240", borderRadius: 8, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "#334155", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#00e5ff",
                          fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
            <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 2 }}>{m.note}</div>
          </div>
        ))}
      </div>

      {/* Feature importance */}
      <div style={{
        padding: 16, background: "rgba(13,26,48,0.5)", border: "1px solid #1a2240",
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, color: "#334155", marginBottom: 12,
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Feature Importance (model-level)
        </div>
        <ImportanceChart data={result.feature_importance} />
      </div>

      {result.latency_ms && (
        <div style={{ textAlign: "right", fontSize: 10, color: "#1e3a5f", marginTop: 10 }}>
          Inference: {result.latency_ms}ms
        </div>
      )}
    </div>
  );
}

// ── Regression Result Panel ───────────────────────────────────────────────────
function RegResult({ result }) {
  const r = result.prediction_earth_radii;
  return (
    <div style={{ animation: "fadeIn 0.5s ease" }}>
      <div style={{
        padding: 24, borderRadius: 12, marginBottom: 20, textAlign: "center",
        background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(245,158,11,0.05))",
        border: "2px solid rgba(124,58,237,0.3)",
      }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, letterSpacing: "0.1em",
                      textTransform: "uppercase" }}>Predicted Radius</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#f59e0b",
                      fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}>
          {r.toFixed(2)} R⊕
        </div>
        <div style={{
          display: "inline-block", marginTop: 8, padding: "4px 14px", borderRadius: 20,
          background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)",
          fontSize: 12, color: "#a78bfa", fontWeight: 700,
        }}>{result.size_category}</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
          95% CI: [{result.confidence_interval[0].toFixed(2)}, {result.confidence_interval[1].toFixed(2)}] R⊕
        </div>
      </div>

      {/* Planet visualization */}
      <div style={{
        padding: 16, background: "rgba(4,6,15,0.6)", border: "1px solid #1a2240",
        borderRadius: 10, marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: "#334155", marginBottom: 4,
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Size Comparison
        </div>
        <PlanetViz radius={r} />
      </div>

      {/* Regression metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "RMSE", value: result.model_metrics.rmse + " R⊕", note: "Root mean squared error" },
          { label: "MAE",  value: result.model_metrics.mae + " R⊕",  note: "Mean absolute error" },
        ].map(m => (
          <div key={m.label} style={{
            padding: "12px 16px", background: "rgba(13,26,48,0.8)",
            border: "1px solid #1a2240", borderRadius: 8, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "#334155", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa",
                          fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
            <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 2 }}>{m.note}</div>
          </div>
        ))}
      </div>

      {/* Feature importance */}
      <div style={{
        padding: 16, background: "rgba(13,26,48,0.5)", border: "1px solid #1a2240", borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, color: "#334155", marginBottom: 12,
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Feature Importance (model-level)
        </div>
        <ImportanceChart data={result.feature_importance} />
      </div>

      {result.latency_ms && (
        <div style={{ textAlign: "right", fontSize: 10, color: "#1e3a5f", marginTop: 10 }}>
          Inference: {result.latency_ms}ms
        </div>
      )}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateInputs(values, features) {
  const errors = {};
  features.forEach(f => {
    const raw = values[f.key];
    if (raw === "" || raw === undefined || raw === null) {
      errors[f.key] = "Required";
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) { errors[f.key] = "Must be a number"; return; }
    // Soft range warning (not hard block)
    const stat = f;
    if (num < stat.min - Math.abs(stat.min) * 0.5 || num > stat.max * 5) {
      errors[f.key] = `Unusual value (typical range: ${stat.min}–${stat.max})`;
    }
  });
  return errors;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [task, setTask] = useState("classification"); // "classification" | "regression"
  const [tab, setTab] = useState("predict");          // "predict" | "history"
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [history, setHistory] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null);

  const features = task === "classification" ? CLF_FEATURES : REG_FEATURES;

  // Check backend health
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab === "history") {
      fetch(`${API_BASE}/history`)
        .then(r => r.json())
        .then(data => setHistory(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [tab]);

  const handleChange = (key, val) => {
    setValues(v => ({ ...v, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const fillSample = (sample) => {
    setValues(sample);
    setErrors({});
    setResult(null);
  };

  const handleSubmit = async () => {
    const errs = validateInputs(values, features);
    const hardErrors = Object.entries(errs).filter(([, v]) => v === "Required" || v === "Must be a number");
    setErrors(errs);
    if (hardErrors.length > 0) return;

    setLoading(true);
    setResult(null);
    setApiError(null);

    const payload = {};
    features.forEach(f => { payload[f.key] = parseFloat(values[f.key]); });

    try {
      const endpoint = task === "classification"
        ? `${API_BASE}/predict/classification`
        : `${API_BASE}/predict/regression`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setApiError(err.message || "API unreachable. Is the Flask backend running on port 5000?");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => { setValues({}); setErrors({}); setResult(null); setApiError(null); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #04060f; color: #e2e8f0; font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #04060f; }
        ::-webkit-scrollbar-thumb { background: #1a2240; border-radius: 2px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes scanline { 0% { top: -4px; } 100% { top: 100%; } }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      <Starfield />

      {/* ── Layout ── */}
      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh", padding: "0 0 60px 0",
      }}>
        {/* Header */}
        <header style={{
          padding: "20px 40px 16px",
          borderBottom: "1px solid #0d1630",
          background: "rgba(4,6,15,0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Logo */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "radial-gradient(circle, #7c3aed, #04060f)",
              border: "2px solid #00e5ff30",
              boxShadow: "0 0 16px #7c3aed60",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>✦</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em",
                            background: "linear-gradient(90deg, #00e5ff, #7c3aed)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ExoScope
              </div>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em",
                            textTransform: "uppercase", marginTop: -2 }}>
                Exoplanet Intelligence System
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Backend status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: backendOnline === null ? "#f59e0b" : backendOnline ? "#10b981" : "#ef4444",
                animation: backendOnline === null ? "pulse 1s infinite" : "none",
                boxShadow: backendOnline === true ? "0 0 8px #10b981" : "none",
              }} />
              <span style={{ color: "#334155" }}>
                {backendOnline === null ? "Connecting..." : backendOnline ? "API Online" : "API Offline"}
              </span>
            </div>

            {/* Tab switcher */}
            {["predict", "history"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                background: tab === t ? "rgba(0,229,255,0.1)" : "transparent",
                border: `1px solid ${tab === t ? "#00e5ff40" : "#1a2240"}`,
                color: tab === t ? "#00e5ff" : "#475569",
                textTransform: "capitalize", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.04em",
              }}>{t}</button>
            ))}
          </div>
        </header>

        {tab === "history" ? (
          <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 24px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: "#94a3b8" }}>
              Prediction History
            </div>
            <HistoryPanel history={history} />
          </div>
        ) : (
          <div style={{
            maxWidth: 1200, margin: "0 auto", padding: "32px 24px",
            display: "grid", gridTemplateColumns: "1fr 420px", gap: 24,
          }}>
            {/* ── Left: Input form ── */}
            <div>
              {/* Task selector */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28,
              }}>
                {[
                  { id: "classification", label: "Task A — Classification",
                    sub: "CONFIRMED vs FALSE POSITIVE", icon: "◉", color: "#00e5ff" },
                  { id: "regression",     label: "Task B — Regression",
                    sub: "Predict planetary radius", icon: "◎", color: "#a78bfa" },
                ].map(t => (
                  <button key={t.id} onClick={() => { setTask(t.id); clearAll(); }} style={{
                    padding: "16px 20px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    background: task === t.id
                      ? `linear-gradient(135deg, rgba(${t.id === "classification" ? "0,229,255" : "124,58,237"},0.08), transparent)`
                      : "rgba(8,13,30,0.8)",
                    border: `2px solid ${task === t.id ? (t.id === "classification" ? "#00e5ff" : "#7c3aed") + "60" : "#1a2240"}`,
                    color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, color: t.color }}>{t.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{t.sub}</div>
                  </button>
                ))}
              </div>

              {/* Quick fill */}
              <div style={{
                display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center",
              }}>
                <span style={{ fontSize: 11, color: "#334155", textTransform: "uppercase",
                                letterSpacing: "0.08em" }}>Quick fill:</span>
                <button onClick={() => fillSample(SAMPLE_CONFIRMED)} style={{
                  padding: "5px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  background: "rgba(16,185,129,0.1)", border: "1px solid #10b98130",
                  color: "#10b981", fontFamily: "'Space Grotesk', sans-serif",
                }}>✓ Confirmed example</button>
                <button onClick={() => fillSample(SAMPLE_FP)} style={{
                  padding: "5px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  background: "rgba(239,68,68,0.1)", border: "1px solid #ef444430",
                  color: "#ef4444", fontFamily: "'Space Grotesk', sans-serif",
                }}>✗ False positive example</button>
                <button onClick={clearAll} style={{
                  padding: "5px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  background: "transparent", border: "1px solid #1a2240",
                  color: "#475569", fontFamily: "'Space Grotesk', sans-serif",
                }}>Clear</button>
              </div>

              {/* Feature groups */}
              {[
                {
                  title: "Transit Parameters",
                  desc: "Observed properties of the planetary transit event",
                  keys: ["koi_period", "koi_duration", "koi_depth", "koi_impact",
                         "koi_model_snr", "koi_num_transits", ...(task === "classification" ? ["koi_ror"] : [])],
                },
                {
                  title: "Stellar Properties",
                  desc: "Characteristics of the host star",
                  keys: ["st_teff", "st_logg", "st_met", "st_mass", "st_radius", "st_dens"],
                },
                {
                  title: "Measurement Uncertainties",
                  desc: "Observational error bounds (positive = upper, negative = lower)",
                  keys: ["teff_err1", "teff_err2", "logg_err1", "logg_err2",
                         "feh_err1", "feh_err2", "mass_err1", "mass_err2",
                         "radius_err1", "radius_err2"],
                },
              ].map(group => {
                const groupFeats = features.filter(f => group.keys.includes(f.key));
                if (!groupFeats.length) return null;
                return (
                  <div key={group.title} style={{
                    marginBottom: 24, padding: 20, borderRadius: 12,
                    background: "rgba(8,13,30,0.7)",
                    border: "1px solid #1a2240",
                  }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8",
                                    textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {group.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{group.desc}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0 16px" }}>
                      {groupFeats.map(f => (
                        <FeatureInput
                          key={f.key}
                          feat={f}
                          value={values[f.key] ?? ""}
                          onChange={handleChange}
                          error={errors[f.key]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: "100%", padding: "16px", borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  background: loading
                    ? "#1a2240"
                    : task === "classification"
                      ? "linear-gradient(135deg, #0d5a7a, #0a8fa8)"
                      : "linear-gradient(135deg, #4c1d95, #6d28d9)",
                  border: "none",
                  color: loading ? "#334155" : "#e2e8f0",
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.04em",
                  boxShadow: loading ? "none"
                    : task === "classification"
                      ? "0 4px 24px rgba(0,229,255,0.2)"
                      : "0 4px 24px rgba(124,58,237,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "⟳  Running inference..." : task === "classification"
                  ? "⟹  Classify Transit Signal"
                  : "⟹  Predict Planetary Radius"}
              </button>
            </div>

            {/* ── Right: Results panel ── */}
            <div style={{ position: "sticky", top: 90, alignSelf: "start" }}>
              <div style={{
                padding: 24, borderRadius: 12,
                background: "rgba(8,13,30,0.9)",
                border: "1px solid #1a2240",
                minHeight: 300,
              }}>
                <div style={{ fontSize: 11, color: "#334155", marginBottom: 16,
                              textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Inference Output
                </div>

                {/* API Error */}
                {apiError && !loading && (
                  <div style={{
                    padding: 16, borderRadius: 8, background: "rgba(239,68,68,0.05)",
                    border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 13,
                    animation: "fadeIn 0.3s ease",
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ API Error</div>
                    <div style={{ fontSize: 11, lineHeight: 1.6 }}>{apiError}</div>
                    {!backendOnline && (
                      <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                        Start the backend with:<br />
                        <code style={{ color: "#00e5ff", fontFamily: "'JetBrains Mono', monospace" }}>
                          cd backend && pip install -r requirements.txt && python app.py
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      border: "3px solid #1a2240",
                      borderTopColor: task === "classification" ? "#00e5ff" : "#7c3aed",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto 16px",
                    }} />
                    <div style={{ color: "#475569", fontSize: 12 }}>Processing signal data...</div>
                  </div>
                )}

                {/* Result */}
                {!loading && result && (
                  task === "classification"
                    ? <ClfResult result={result} />
                    : <RegResult result={result} />
                )}

                {/* Empty state */}
                {!loading && !result && !apiError && (
                  <div style={{ textAlign: "center", padding: 60, color: "#1e3a5f" }}>
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>✦</div>
                    <div style={{ fontSize: 13 }}>Submit parameters to begin analysis</div>
                    <div style={{ fontSize: 11, marginTop: 6, color: "#1a2240" }}>
                      Or use Quick Fill to load a sample observation
                    </div>
                  </div>
                )}
              </div>

              {/* EDA summary card */}
              <div style={{
                marginTop: 16, padding: 16, borderRadius: 10,
                background: "rgba(8,13,30,0.6)", border: "1px solid #0d1630",
              }}>
                <div style={{ fontSize: 10, color: "#1e3a5f", textTransform: "uppercase",
                              letterSpacing: "0.1em", marginBottom: 10 }}>Dataset Overview</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Total KOIs", value: "9,564" },
                    { label: "Confirmed", value: "2,746", color: "#10b981" },
                    { label: "False Pos.", value: "4,839", color: "#ef4444" },
                    { label: "Candidates", value: "1,979",  color: "#f59e0b" },
                    { label: "Features", value: "23" },
                    { label: "Source", value: "Kepler" },
                  ].map(s => (
                    <div key={s.label} style={{
                      padding: "8px 10px", background: "rgba(4,6,15,0.8)",
                      borderRadius: 6, border: "1px solid #0d1630", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700,
                                    color: s.color || "#475569",
                                    fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: "8px 10px", background: "rgba(4,6,15,0.8)",
                                borderRadius: 6, border: "1px solid #0d1630", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#00e5ff",
                                  fontFamily: "'JetBrains Mono', monospace" }}>0.8962</div>
                    <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 1 }}>F1-Score (Task A)</div>
                  </div>
                  <div style={{ padding: "8px 10px", background: "rgba(4,6,15,0.8)",
                                borderRadius: 6, border: "1px solid #0d1630", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#a78bfa",
                                  fontFamily: "'JetBrains Mono', monospace" }}>0.9806</div>
                    <div style={{ fontSize: 9, color: "#1e3a5f", marginTop: 1 }}>ROC-AUC (Task A)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
