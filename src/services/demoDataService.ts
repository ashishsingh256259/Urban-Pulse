import { Report, Notification, ReportCategory, Priority, RiskLevel } from "../types";
import { getReportDisplayImage } from "./reportsService";

/**
 * =========================================================================
 * URBANPULSE CENTRALIZED 10-REPORT DEMO DATA SYSTEM
 * =========================================================================
 * 
 * Distribution:
 * - AI Road Scanner: 4 reports (DEMO-SCAN-001 .. DEMO-SCAN-004)
 * - Citizen Manual:  4 reports (DEMO-CITIZEN-001 .. DEMO-CITIZEN-004)
 * - Emergency SOS:   2 reports (DEMO-SOS-001, DEMO-SOS-002)
 * Total: Exactly 10 canonical demo reports
 * 
 * Rules:
 * 1. This dataset is strictly FRONTEND-ONLY fallback data.
 * 2. It is NEVER written to Firestore (reports, users, history, notifications).
 * 3. All dashboards (Admin, Municipal, Map, Dispatch, Insights, RoadScanner, Copilot)
 *    consume the SAME 10 records.
 */

export const DEMO_REPORTS: Report[] = ([
  // =========================================================================
  // 1. AI ROAD SCANNER — 4 REPORTS
  // =========================================================================
  {
    id: "DEMO-SCAN-001",
    userId: "system_ai_scanner",
    title: "Pothole & Surface Cavity on Sector 45 Arterial",
    description: "Automated road vision telemetry detected deep 14-inch asphalt pothole on primary transit lane causing sharp vehicular swerving.",
    category: "Pothole",
    issueType: "Pothole",
    severity: 88,
    riskLevel: "High",
    priority: "Critical",
    confidence: 94,
    status: "Pending",
    location: "Sector 45 Main Arterial Road, Gurugram",
    latitude: 28.4595,
    longitude: 77.0725,
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "scanner.fleet@urbanpulse.ai",
    reporterName: "AI Road Vision Fleet #108",
    assignedTo: null,
    source: "ROAD_SCANNER",
    roadScanId: "SCAN-SESSION-108A",
    clusterCount: 3,
    sourceCamera: "Vehicle Dashcam",
    workflowState: "AI VERIFIED",
    fieldStatus: "ASSIGNED",
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Pothole",
      detectedIssue: true,
      severityScore: 88,
      riskLevel: "High",
      confidence: 94,
      description: "Severe asphalt cavity exceeding structural safety threshold. High puncture and rim compromise hazard.",
      explanation: "High-contrast rim damage hazard with sub-base erosion detected along the outer wheelpath. Immediate cold-mix patch recommended.",
      recommendedAction: "Deploy rapid cold-asphalt infill unit and warning cones",
      recommendedActions: [
        "Deploy rapid cold-asphalt infill unit",
        "Erect high-visibility hazard bollards",
        "Inspect sub-base moisture drainage"
      ]
    }
  },
  {
    id: "DEMO-SCAN-002",
    userId: "system_ai_scanner",
    title: "Major Transverse Fissure on Outer Ring Road",
    description: "Continuous 4-meter transverse road surface fissure across two vehicular lanes with rapid structural joint degradation.",
    category: "Pothole",
    issueType: "Road Crack / Fissure",
    severity: 76,
    riskLevel: "High",
    priority: "High",
    confidence: 91,
    status: "Assigned",
    location: "Outer Ring Road near IIT Flyover, South Delhi",
    latitude: 28.5448,
    longitude: 77.1926,
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "scanner.fleet@urbanpulse.ai",
    reporterName: "AI Road Vision Fleet #204",
    assignedTo: "Road Maintenance Team Alpha (RT-014)",
    source: "ROAD_SCANNER",
    roadScanId: "SCAN-SESSION-204C",
    clusterCount: 2,
    sourceCamera: "Vehicle Dashcam",
    workflowState: "ASSIGNED",
    fieldStatus: "ACCEPTED",
    assignment: {
      teamId: "RT-014",
      teamName: "Road Maintenance Team Alpha",
      assignedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      priority: "High"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // 1.5 hr ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Pothole",
      detectedIssue: true,
      severityScore: 76,
      riskLevel: "High",
      confidence: 91,
      description: "Extended transverse asphalt fissure with early alligator cracking along structural joints.",
      explanation: "Surface stress fracture resulting from thermal expansion and heavy commercial vehicle axle loading.",
      recommendedAction: "Schedule pressurized crack-sealant application",
      recommendedActions: [
        "Schedule pressurized crack-sealant application",
        "Deploy mobile lane-closure arrow board",
        "Conduct subgrade ultrasonic stability test"
      ]
    }
  },
  {
    id: "DEMO-SCAN-003",
    userId: "system_ai_scanner",
    title: "Severe Waterlogging on Saket Underpass Corridor",
    description: "Standing storm runoff depth exceeding 18cm across underpass approach, causing severe traffic choke and hydroplaning risks.",
    category: "Road Obstruction",
    issueType: "Waterlogging / Drainage",
    severity: 82,
    riskLevel: "High",
    priority: "High",
    confidence: 95,
    status: "In Progress",
    location: "Saket District Centre Underpass, Delhi",
    latitude: 28.5282,
    longitude: 77.2185,
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "scanner.fleet@urbanpulse.ai",
    reporterName: "AI Road Vision Fleet #108",
    assignedTo: "Rapid Obstruction Response Delta (RT-031)",
    source: "ROAD_SCANNER",
    roadScanId: "SCAN-SESSION-108D",
    clusterCount: 4,
    sourceCamera: "Vehicle Dashcam",
    workflowState: "IN PROGRESS",
    fieldStatus: "ON_SITE",
    assignment: {
      teamId: "RT-031",
      teamName: "Rapid Obstruction Response Delta",
      assignedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      priority: "High"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(), // 3.5 hr ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Road Obstruction",
      detectedIssue: true,
      severityScore: 82,
      riskLevel: "High",
      confidence: 95,
      description: "Stormwater ponding spanning entire carriageway width with zero gravity drainage outflow.",
      explanation: "Underpass sump basin pump tripped. Hydroplaning risk extreme for two-wheelers and passenger vehicles.",
      recommendedAction: "Dispatch high-capacity submersible dewatering pump unit",
      recommendedActions: [
        "Dispatch high-capacity submersible dewatering pump unit",
        "Clear silt traps at roadside catch-basins",
        "Issue dynamic VMS traffic diversion alert"
      ]
    }
  },
  {
    id: "DEMO-SCAN-004",
    userId: "system_ai_scanner",
    title: "Damaged Crash Barrier & Guardrail on Lajpat Flyover",
    description: "Distorted steel guardrail protruding 1.2 meters into fast-lane following commercial vehicle impact; lane swept and restored.",
    category: "Road Obstruction",
    issueType: "Damaged Infrastructure",
    severity: 64,
    riskLevel: "Medium",
    priority: "Medium",
    confidence: 89,
    status: "Resolved",
    location: "Lajpat Nagar Flyover Ramp Northbound",
    latitude: 28.5685,
    longitude: 77.2435,
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "scanner.fleet@urbanpulse.ai",
    reporterName: "AI Road Vision Fleet #302",
    assignedTo: "Rapid Obstruction Response Delta (RT-031)",
    source: "ROAD_SCANNER",
    roadScanId: "SCAN-SESSION-302B",
    clusterCount: 1,
    sourceCamera: "Vehicle Dashcam",
    workflowState: "RESOLVED",
    fieldStatus: "RESOLVED",
    assignment: {
      teamId: "RT-031",
      teamName: "Rapid Obstruction Response Delta",
      assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      priority: "Medium"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hr ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Road Obstruction",
      detectedIssue: true,
      severityScore: 64,
      riskLevel: "Medium",
      confidence: 89,
      description: "Mechanical deformation of steel beam crash barrier with exposed shearing edges.",
      explanation: "Structural crash attenuator compromised. Requires replacement of two 3.8m W-beam segments.",
      recommendedAction: "Replace deformed W-beam rail sections and anchor posts",
      recommendedActions: [
        "Replace deformed W-beam rail sections and anchor posts",
        "Verify post base anchor torque to 120 Nm",
        "Clean lane debris and restore reflector studs"
      ]
    }
  },

  // =========================================================================
  // 2. CITIZEN MANUAL REPORTS — 4 REPORTS
  // =========================================================================
  {
    id: "DEMO-CITIZEN-001",
    userId: "user_cit_ananya",
    title: "Municipal Waste Accumulation near Connaught Place",
    description: "Large open garbage dump overflowing onto the pedestrian pathway near Radial 3, causing foul odor and blocking walking access.",
    category: "Garbage Overflow",
    issueType: "Garbage Overflow",
    severity: 62,
    riskLevel: "Medium",
    priority: "Medium",
    confidence: 92,
    status: "Pending",
    location: "Connaught Place Inner Circle Radial 3, New Delhi",
    latitude: 28.6328,
    longitude: 77.2197,
    image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "ananya.sharma@urbanpulse.ai",
    reporterName: "Ananya Sharma",
    assignedTo: null,
    source: "MANUAL_REPORT",
    clusterCount: 1,
    sourceCamera: "Phone Camera",
    workflowState: "AI DETECTED",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(), // 40 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Garbage Overflow",
      detectedIssue: true,
      severityScore: 62,
      riskLevel: "Medium",
      confidence: 92,
      description: "Organic and plastic solid municipal waste pile impeding pedestrian walkway.",
      explanation: "Commercial district refuse bins overflowing into pedestrian sidewalk zone.",
      recommendedAction: "Deploy compact compactor truck and sanitize surface",
      recommendedActions: [
        "Deploy compact compactor truck",
        "Sanitize ground surface with lime wash",
        "Increase commercial waste collection frequency"
      ]
    }
  },
  {
    id: "DEMO-CITIZEN-002",
    userId: "user_cit_rohit",
    title: "Extinguished Streetlight Pole near Saket Metro Gate 2",
    description: "Dark luminaire pole creating an unsafe 60-meter blackout zone for evening metro commuters and pedestrians.",
    category: "Broken Streetlight",
    issueType: "Broken Streetlight",
    severity: 72,
    riskLevel: "Medium",
    priority: "High",
    confidence: 96,
    status: "In Progress",
    location: "Saket District Metro Gate 2 Pedestrian Plaza",
    latitude: 28.5204,
    longitude: 77.2014,
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "rohit.verma@urbanpulse.ai",
    reporterName: "Rohit Verma",
    assignedTo: "Power & Streetlight Squad Beta (RT-022)",
    source: "MANUAL_REPORT",
    clusterCount: 1,
    sourceCamera: "Phone Camera",
    workflowState: "IN PROGRESS",
    fieldStatus: "ACTION_STARTED",
    assignment: {
      teamId: "RT-022",
      teamName: "Power & Streetlight Squad Beta",
      assignedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      priority: "High"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hr ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Broken Streetlight",
      detectedIssue: true,
      severityScore: 72,
      riskLevel: "Medium",
      confidence: 96,
      description: "Non-functional high-pressure sodium luminaire causing dark zone on pedestrian sidewalk.",
      explanation: "Photocell unit damaged or circuit fuse tripped along Saket feeder line.",
      recommendedAction: "Replace photocell relay switch and install LED module",
      recommendedActions: [
        "Replace photocell relay switch",
        "Install energy-efficient 90W LED module",
        "Inspect underground junction box insulation"
      ]
    }
  },
  {
    id: "DEMO-CITIZEN-003",
    userId: "user_cit_priya",
    title: "Uncovered Deep Manhole on DLF Cyber City Axis",
    description: "Cast-iron manhole cover missing on busy service lane corner. Poses grave falling hazard to two-wheelers and pedestrians.",
    category: "Other",
    issueType: "Open Manhole",
    severity: 90,
    riskLevel: "High",
    priority: "Critical",
    confidence: 98,
    status: "Assigned",
    location: "DLF Cyber City Phase II, Cyber Hub Axis, Gurugram",
    latitude: 28.4952,
    longitude: 77.0891,
    image: "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "priya.nair@urbanpulse.ai",
    reporterName: "Priya Nair",
    assignedTo: "Civil Works & Surface Repair Epsilon (RT-045)",
    source: "MANUAL_REPORT",
    clusterCount: 2,
    sourceCamera: "Phone Camera",
    workflowState: "ASSIGNED",
    fieldStatus: "EN_ROUTE",
    assignment: {
      teamId: "RT-045",
      teamName: "Civil Works & Surface Repair Epsilon",
      assignedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      priority: "Critical"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // 55 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Other",
      detectedIssue: true,
      severityScore: 90,
      riskLevel: "High",
      confidence: 98,
      description: "Open underground utility chamber with exposed 2.4-meter drop.",
      explanation: "Manhole lid fractured or removed. High probability of severe pedestrian plunge or tire entrapment.",
      recommendedAction: "Install heavy-duty ductile iron replacement cover and reflective cage",
      recommendedActions: [
        "Install heavy-duty ductile iron replacement cover",
        "Erect 360-degree reflective barrier cage immediately",
        "Inspect sewer wall mortar integrity"
      ]
    }
  },
  {
    id: "DEMO-CITIZEN-004",
    userId: "user_cit_vikram",
    title: "Clogged Stormwater Drain Overflowing onto Road",
    description: "Catchbasin blocked with construction gravel causing foul runoff and street ponding near Sector 62 residential junction.",
    category: "Road Obstruction",
    issueType: "Blocked Drainage / Sewer",
    severity: 58,
    riskLevel: "Medium",
    priority: "Medium",
    confidence: 88,
    status: "Resolved",
    location: "Noida Expressway Sector 62 Institutional Junction",
    latitude: 28.6279,
    longitude: 77.3686,
    image: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "vikram.malhotra@urbanpulse.ai",
    reporterName: "Vikram Malhotra",
    assignedTo: "Civil Works & Surface Repair Epsilon (RT-045)",
    source: "MANUAL_REPORT",
    clusterCount: 1,
    sourceCamera: "Phone Camera",
    workflowState: "RESOLVED",
    fieldStatus: "RESOLVED",
    assignment: {
      teamId: "RT-045",
      teamName: "Civil Works & Surface Repair Epsilon",
      assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      priority: "Medium"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hr ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isSos: false,
    aiAnalysis: {
      category: "Road Obstruction",
      detectedIssue: true,
      severityScore: 58,
      riskLevel: "Medium",
      confidence: 88,
      description: "Debris blockage in roadside silt trap impeding stormwater runoff.",
      explanation: "Runoff sedimentation choked intake grate. Water table backlogging into nearby gutter line.",
      recommendedAction: "Jet-vac suction cleanout of conduit line and grate reset",
      recommendedActions: [
        "Jet-vac suction cleanout of conduit line",
        "Reinstall sediment capture grate",
        "Inspect downstream culvert flow velocity"
      ]
    }
  },

  // =========================================================================
  // 3. EMERGENCY SOS — 2 REPORTS
  // =========================================================================
  {
    id: "DEMO-SOS-001",
    userId: "user_cit_aakash",
    title: "CRITICAL SOS: Multi-Vehicle Collision & Road Blockage",
    description: "Two-car collision blocking both lanes on MG Road near Sikanderpur Metro. Immediate traffic diversion and recovery required.",
    category: "Road Obstruction",
    issueType: "Road Accident / Emergency",
    severity: 96,
    riskLevel: "High",
    priority: "Critical",
    confidence: 99,
    status: "In Progress",
    location: "MG Road near Sikanderpur Metro Station, Gurugram",
    latitude: 28.4817,
    longitude: 77.0932,
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "aakash.mehra@urbanpulse.ai",
    reporterName: "Aakash Mehra",
    assignedTo: "Rapid Obstruction Response Delta (RT-031)",
    source: "MANUAL_REPORT",
    clusterCount: 1,
    sourceCamera: "Phone Camera",
    workflowState: "IN PROGRESS",
    fieldStatus: "ON_SITE",
    isSos: true,
    emergencyType: "ROAD_ACCIDENT",
    assignment: {
      teamId: "RT-031",
      teamName: "Rapid Obstruction Response Delta",
      assignedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      priority: "Critical"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    aiAnalysis: {
      category: "Road Obstruction",
      detectedIssue: true,
      severityScore: 96,
      riskLevel: "High",
      confidence: 99,
      description: "High-priority traffic obstruction and crash telemetry verified.",
      explanation: "Vehicle impact debris and disabled sedan blocking main carriage lanes. Urgent recovery needed.",
      recommendedAction: "Dispatch emergency recovery tow crane and set diversion perimeter",
      recommendedActions: [
        "Dispatch emergency recovery tow crane",
        "Notify Delhi-Gurugram Traffic Command for upstream diversion",
        "Ensure emergency vehicle lane remains clear"
      ]
    }
  },
  {
    id: "DEMO-SOS-002",
    userId: "user_cit_sunita",
    title: "URGENT SOS: Medical Emergency on Janpath Public Promenade",
    description: "Citizen collapsed near Janpath Avenue. First-responder ambulance requested with cardiac defibrillator support.",
    category: "Other",
    issueType: "Medical / Emergency Assistance",
    severity: 94,
    riskLevel: "High",
    priority: "Critical",
    confidence: 98,
    status: "Assigned",
    location: "Janpath Avenue near Wind Tunnel Road, New Delhi",
    latitude: 28.6219,
    longitude: 77.2188,
    image: "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80",
    evidenceUrl: "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80",
    reporterEmail: "sunita.rao@urbanpulse.ai",
    reporterName: "Sunita Rao",
    assignedTo: "Civil Works & Surface Repair Epsilon (RT-045)",
    source: "MANUAL_REPORT",
    clusterCount: 1,
    sourceCamera: "Phone Camera",
    workflowState: "ASSIGNED",
    fieldStatus: "EN_ROUTE",
    isSos: true,
    emergencyType: "MEDICAL_ASSISTANCE",
    assignment: {
      teamId: "RT-045",
      teamName: "Civil Works & Surface Repair Epsilon",
      assignedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      priority: "Critical"
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    aiAnalysis: {
      category: "Other",
      detectedIssue: true,
      severityScore: 94,
      riskLevel: "High",
      confidence: 98,
      description: "Priority civilian medical beacon transmitted via mobile SOS terminal.",
      explanation: "High-priority medical intervention beacon active on central pedestrian corridor.",
      recommendedAction: "Dispatch nearest Advanced Life Support (ALS) ambulance unit",
      recommendedActions: [
        "Dispatch nearest Advanced Life Support (ALS) ambulance",
        "Alert Connaught Place traffic patrol corridor for green corridor clearance",
        "Maintain open communication line with caller"
      ]
    }
  }
] as Report[]).map(r => ({
  ...r,
  image: getReportDisplayImage(r),
  evidenceUrl: getReportDisplayImage(r)
}));

// =========================================================================
// DERIVED NOTIFICATIONS GENERATOR (CENTRALIZED)
// =========================================================================

export function getDemoNotifications(email?: string, role?: string): Notification[] {
  const currentRole = (role || "citizen").toLowerCase();
  const currentEmail = (email || "").toLowerCase();

  const notifications: Notification[] = [];

  // MUNICIPAL / ADMIN NOTIFICATIONS
  if (currentRole === "admin" || currentRole === "municipal") {
    notifications.push(
      {
        id: "DEMO-NOTIF-MUNI-01",
        recipientEmail: currentEmail || "officer@urbanpulse.gov",
        recipientRole: "municipal",
        title: "CRITICAL SOS ACTIVATION: Sikanderpur",
        message: "Emergency SOS beacon logged on MG Road (DEMO-SOS-001). Traffic Police & Recovery Squad dispatched.",
        type: "alert_high_severity",
        reportId: "DEMO-SOS-001",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
      },
      {
        id: "DEMO-NOTIF-MUNI-02",
        recipientEmail: currentEmail || "officer@urbanpulse.gov",
        recipientRole: "municipal",
        title: "URGENT SOS: Medical Emergency Janpath",
        message: "Emergency medical beacon triggered near Janpath Avenue (DEMO-SOS-002). CAT-09 squad en route.",
        type: "alert_high_severity",
        reportId: "DEMO-SOS-002",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString()
      },
      {
        id: "DEMO-NOTIF-MUNI-03",
        recipientEmail: currentEmail || "officer@urbanpulse.gov",
        recipientRole: "municipal",
        title: "AI Vision Incident: Sector 45 Pothole",
        message: "AI Road Vision Fleet #108 detected 88% severity road crater on Sector 45 Arterial (DEMO-SCAN-001).",
        type: "alert_high_severity",
        reportId: "DEMO-SCAN-001",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString()
      },
      {
        id: "DEMO-NOTIF-MUNI-04",
        recipientEmail: currentEmail || "officer@urbanpulse.gov",
        recipientRole: "municipal",
        title: "Citizen Report Logged: Open Manhole",
        message: "Priya Nair submitted high-risk Open Manhole alert in DLF Cyber City (DEMO-CITIZEN-003).",
        type: "report_submitted",
        reportId: "DEMO-CITIZEN-003",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
      },
      {
        id: "DEMO-NOTIF-MUNI-05",
        recipientEmail: currentEmail || "officer@urbanpulse.gov",
        recipientRole: "municipal",
        title: "Work Order Completed: Lajpat Barrier",
        message: "Highway Infrastructure Squad HS-08 marked Lajpat Nagar Flyover barrier repair RESOLVED (DEMO-SCAN-004).",
        type: "resolution_approved",
        reportId: "DEMO-SCAN-004",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
      }
    );
  } else if (currentRole === "field_team") {
    notifications.push(
      {
        id: "DEMO-NOTIF-FIELD-01",
        recipientEmail: currentEmail,
        recipientRole: "field_team",
        title: "Work Order Assigned: Transverse Fissure",
        message: "You have been assigned to repair road surface fissure on Outer Ring Road (DEMO-SCAN-002).",
        type: "task_assigned",
        reportId: "DEMO-SCAN-002",
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString()
      },
      {
        id: "DEMO-NOTIF-FIELD-02",
        recipientEmail: currentEmail,
        recipientRole: "field_team",
        title: "Work Order Dispatched: Saket Underpass",
        message: "Drainage response active on Saket underpass waterlogging (DEMO-SCAN-003).",
        type: "task_assigned",
        reportId: "DEMO-SCAN-003",
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString()
      }
    );
  } else {
    // CITIZEN ROLE — ONLY SHOW CITIZEN'S OWN NOTIFICATIONS
    if (currentEmail === "ananya.sharma@urbanpulse.ai") {
      notifications.push(
        {
          id: "DEMO-NOTIF-CIT-01",
          recipientEmail: currentEmail,
          recipientRole: "citizen",
          title: "Report Registered: Municipal Waste",
          message: "Your report 'Municipal Waste Accumulation' (DEMO-CITIZEN-001) has been logged. Municipal sanitation notified.",
          type: "report_submitted",
          reportId: "DEMO-CITIZEN-001",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
        }
      );
    } else if (currentEmail === "rohit.verma@urbanpulse.ai") {
      notifications.push(
        {
          id: "DEMO-NOTIF-CIT-02",
          recipientEmail: currentEmail,
          recipientRole: "citizen",
          title: "Work Crew Assigned: Broken Streetlight",
          message: "Your report 'Extinguished Streetlight Pole' (DEMO-CITIZEN-002) was assigned to Power Squad RT-022.",
          type: "report_status",
          reportId: "DEMO-CITIZEN-002",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString()
        }
      );
    } else if (currentEmail === "aakash.mehra@urbanpulse.ai") {
      notifications.push(
        {
          id: "DEMO-NOTIF-CIT-03",
          recipientEmail: currentEmail,
          recipientRole: "citizen",
          title: "SOS Beacon Acknowledged",
          message: "Emergency response units dispatched to your location on MG Road (DEMO-SOS-001). Help is on the way.",
          type: "alert_high_severity",
          reportId: "DEMO-SOS-001",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
        }
      );
    }
  }

  return notifications;
}

// =========================================================================
// CENTRALIZED DEMO STATE CONTROLLER (OBSERVER PATTERN)
// =========================================================================

let _isDemoMode = false;
const _listeners = new Set<(isDemo: boolean) => void>();

export function isDemoModeActive(): boolean {
  return _isDemoMode;
}

export function setDemoModeActive(active: boolean): void {
  if (_isDemoMode !== active) {
    _isDemoMode = active;
    _listeners.forEach((listener) => {
      try {
        listener(_isDemoMode);
      } catch (err) {
        console.warn("[DemoState] Listener error:", err);
      }
    });
  }
}

export function subscribeToDemoState(listener: (isDemo: boolean) => void): () => void {
  _listeners.add(listener);
  // Immediate trigger with current state
  listener(_isDemoMode);
  return () => {
    _listeners.delete(listener);
  };
}
