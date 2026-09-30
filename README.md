# 🏙️ UrbanPulse Guardian AI
### The AI Operating System for Safer, Smarter Cities

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8.svg)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-3.1_Flash-8e75ff.svg)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-ffca28.svg)](https://firebase.google.com/)

**UrbanPulse Guardian AI** is an enterprise-grade civic infrastructure intelligence and incident response platform. It bridges citizens, municipal departments, automated dashcam vision fleets, and emergency dispatch squads into a single synchronized operational ecosystem.

---

## 🌟 Key Features

### 1. 📱 Citizen Signal Ingest & Mobile Reporting
- **Multimodal Civic Reporting**: Citizens can capture live camera images, upload gallery photos, or submit voice/text reports of civic hazards.
- **Dynamic AI Hazard Assessment**: Gemini Vision analyzes uploaded imagery in real time, determining category, severity score (0–100%), confidence percentage, and recommended civic actions.
- **Emergency SOS Beacon**: One-tap emergency beacon with GPS coordinates, dispatching immediate emergency medical and traffic squads.
- **Personalized Notification Feed**: Private, isolated notification feeds informing citizens of report verification and crew dispatch progress.

### 2. 🚗 Automated AI Road Vision Scanner
- **Dashcam & Fleet Telemetry**: Ingests vehicle dashcam streams and recorded video footage to autonomously detect road surface distress.
- **Hazard Classification**: Automated detection of potholes, transverse fissures, severe waterlogging, missing manholes, and damaged crash barriers.
- **Spatial Clustering**: Automatically groups adjacent road distress sightings to prevent duplicate work orders.

### 3. 🏛️ Municipal Command Center & Incident Intelligence
- **Sovereign City Overview**: Real-time KPI telemetry tracking active incidents, resolution velocity, high-risk sectors, and SLA compliance.
- **Interactive Urban Risk Map**: Leaflet-powered geospatial map plotting citizen signals, AI scanner detections, and SOS beacons with dynamic clustering.
- **3-Panel Incident Intelligence**: Deep triage workspace featuring original evidence, AI confidence explanations, and actionable dispatch controls.
- **Autonomous Municipal Copilot**: AI-assisted command assistant answering natural language queries about open work orders, department workload, and emergency hotspots.

### 4. 🛠️ Field Operations & Dispatch Board
- **5-Stage Workflow Pipeline**:
  - `NEEDS_ASSIGNMENT` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `AWAITING_VERIFICATION` ➔ `RESOLVED`
- **Department Routing**: Intelligent routing to Public Works, Electrical Squads, Sanitation, Water/Drainage, or Traffic Police.
- **Proof-of-Work Verification**: Field teams upload post-resolution evidence photos before tickets are closed.

### 5. 🛡️ Enterprise Administration & Governance
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across Citizens, Municipal Officers, Field Teams, and Super Admins.
- **Department & Squad Management**: Track active field units, assigned work orders, and resolution metrics.
- **System Telemetry**: Unified audit logs and platform health monitoring.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React, Recharts |
| **Geospatial & Mapping** | Leaflet, Leaflet MarkerCluster, OpenStreetMap Carto Tiles |
| **Backend & Middleware** | Node.js (v22), Express, tsx |
| **AI Vision & Decision Engine** | Google Gen AI SDK (`@google/genai`), Gemini 3.1 Flash Lite / Gemini Flash |
| **Persistence & Auth** | Firebase Firestore, Firebase Authentication, Centralized Demo State Fallback |
| **Export & Reporting** | jsPDF, HTML2Canvas for executive municipal intelligence PDF exports |

---

## 📂 Project Directory Structure

```text
├── src/
│   ├── components/                 # Modular UI Views & Dashboards
│   │   ├── AdminPanel.tsx          # System administration, RBAC, & telemetry
│   │   ├── CityCommandCenter.tsx   # Municipal command situational overview
│   │   ├── CityInsights.tsx        # Dynamic city analytics & KPI charts
│   │   ├── CitizenSignals.tsx      # Citizen report stream & triage
│   │   ├── DispatchResponseBoard.tsx # Kanban dispatch pipeline
│   │   ├── IncidentIntelligence.tsx # 3-panel deep incident triage
│   │   ├── MunicipalCopilot.tsx    # Conversational decision-support AI
│   │   ├── RoadScanner.tsx         # Autonomous AI video/dashcam scanner
│   │   ├── UrbanRiskMap.tsx        # Geospatial hazard & SOS map
│   │   └── ...
│   ├── context/                    # React Context Providers (Auth, Language, Theme)
│   ├── lib/                        # Firebase SDK client & Firestore queries
│   ├── locales/                    # Multilingual localization bundles
│   ├── services/                   # Business logic services
│   │   ├── aiAnalysisService.ts    # Client-side AI integration
│   │   ├── demoDataService.ts      # Centralized 10-report demo fallback
│   │   ├── notificationsService.ts # Notification management & routing
│   │   ├── reportsService.ts       # Report management service
│   │   └── spatialClustering.ts    # Geospatial grouping algorithms
│   ├── types.ts                    # TypeScript types and data models
│   ├── App.tsx                     # Main application container & routing
│   └── main.tsx                    # React application entry point
├── server.ts                       # Express backend API & Vite server integration
├── vite.config.ts                  # Vite build configuration
├── package.json                    # Project dependencies and npm scripts
└── README.md                       # System documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or v22.x
- **npm**: v10.x or higher

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone <repo-url>
cd urbanpulse-guardian-ai
npm install
```

### 2. Environment Setup
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Ensure your Gemini API key is configured for server-side AI processing:
```env
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Running the Development Server
Start the local full-stack server (runs on `http://localhost:3000`):
```bash
npm run dev
```

### 4. Verification & Build
To run type checking and produce production build bundles:
```bash
npm run typecheck
npm run build
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/analyze-image` | Analyzes an uploaded civic hazard photo using Gemini Vision |
| `POST` | `/api/ai/road-scan` | Processes video frames from road scanner dashcam feeds |
| `POST` | `/api/ai/municipal-copilot` | Natural language municipal operations assistant |
| `GET` | `/api/reports` | Fetches all persisted and active incident reports |
| `POST` | `/api/reports/create` | Submits a new incident report to the persistent store |
| `GET` | `/api/notifications` | Retrieves role-isolated notifications for users/officers |
| `PATCH` | `/api/notifications/:id/read` | Marks a specific notification as read |
| `GET` | `/api/weather/ncr` | Live meteorological telemetry for municipal risk modeling |

---

## 👥 User Roles & Access

- **Citizen (`citizen`)**: Submit reports, access camera vision analysis, trigger SOS beacons, and track personal ticket status.
- **Municipal Officer (`municipal`)**: Full access to City Command, Incident Intelligence, Urban Risk Map, Dispatch Board, and Municipal Copilot.
- **Field Squad (`field_team`)**: View assigned work orders, update field status, and submit proof-of-work completion images.
- **Super Administrator (`admin`)**: Access platform user management, department teams, system settings, and full telemetry analytics.

---

## 📄 License
This project is proprietary software developed for smart city governance and public safety operations. All rights reserved.
