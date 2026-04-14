🌱 GreenFed
Privacy-Preserving Federated Learning for Smart Home Sustainability

GreenFed is a privacy-first federated learning framework designed to optimize electricity and water consumption in smart homes. It enables intelligent predictions and sustainability scoring without sharing raw user data.

🚀 Overview

Traditional smart home systems rely on centralized machine learning, which raises privacy concerns. GreenFed solves this using Federated Learning:

Data stays on local devices
Only model updates are shared
No raw household data is exposed
🎯 Key Features

🔒 Privacy-Preserving AI (No raw data sharing)

⚡ Dual Resource Optimization (Electricity + Water)

📊 Dual GreenScore (0–100 sustainability score)

🤖 LSTM-based time series prediction

🌍 Carbon footprint tracking

🖥️ Interactive React dashboard

🔁 Federated learning using FedAvg

🧠 System Architecture

User Devices → Local Training (LSTM) → Model Updates → FedAvg Aggregation → Global Model → GreenScore & Predictions

⚙️ Tech Stack

Frontend:

React 18
Vite

Backend:

Flask
JWT Authentication

Machine Learning:

TensorFlow / Keras
LSTM
Federated Learning (FedAvg)
📊 How It Works
Each household trains a local LSTM model
Only weights are shared (not data)
Server aggregates using FedAvg
Global model is redistributed
Each home computes its GreenScore
🌿 Dual GreenScore

Range: 10 – 95

Categories:

🌟 Thriving (≥ 75)
📈 Growing (55–74)
🌱 Budding (35–54)
⚠️ Wilting (< 35)
🌍 Carbon Footprint
Based on India's grid emission factor
Tracks daily, monthly, yearly CO₂
Provides tree-equivalent insights
📈 Results
⚡ Electricity RMSE improved by ~4.7%
💧 Water RMSE improved by ~10.5%
🔐 Zero raw data sharing
📊 Comparable to centralized models (~5% gap)
🖥️ Dashboard Features
GreenScore visualization
Community leaderboard
What-if simulator
Carbon footprint tracking
Model convergence graphs
Downloadable reports


▶️ Getting Started


cd GreenFed

Backend:
cd backend
pip install -r requirements.txt
python app.py

Frontend:
cd frontend
npm install
npm run dev

🔮 Future Work
Real-time IoT integration,
Differential privacy (ε-budget),
FedProx optimization,
Live smart meter data.
