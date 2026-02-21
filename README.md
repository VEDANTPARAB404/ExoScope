# ExoScope 🌌

**Exoplanet Intelligence System — ML-Powered Classification & Radius Prediction**

ExoScope is a full-stack machine learning application for analyzing Kepler Object of Interest (KOI) data. It provides real-time classification of exoplanet candidates and regression-based planetary radius prediction through a clean web interface backed by trained scikit-learn models.

![ExoScope Banner](https://img.shields.io/badge/ML-scikit--learn-orange) ![React](https://img.shields.io/badge/Frontend-React-blue) ![Flask](https://img.shields.io/badge/Backend-Flask-green) ![Python](https://img.shields.io/badge/Python-3.8+-blue)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Model Performance](#model-performance)
- [Project Structure](#project-structure)
- [Limitations & Scope](#limitations--scope)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

ExoScope addresses two complementary machine learning tasks on the Kepler KOI dataset:

| Task | Type | Goal | Model | Performance |
|------|------|------|-------|-------------|
| **Task A** | Classification | Distinguish CONFIRMED exoplanets from FALSE POSITIVE signals | RandomForestClassifier | F1: 0.8977, ROC-AUC: 0.9810 |
| **Task B** | Regression | Predict planetary radius in Earth radii (R⊕) | GradientBoostingRegressor | Median AE: 0.114 R⊕ |

**Dataset:** 9,564 Kepler Objects of Interest (KOI) with 26 features including transit parameters, stellar properties, and measurement uncertainties.

**Use Case:** Rapid vetting of exoplanet candidates and size estimation for habitability screening.

---

## ✨ Features

### Machine Learning
- ✅ Binary classification: CONFIRMED vs FALSE POSITIVE
- ✅ Regression: Planetary radius prediction with confidence intervals
- ✅ Feature importance analysis for model interpretability
- ✅ Log-space regression for handling 6-order-of-magnitude target range
- ✅ Robust preprocessing pipeline (median imputation + standard scaling)

### Web Application
- ✅ Interactive React frontend with 23-field input form
- ✅ Real-time validation with soft warnings for unusual values
- ✅ Quick-fill sample data buttons
- ✅ Animated starfield background
- ✅ Probability visualization bars
- ✅ Planet size comparison chart (Earth, Neptune, Jupiter)
- ✅ Feature importance charts

### Backend API
- ✅ Flask REST API with CORS support
- ✅ Pre-loaded scikit-learn pipelines for low-latency inference
- ✅ SQLite audit log for all predictions
- ✅ Health check endpoint with model metrics
- ✅ Prediction history retrieval

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────────┐
│  React Frontend │ ──JSON──▶│   Flask API     │ ──────▶ │   ML Pipelines   │
│  (Vite, :5173)  │ ◀──────  │   (Python,:5000)│ ◀────── │ RandomForest     │
└─────────────────┘         └────────┬────────┘         │ GradientBoosting │
                                     │                   └──────────────────┘
                                     │ log
                                     ▼
                            ┌─────────────────┐
                            │  SQLite DB      │
                            │  (Audit Log)    │
                            └─────────────────┘
```

**Tech Stack:**
- **Frontend:** React 18 + Vite
- **Backend:** Flask + Flask-CORS
- **ML:** scikit-learn (RandomForest, GradientBoosting)
- **Database:** SQLite (prototype), PostgreSQL recommended for production
- **Deployment:** Local dev servers (can be deployed to Render/Vercel)

---

## 🚀 Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Flask server
python app.py
```

Backend runs at `http://localhost:5000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 🎯 Usage

### Web Interface

1. Open `http://localhost:5173` in your browser
2. Choose Task A (Classification) or Task B (Regression)
3. Fill in the 23 observation features:
   - **Transit parameters:** period, duration, depth, impact, SNR, etc.
   - **Stellar properties:** temperature, surface gravity, metallicity, mass, radius
   - **Measurement uncertainties:** error columns for each stellar parameter
4. Click **Predict** to get results
5. View:
   - Classification: Label + confidence + probability bars
   - Regression: Radius + 95% CI + size category + planet visualization

### Quick Fill
Click **"Quick Fill: Super-Earth"** or **"Quick Fill: Hot Jupiter"** to load realistic sample data.

### API Usage

**Classification:**
```bash
curl -X POST http://localhost:5000/predict/classification \
  -H "Content-Type: application/json" \
  -d '{
    "koi_period": 3.52,
    "koi_duration": 2.48,
    "koi_depth": 615.8,
    "koi_impact": 0.146,
    "koi_model_snr": 35.8,
    ...
  }'
```

**Response:**
```json
{
  "prediction": "CONFIRMED",
  "confidence": 0.94,
  "probabilities": {
    "FALSE POSITIVE": 0.06,
    "CONFIRMED": 0.94
  },
  "feature_importance": {...},
  "inference_time_ms": 12.4
}
```

**Regression:**
```bash
curl -X POST http://localhost:5000/predict/regression \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response:**
```json
{
  "radius_earth_radii": 2.26,
  "confidence_interval_95": [2.01, 2.53],
  "size_category": "Super-Earth",
  "feature_importance": {...},
  "inference_time_ms": 8.7
}
```

---

## 📊 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Model status and evaluation metrics |
| `POST` | `/predict/classification` | Task A inference |
| `POST` | `/predict/regression` | Task B inference |
| `GET` | `/history` | Last 50 predictions from audit log |
| `GET` | `/metadata` | Feature statistics and model metadata |

### Request Schema

All prediction endpoints accept JSON with 23 features (Task A) or 22 features (Task B):

**Required Fields (both tasks):**
- `koi_period`, `koi_duration`, `koi_depth`, `koi_impact`, `koi_model_snr`, `koi_num_transits`
- `st_teff`, `st_logg`, `st_met`, `st_mass`, `st_radius`, `st_dens`
- `teff_err1`, `teff_err2`, `logg_err1`, `logg_err2`
- `feh_err1`, `feh_err2`, `mass_err1`, `mass_err2`, `radius_err1`, `radius_err2`

**Task A only:** `koi_ror` (radius ratio)

**Task B only:** Excludes `koi_ror`

---

## 📈 Model Performance

### Task A — Classification

| Metric | Score |
|--------|-------|
| F1-Score | 0.8977 |
| ROC-AUC | 0.9810 |
| Precision | 0.912 |
| Recall | 0.884 |

**Top Features:**
1. `koi_ror` (10.0%) — Radius ratio
2. `feh_err2` (9.9%) — Metallicity uncertainty
3. `koi_model_snr` (8.0%) — Transit SNR
4. `koi_period` (7.6%) — Orbital period
5. `teff_err1` (7.4%) — Temperature uncertainty

### Task B — Regression

| Metric | Score |
|--------|-------|
| Median AE | 0.114 R⊕ |
| MAE | 3.61 R⊕ |
| RMSE | 30.89 R⊕ |

> **Note:** RMSE is inflated by extreme outliers (stellar companions > 1000 R⊕). Median AE is the most meaningful metric for typical exoplanets.

**Top Features:**
1. `koi_depth` (57.1%) — Transit depth
2. `koi_impact` (28.7%) — Impact parameter
3. `st_dens` (6.2%) — Stellar density

---

## 📁 Project Structure

```
ExoScope/
├── backend/
│   ├── app.py                    # Flask API server
│   ├── clf_pipeline.pkl          # Trained classification model (10.5 MB)
│   ├── reg_pipeline.pkl          # Trained regression model (845 KB)
│   ├── model_metadata.json       # Feature stats and model info
│   ├── requirements.txt          # Python dependencies
│   └── predictions.db            # SQLite audit log
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main React component
│   │   └── main.jsx              # React entry point
│   ├── public/
│   │   └── exoscope-logo.svg     # Logo (optional)
│   ├── index.html                # HTML template
│   ├── package.json              # Node dependencies
│   └── vite.config.js            # Vite configuration
│
└── README.md                      # This file
```

---

## ⚠️ Limitations & Scope

### Project Scope
This is a **proof-of-concept** demonstrating ML deployment on Kepler KOI data. It is **not production-ready** for the following reasons:

### Known Limitations

1. **Domain-Specific Model**
   - Trained exclusively on Kepler KOIs
   - Performance on TESS, PLATO, JWST data is untested
   - Features are Kepler pipeline-specific (e.g., `koi_model_snr`)

2. **Probability Calibration**
   - Classification probabilities are **not calibrated**
   - Should not be used for occurrence-rate studies without recalibration (e.g., Platt scaling)

3. **Dataset Size**
   - 9,564 samples is moderate for traditional ML, insufficient for deep learning
   - Single train/test split (80/20) — k-fold CV recommended

4. **Feature Leakage Risk**
   - Some features derived from Kepler vetting pipeline may encode target information
   - Example: `koi_model_snr` partially reflects vetting decisions

5. **Regression Outliers**
   - Objects with radius > 10,000 R⊕ are likely stellar companions, not planets
   - These inflate RMSE but don't affect typical exoplanet predictions

6. **Deployment**
   - SQLite suitable for single-user prototype only
   - PostgreSQL + authentication required for multi-user production

---

## 🔮 Future Improvements

### Model Enhancements
- [ ] **Probability calibration** (Platt scaling, isotonic regression)
- [ ] **k-fold cross-validation** for robust performance estimates
- [ ] **Uncertainty quantification** (conformal prediction, Bayesian NNs)
- [ ] **Domain adaptation** testing on TESS/PLATO/JWST data
- [ ] **Active learning** pipeline for new KOI batches
- [ ] **Outlier filtering** (remove stellar companions before regression training)

### Engineering
- [ ] **PostgreSQL migration** for production database
- [ ] **Authentication layer** (OAuth, JWT)
- [ ] **Rate limiting** on API endpoints
- [ ] **Logging & monitoring** (Prometheus, Grafana)
- [ ] **CI/CD pipeline** (GitHub Actions)
- [ ] **Docker containerization**
- [ ] **Cloud deployment** (AWS, GCP, Azure)

### Features
- [ ] **Batch prediction** endpoint
- [ ] **Model retraining** API
- [ ] **Advanced visualizations** (ROC curves, calibration plots)
- [ ] **Export predictions** as CSV/JSON
- [ ] **User accounts** for saved predictions

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Write unit tests for new features
- Update documentation as needed

---

## 📄 License

This project was developed for the **Innorave Eco-Hackathon 2025** under the theme "Sustainability & Environmental Intelligence."

**Dataset:** NASA Exoplanet Archive — Kepler KOI Table  
**Citation:** [https://exoplanetarchive.ipac.caltech.edu/](https://exoplanetarchive.ipac.caltech.edu/)

---

## 🙏 Acknowledgments

- **NASA Kepler Mission** for the KOI dataset
- **scikit-learn** for the ML framework
- **React & Vite** for the frontend tooling
- **Flask** for the backend API

**Built with 🌌 for exoplanet discovery**
