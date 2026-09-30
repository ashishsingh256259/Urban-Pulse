# UrbanPulse Guardian AI — Migration Implementation Plan (Phases 1–12)

This document serves as the master architectural blueprint and implementation plan for unifying **Project A** (Firebase-based Smart City foundation) and **Project B** (UrbanPulse Guardian AI Phase-14 capabilities) into a single, cohesive, production-grade **React + TypeScript + Firebase** web application.

---

## 1. Project A Architecture Summary

- **Frontend Core**: React 19 + TypeScript + Vite + Tailwind CSS.
- **Backend & Persistence**: Firebase Firestore (`ai-studio-385a0043-8c1d-4479-a82c-ad6de680ca0b`), Firebase Authentication (Google OAuth + Email), with optional express server proxy for secure AI API execution.
- **Municipal Command Deck**:
  - `CityCommandCenter.tsx`: High-level operational metrics, active incident list, triage filters.
  - `SmartCityDigitalTwin.tsx`: Multi-layer vector digital twin (Infrastructure, Energy, Mobility, Sensor, GIS).
  - `ExecutiveAnalytics.tsx`: Ward standings, response time distributions, resolution throughput charts (Recharts).
  - `AIInsightsPanel.tsx`: Automated predictive diagnostics and operational advisories.
  - `AICopilotChat.tsx`: Conversational AI advisory agent for municipal and citizen queries.
  - `JudgeDemoWorkflow.tsx`: Rapid simulation harness for city operations and inspection routines.
  - `SimpleMap.tsx`: GIS map visualization rendering open reports with interactive popups and marker clustering.
- **Security & Blueprint**: `firebase-blueprint.json` and comprehensive `firestore.rules` with strict RBAC (`citizen` vs `admin`).

---

## 2. Project B Architecture Summary

- **Vision & Edge Telemetry (Road Scanner)**:
  - Dashcam / camera stream (`getUserMedia`, `MediaRecorder`) with live canvas frame extraction (`frameExtractor.ts`).
  - Geolocation tracking (`watchPosition`), calculating real-time speed, heading, altitude, and coordinate streams.
  - Frame-level vision hazard detection (Potholes, fissures, cavities, manhole defects, road obstructions).
  - Haversine spatial clustering engine (`spatialClustering.ts`, 20m radius) deduplicating repetitive detection frames into high-confidence candidates with primary & evidence frames.
- **Citizen Experience & Crowdsourcing**:
  - `RoadAiCandidateReview.tsx`: Pre-submission inspection deck with interactive frame carousels, priority tuning, and batch submission.
  - `SafeRouteNav.tsx`: Real-time route safety scorer avoiding active road hazards and potholes.
  - `RewardsPortal.tsx`: Gamified civic points ledger, redeemable municipal transit vouchers, EV charging coupons, and ward leaderboards.
  - `CitizenEmergencySOS.tsx`: One-tap emergency broadcast with high-priority dispatch notifications.
- **Legacy Components (To Be Sunset/Replaced)**: Legacy MongoDB/Mongoose schemas, raw JSON-based persistence stubs, and disparate Express controllers.

---

## 3. Final Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 URBANPULSE GUARDIAN AI (React 19 + TSX)                     │
├──────────────────────────────────────┬──────────────────────────────────────┤
│           CITIZEN PORTAL             │       MUNICIPAL COMMAND DECK         │
│  - AI Road Scanner (Dashcam/GPS)     │  - Sovereign City Command Center     │
│  - Candidate Review & Batch Submit   │  - Smart City Digital Twin (5 Layers)│
│  - Safe Route Navigator              │  - Executive Analytics & Ward Stats  │
│  - Manual Citizen Report Form        │  - Triage Desk & Status Dispatcher   │
│  - Civic Rewards & Leaderboard       │  - Predictive AI Insights Panel      │
│  - Emergency SOS Beacon              │  - AI Municipal Copilot Workspace    │
└──────────────────────────────────────┴──────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SERVER & MIDDLEWARE (server.ts)                       │
│  - Express /api endpoints (Health, Gemini Proxy, Road Frame Vision)         │
│  - Gemini 2.5 Flash / Pro Vision Inference (API Keys securely on server)    │
│  - Vite SPA integration (Port 3000)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIREBASE PLATFORM SERVICES                            │
│  - Firebase Authentication (RBAC: citizen, admin)                            │
│  - Cloud Firestore (Durable real-time synchronization & collection storage) │
│  - Firebase Storage (Dashcam frames, citizen photos, evidence clusters)     │
│  - Firestore Security Rules (Strict schema validation & ownership checks)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. TypeScript Strategy

- **100% Strict Type Safety**: No untyped `.js` or `.jsx` files in the final codebase.
- **Centralized Domain Types (`src/types.ts`)**:
  - `User`, `Role` (`"citizen" | "admin"`)
  - `Report`, `ReportStatus`, `ReportSource` (`"MANUAL_REPORT" | "ROAD_SCANNER"`)
  - `GPSCoordinate`, `RawRoadDetection`, `RoadScanCandidate`, `RoadScanSession`
  - `SafeRouteOption`, `RewardItem`, `LeaderboardUser`, `Notification`, `StatusHistory`, `ForecastData`
- **Zero Duplicate Interfaces**: Reused shared interfaces across all UI components and backend server endpoints.

---

## 5. Firebase Strategy

- **Core Authority**: Firebase is the single authoritative source of truth for all users, reports, evidence, notifications, audit trails, and civic points.
- **Dual-Layer Synchronization**:
  - Real-time client listeners (`onSnapshot` / `collection`) for instant UI reactivity.
  - Server-side fallback/admin SDK operations where batch synchronization or administrative overrides are required.
- **Offline Resilience**: Clean error fallbacks and sovereign cached states if network connectivity fluctuates during road drives.

---

## 6. Firestore Data Model

1. **`users/{userId}`**:
   - `id`, `email`, `fullName`, `role` (`"citizen" | "admin"`), `points`, `badges`, `scansCount`, `reportsCount`, `createdAt`
2. **`reports/{reportId}`**:
   - `id`, `title`, `description`, `category`, `severity`, `riskLevel`, `priority`, `confidence`, `status`, `location`, `latitude`, `longitude`, `image`, `reporterEmail`, `assignedTo`, `source`, `roadScanId`, `clusterCount`, `evidenceFrames`, `aiAnalysis`, `createdAt`, `updatedAt`
3. **`roadScans/{scanId}`** *(Optional session tracking)*:
   - `id`, `userId`, `startTime`, `endTime`, `totalDistanceMeters`, `totalFramesAnalyzed`, `totalDetections`, `routePath`, `status`
4. **`notifications/{notificationId}`**:
   - `id`, `recipientEmail`, `recipientRole`, `title`, `message`, `type`, `reportId`, `read`, `createdAt`
5. **`history/{historyId}`**:
   - `id`, `reportId`, `status`, `updatedBy`, `comment`, `createdAt`

---

## 7. Firebase Storage Strategy

- **Path Structure**:
  - `reports/{reportId}/primary.jpg`
  - `road_scans/{scanId}/evidence/{clusterId}_{frameIndex}.jpg`
- **Upload Optimization**:
  - Image compression and thumbnail generation client-side before upload to conserve bandwidth.
  - Base64 data URL fallback for transient offline candidate reviews before batch-uploading confirmed items.

---

## 8. Authentication Strategy

- **Firebase Authentication**:
  - Email/Password sign-in and Google OAuth provider support.
  - Automatic profile document bootstrap in `users/{uid}` on first login with default role `"citizen"`.
  - Admin escalation via security rules or verified administrative credentials.
  - Contextual authentication state throughout `App.tsx` driving role-based terminal layouts.

---

## 9. Road Scanner Migration Strategy

```
[Dashcam / Webcam / Simulated Clip]
                  │
                  ▼
         [frameExtractor.ts] (Extracts 1 frame/sec @ 720p)
                  │
                  ▼
         [GPS Telemetry Stream] (Speed, Heading, Lat/Lng)
                  │
                  ▼
  [Server Vision API: /api/scanner/analyze-frame]
                  │
                  ▼
      [RawRoadDetection Queue]
                  │
                  ▼
    [spatialClustering.ts (Haversine 20m Window)]
                  │
                  ▼
      [RoadScanCandidate Collection]
                  │
                  ▼
  [RoadAiCandidateReview.tsx (Citizen Deck)]
                  │
                  ▼ (Batch Submit)
[Firestore /reports Collection + Civic Reward Allocation]
```

---

## 10. Gemini Architecture

- **Security Rule**: Gemini API key is strictly maintained on the server (`process.env.GEMINI_API_KEY`) and NEVER exposed to client browsers.
- **Model Usage**: `gemini-2.5-flash` for high-throughput road frame vision inference, risk categorization, and conversational copilot responses.
- **Endpoints**:
  - `POST /api/analyze-image`: Manual report image triage and severity estimation.
  - `POST /api/scanner/analyze-frame`: High-speed dashcam road frame inspection.
  - `POST /api/copilot/query`: Municipal and citizen decision-support queries.

---

## 11. Municipal Integration Strategy

- **Unification into `CityCommandCenter.tsx`**:
  - Consolidated view uniting manual citizen reports and Road Scanner auto-detected hazards.
  - Triage filter toolbar by Status (`Pending`, `Assigned`, `In Progress`, `Resolved`), Severity (`High`, `Medium`, `Low`), and Source (`Manual`, `Scanner`).
  - Action modal for municipal dispatchers to assign teams, update status, and log audit history.

---

## 12. Map / Heatmap / Analytics Integration

- **Interactive Leaflet GIS Grid (`SimpleMap.tsx`)**:
  - Real-time pins with dynamic color-coding based on severity (Red: Critical, Orange: High, Yellow: Medium, Green: Resolved).
  - Spatial density overlay simulating pothole and hazard heatmaps across city wards.
- **Executive Analytics (`ExecutiveAnalytics.tsx` & `CityHealthReport.tsx`)**:
  - Ward performance index, resolution time histograms, category distributions, and real-time City Health Index computation.

---

## 13. Copilot Integration

- **Dual-Mode AI Advisor (`AICopilotChat.tsx`)**:
  - **Citizen Mode**: Provides guidance on reporting guidelines, safe transit recommendations, and reward redemption instructions.
  - **Municipal Mode**: Analyzes systemic ward infrastructure deficits, suggests optimal maintenance dispatch routes, and drafts incident briefings.

---

## 14. Safe Route / SOS / Rewards Strategy

- **Safe Route Navigator (`SafeRouteNav.tsx`)**:
  - Calculates multiple transit corridors between city waypoints.
  - Evaluates live hazard density within a 50m corridor of each route option, providing a safety score (0–100%) and hazard warnings.
- **Citizen Emergency SOS (`CitizenEmergencySOS.tsx`)**:
  - One-tap distress beacon broadcasting immediate GPS coordinates, triggering instant critical priority reports and dispatch alerts.
- **Civic Rewards Portal (`RewardsPortal.tsx`)**:
  - Real-time balance of earned Civic Points (+150 pts per verified scanner hazard, +100 pts per manual report).
  - Voucher redemption catalog (Metro passes, parking waivers, EV charging credits).
  - Community ward leaderboard ranking top civic contributors.

---

## 15. MongoDB Removal Strategy

1. **Verify Complete Firestore Parity**: Ensure all database reads, writes, and queries operate against Firestore.
2. **Audit Dependencies**: Confirm no remaining imports of `mongoose` or `mongodb` in `package.json`.
3. **Clean Configuration**: Strip any unused `MONGODB_URI` environment variables from `.env.example`.
4. **Remove Legacy Schema Files**: Deprecate any leftover Mongo model stubs.

---

## 16. Security Strategy

- **Firestore Security Rules**: Enforce immutable fields (`createdAt`, `id`), verified reporter email matching, and strict admin-only update rules for triage assignments.
- **Input Validation**: Clean sanitization on all text inputs and bounded numeric ranges for coordinates, severities, and confidence scores.
- **Safe Iframe Operation**: All state persistence resilient to iframe sandbox constraints without relying on restricted window APIs.

---

## 17. Deployment Strategy

- **Vite Production Build**: Single-command compilation outputting clean static client bundles to `dist/`.
- **Node Server Bundle**: `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs`.
- **Port Ingress**: Server listens on port `3000` on `0.0.0.0`.

---

## 18. 12-Phase Implementation Roadmap

| Phase | Title | Scope & Outcomes |
|---|---|---|
| **Phase 1** | Project Audit & TypeScript Migration Map | Complete repository audit, dependency mapping, master implementation plan generation. *(Current)* |
| **Phase 2** | Firebase Foundation & Data Model | Validate Firestore configuration, rules, and unified TypeScript interfaces. |
| **Phase 3** | Authentication & Roles | Firebase Auth initialization, role-based layout access (`citizen` vs `admin`). |
| **Phase 4** | Reports & Storage Architecture | Standardized report lifecycle in Firestore, image asset handling. |
| **Phase 5** | Manual Report System Migration | Citizen photo upload, AI triage analysis, and instant submission pipeline. *(Completed)* |
| **Phase 6** | Road Scanner Edge & Vision Engine | Video/Webcam frame extractor, GPS tracker, and Gemini frame analysis endpoint. *(Completed)* |
| **Phase 7** | Spatial Clustering & Candidate Review | Haversine clustering (20m), duplicate merging, best evidence selection, Citizen Review UI, Firebase Storage upload, and canonical Firestore report generation (`source: ROAD_SCANNER`). *(Completed)* |
| **Phase 8** | Municipal Command Center Integration | Unified triage desk, status dispatching, and audit logging. |
| **Phase 9** | Map, Heatmap, Digital Twin & Analytics | Leaflet hazard GIS, 5-layer vector digital twin, and executive metrics charts. |
| **Phase 10** | Copilot, Safe Route, SOS & Rewards | AI advisory assistant, hazard-avoiding GPS navigation, SOS beacon, and rewards portal. |
| **Phase 11** | MongoDB Removal, Security & Build Hardening | Purge legacy Mongo artifacts, audit Firestore rules, and verify production bundle. |
| **Phase 12** | End-to-End Validation & Live Demo | Comprehensive smoke test across citizen and municipal workflows, demo harness verification. |

---

## 19. Feature Ownership Map

### Citizen Terminal
- AI Road Scanner (Live Dashcam & Simulation)
- Candidate Review & Batch Submission
- Safe Route Navigator
- Manual Citizen Report Form
- Civic Rewards & Leaderboard
- Emergency SOS Beacon
- Citizen Copilot Advisor
- Personal Incident History

### Municipal Command Deck
- Sovereign City Command Center
- Municipality Triage Desk & Dispatcher
- Smart City Digital Twin (5 Vector Layers)
- Executive Analytics & Ward Standings
- City Health Index Diagnostics
- Municipal AI Copilot Workspace
- Emergency Response Fleet Monitor

---

## 20. Duplicate Systems to Eliminate

- **Dual Database Adapters**: Eliminate legacy Mongo/Postgres queries in favor of unified Firestore collections.
- **Multiple Report Definitions**: Consolidate disparate report formats into the single `Report` type in `src/types.ts`.
- **Scattered AI Callers**: Funnel all Gemini operations through standardized server-side proxy routes.

---

## 21. Files/Components Likely to Be Reused

- `src/components/CityCommandCenter.tsx`
- `src/components/SmartCityDigitalTwin.tsx`
- `src/components/ExecutiveAnalytics.tsx`
- `src/components/AIInsightsPanel.tsx`
- `src/components/AICopilotChat.tsx`
- `src/components/SimpleMap.tsx`
- `src/components/JudgeDemoWorkflow.tsx`
- `src/components/RoadScanner.tsx`
- `src/components/RoadAiCandidateReview.tsx`
- `src/components/SafeRouteNav.tsx`
- `src/components/RewardsPortal.tsx`
- `src/components/CitizenEmergencySOS.tsx`
- `src/services/frameExtractor.ts`
- `src/services/spatialClustering.ts`

---

## 22. Files/Components Likely to Be Migrated

- `server.ts` — Enhanced with unified Firestore sync, Gemini road frame analysis, and report proxy routes.
- `src/App.tsx` — Orchestrator linking Citizen and Municipal workspaces with tab-based navigation.
- `firestore.rules` — Rules covering reports, candidates, users, rewards, and notifications.

---

## 23. Files/Components Likely to Be Deprecated

- Any legacy MongoDB schema models or controllers.
- Redundant mock JSON data files (`urbanpulse_db.json`, `db.json`) once Firestore live synchronization is active.

---

## 24. Major Technical Risks & Mitigations

1. **High-Frequency Frame Overload**:
   - *Risk*: Rapid dashcam frame extraction overwhelming the vision API or network.
   - *Mitigation*: Rate-limit extraction to 1 frame/sec with client-side canvas resolution downsampling and local deduplication.
2. **GPS Accuracy Fluctuations**:
   - *Risk*: GPS drift creating fragmented detection clusters.
   - *Mitigation*: Haversine spatial window (20m threshold) with heading and timestamp proximity verification.
3. **Gemini API Quota Constraints**:
   - *Risk*: Exhausting vision API limits during continuous live drives.
   - *Mitigation*: Intelligent heuristic client pre-filtering and resilient server-side fallback simulation.

---

## 25. Migration Acceptance Criteria

- [x] Zero JavaScript (`.js`/`.jsx`) application files — 100% strict TypeScript (`.ts`/`.tsx`).
- [x] No MongoDB/Mongoose dependencies in `package.json` or runtime imports.
- [x] Firebase Firestore and Firebase Auth act as the sole database and authentication system.
- [x] AI Road Scanner extracts video frames, attaches GPS telemetry, performs vision analysis, and clusters candidates.
- [x] Candidate Review deck allows citizens to inspect evidence and batch-submit tickets to Firestore.
- [x] Municipal Command Deck displays live incident reports, Digital Twin, Executive Analytics, and triage controls.
- [x] Safe Route Navigator identifies active hazard pins and computes safety scores.
- [x] Rewards Portal records points for verified submissions and displays redeemable civic vouchers.
- [x] Clean TypeScript build (`npm run lint` and `npm run build` pass with zero errors).
