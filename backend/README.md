# 🔭 ExoScope — Exoplanet Intelligence System

> Innorave Eco-Hackathon · Sustainability & Environmental Intelligence
> **Task A (Classification) + Task B (Regression)**

---

## 📊 Model Performance

| Task | Metric | Score |
|------|--------|-------|
| Task A – Classification | **F1-Score** | **0.8962** |
| Task A – Classification | **ROC-AUC** | **0.9806** |
| Task B – Regression | RMSE | 30.89 R⊕ |
| Task B – Regression | MAE | 3.61 R⊕ |

> Note: Regression RMSE is large due to extreme outlier planets (>100 R⊕) in the dataset. 
> The model uses log-transform of `koi_prad`, so median predictions are accurate.

---

## 🗂️ Project Structure

```
exoscope/
├── backend/
│   ├── app.py               # Flask REST API (Task A + B endpoints)
│   ├── requirements.txt     # Python dependencies
│   ├── clf_pipeline.pkl     # Trained RandomForest classifier (Task A)
│   ├── reg_pipeline.pkl     # Trained GradientBoosting regressor (Task B)
│   └── model_metadata.json  # Feature stats, importance, metrics
│
└── frontend/
    └── ExoScope.jsx         # React component (drop into any CRA / Vite project)
```

---

## ⚙️ Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
# API runs at http://localhost:5000
```

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Check API + model status |
| POST | `/predict/classification` | Task A: CONFIRMED vs FALSE POSITIVE |
| POST | `/predict/regression` | Task B: Planet radius (R⊕) |
| GET | `/history` | Last 50 predictions (SQLite log) |
| GET | `/metadata` | Feature stats & model metrics |

### Example Request (Classification)

```bash
curl -X POST http://localhost:5000/predict/classification \
  -H "Content-Type: application/json" \
  -d '{
    "koi_period": 9.488,
    "koi_duration": 2.9575,
    "koi_depth": 615.8,
    "koi_impact": 0.146,
    "koi_model_snr": 35.8,
    "koi_num_transits": 142,
    "koi_ror": 0.0223,
    "st_teff": 5762,
    "st_logg": 4.426,
    "st_met": 0.14,
    "st_mass": 0.985,
    "st_radius": 0.989,
    "st_dens": 1.469,
    "teff_err1": 123, "teff_err2": -123,
    "logg_err1": 0.068, "logg_err2": -0.243,
    "feh_err1": 0.15, "feh_err2": -0.15,
    "mass_err1": 0.1315, "mass_err2": -0.0868,
    "radius_err1": 0.465, "radius_err2": -0.114
  }'
```

### Example Response

```json
{
  "prediction": "CONFIRMED",
  "confidence": 0.9823,
  "prob_confirmed": 0.9823,
  "prob_false_positive": 0.0177,
  "model_metrics": {"f1": 0.8962, "roc_auc": 0.9806},
  "feature_importance": { "feh_err2": 0.1058, "koi_ror": 0.0971, ... },
  "latency_ms": 12.4
}
```

---

## 🖥️ Frontend Setup

The frontend is a single React component. Use with any React setup:

```bash
# With Vite
npm create vite@latest exoscope-ui -- --template react
cd exoscope-ui
npm install
# Replace src/App.jsx with ExoScope.jsx
npm run dev
```

**Features:**
- Task A / Task B switcher
- All 23 features with tooltips explaining each parameter
- Client-side validation (required fields, type checks, range warnings)
- "Quick Fill" sample buttons (confirmed vs false positive examples)
- Probability bars with animated transitions (Task A)
- Interactive planet size visualizer with comparison to Mercury/Earth/Jupiter (Task B)
- Feature importance chart
- Live API latency display
- Prediction history log
- Backend health indicator
- Responsive two-column layout
- Space-themed UI with animated starfield

---

## 🧠 ML Pipeline Details

### Feature Selection (EDA-informed)

**Excluded:**
- `kepid` — identifier, no predictive value
- `koi_disposition` — target variable
- `koi_prad` excluded from Task A features (used only as Task B target)
- `koi_ror` excluded from Task B features (encodes radius ratio — high leakage risk for regression)

**23 features used** across transit parameters, stellar properties, and measurement uncertainties.

### Task A — Classification

- Model: `RandomForestClassifier(n_estimators=200, max_depth=15)`
- Pipeline: `SimpleImputer(median)` → `StandardScaler` → RF
- Binary target: CONFIRMED=1, FALSE POSITIVE=0 (CANDIDATE rows excluded)
- Class distribution: 2,746 confirmed / 4,839 false positives

### Task B — Regression

- Model: `GradientBoostingRegressor(n_estimators=200, max_depth=5, lr=0.1)`
- Pipeline: `SimpleImputer(median)` → `StandardScaler` → GBM
- Target: `log1p(koi_prad)` — log-transformed for skewed distribution
- Prediction output: `expm1(log_prediction)` — back-transformed to R⊕

### Data Storage (Audit Log)

Every prediction is logged to a local SQLite database (`predictions.db`) with:
- Timestamp, task type, full input features, prediction result, inference latency

---

## 🚀 Deployment Notes

For production deployment:
- Replace SQLite with **PostgreSQL** for concurrent writes
- Host backend on **Render / Railway / Fly.io**
- Host frontend on **Vercel / Netlify**
- Add environment variable `API_BASE` for the deployed backend URL
- Consider adding JWT auth for the `/history` endpoint
