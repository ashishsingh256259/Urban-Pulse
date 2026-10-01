import jsPDF from "jspdf";
import { Report, isEmergencySosReport } from "../types";

/**
 * Cleanly escapes CSV values with quote wrapping for multi-line and comma-containing text.
 */
function escapeCsvValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and downloads a structured CSV file for an individual report.
 */
export function downloadReportCSV(report: Report): void {
  const isSos = isEmergencySosReport(report);
  const sourceName = isSos 
    ? "Emergency SOS Beacon" 
    : report.source === "ROAD_SCANNER" 
    ? "AI Road Telemetry Scanner" 
    : "Citizen Mobile App";

  const headers = [
    "Incident Ticket ID",
    "Title",
    "Category",
    "Status",
    "Severity Score (0-100)",
    "Priority Level",
    "Risk Level",
    "Location Address",
    "Latitude",
    "Longitude",
    "Reporter Name",
    "Reporter Email",
    "Report Source",
    "Assigned Field Team",
    "Created Date & Time",
    "Last Updated",
    "Incident Description",
    "AI Confidence (%)",
    "Cluster Count",
    "AI Analysis Summary",
    "Field Task Status",
    "Field Resolution Notes",
    "Image Asset URL"
  ];

  const rowData = [
    report.id,
    report.title || "Urban Incident",
    report.category || "General Issue",
    report.status || "Pending",
    report.severity ?? "N/A",
    report.priority || "Medium",
    report.riskLevel || "Medium",
    report.location || "City Jurisdiction",
    report.latitude ?? "N/A",
    report.longitude ?? "N/A",
    report.reporterName || "Anonymous Citizen",
    report.reporterEmail || "Not specified",
    sourceName,
    report.assignedTo || report.assignment?.teamName || "Unassigned",
    report.createdAt ? new Date(report.createdAt).toLocaleString() : "Not available",
    report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "Not available",
    report.description || "No description provided",
    report.confidence ? `${report.confidence}%` : "N/A",
    report.clusterCount || 1,
    report.aiAnalysis?.description || "No AI analysis log",
    report.fieldStatus || report.status,
    report.resolution?.notes || report.fieldVerification?.notes || "No resolution notes",
    report.image || report.imageUrl || report.evidenceUrl || "None"
  ];

  const csvRows = [
    headers.map(escapeCsvValue).join(","),
    rowData.map(escapeCsvValue).join(",")
  ];

  const csvContent = csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `UrbanPulse_Incident_Report_${report.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Safely converts an image URL into a base64 Data URL for embedding into jsPDF.
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:image")) return imageUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 600;
        canvas.height = img.naturalHeight || img.height || 400;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl);
      } catch (err) {
        console.warn("CORS or canvas security prevented reading image bytes for PDF:", err);
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };
  });
}

/**
 * Generates and downloads a compact, professional one-page Emergency SOS incident report.
 */
export async function generateEmergencySOSReport(report: Report): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 0;

  // 1. TOP HEADER BANNER (Emergency Red)
  const headerHeight = 26;
  doc.setFillColor(185, 28, 28); // Deep Emergency Red #B91C1C
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("URBANPULSE GUARDIAN AI", margin, 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(254, 202, 202);
  doc.text("EMERGENCY SOS INCIDENT REPORT", margin, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("CRITICAL BEACON", pageWidth - margin, 11, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(254, 226, 226);
  const genTime = new Date().toLocaleString();
  doc.text(`Generated: ${genTime}`, pageWidth - margin, 17, { align: "right" });
  doc.text(`SOS Ticket: #${report.id}`, pageWidth - margin, 21.5, { align: "right" });

  cursorY = headerHeight + 8;

  // 2. SOS / EMERGENCY STATUS CARD
  doc.setFillColor(254, 242, 242); // light red background
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, cursorY, contentWidth, 20, 2, 2, "FD");

  doc.setFillColor(185, 28, 28);
  doc.roundedRect(margin + 4, cursorY + 3.5, 36, 13, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("CRITICAL / URGENT", margin + 22, cursorY + 11.5, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("INCIDENT TYPE", margin + 46, cursorY + 7);
  doc.text("DATE & TIME", margin + 120, cursorY + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(report.category || report.issueType || "Emergency SOS Beacon", margin + 46, cursorY + 14);
  
  const dateTimeStr = report.createdAt ? new Date(report.createdAt).toLocaleString() : "";
  if (dateTimeStr) {
    doc.text(dateTimeStr, margin + 120, cursorY + 14);
  }

  cursorY += 26;

  // 3. LOCATION SECTION
  const hasLocation = report.location || (report.latitude !== undefined && report.longitude !== undefined && report.latitude !== null && report.longitude !== null);
  if (hasLocation) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text("LOCATION", margin, cursorY);
    cursorY += 4;

    doc.setLineWidth(0.2);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    if (report.location) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Location / Address:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const splitLoc = doc.splitTextToSize(report.location, contentWidth - 35);
      doc.text(splitLoc, margin + 35, cursorY);
      cursorY += Math.max(5, splitLoc.length * 4.5);
    }

    if (report.latitude !== undefined && report.longitude !== undefined && report.latitude !== null && report.longitude !== null) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Live GPS Coordinates:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(`${report.latitude.toFixed(6)}° N, ${report.longitude.toFixed(6)}° E`, margin + 35, cursorY);
      cursorY += 5;
    }

    cursorY += 3;
  }

  // 4. REPORTER SECTION (only if available)
  const hasReporter = report.reporterName || report.reporterEmail;
  if (hasReporter) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text("REPORTER", margin, cursorY);
    cursorY += 4;

    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    if (report.reporterName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Reporter Name:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(report.reporterName, margin + 35, cursorY);
      cursorY += 5;
    }

    if (report.reporterEmail) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Contact Information:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(report.reporterEmail, margin + 35, cursorY);
      cursorY += 5;
    }

    cursorY += 3;
  }

  // 5. EMERGENCY DETAILS
  const hasDetails = report.title || report.description;
  if (hasDetails) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text("EMERGENCY DETAILS", margin, cursorY);
    cursorY += 4;

    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    if (report.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Emergency Title:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(report.title, margin + 35, cursorY);
      cursorY += 5;
    }

    if (report.description) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Citizen Details:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const splitDesc = doc.splitTextToSize(report.description, contentWidth - 35);
      doc.text(splitDesc, margin + 35, cursorY);
      cursorY += Math.max(5, splitDesc.length * 4.5);
    }

    cursorY += 3;
  }

  // 6. RESPONSE SECTION
  const assignedUnit = report.assignedTo || report.assignment?.teamName;
  const hasResponse = report.status || assignedUnit || report.fieldStatus;
  if (hasResponse) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text("RESPONSE", margin, cursorY);
    cursorY += 4;

    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    if (report.status) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Current Status:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(report.status, margin + 35, cursorY);
      cursorY += 5;
    }

    if (assignedUnit) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Assigned Response Unit:", margin, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(assignedUnit, margin + 35, cursorY);
      cursorY += 5;
    }

    const dispatchStatus = report.fieldStatus || (assignedUnit ? "Dispatched & Active" : "Pending Dispatch");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Dispatch Status:", margin, cursorY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(dispatchStatus, margin + 35, cursorY);
    cursorY += 6;
  }

  // 7. EVIDENCE SECTION (ONLY IF AVAILABLE)
  const imageSource = report.image || report.imageUrl || report.evidenceUrl;
  if (imageSource && cursorY < pageHeight - 55) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text("EVIDENCE", margin, cursorY);
    cursorY += 4;

    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    const base64Data = await getBase64ImageFromUrl(imageSource);
    if (base64Data) {
      try {
        const imgWidth = 50;
        const imgHeight = 32;
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(margin, cursorY, imgWidth + 2, imgHeight + 2, 1, 1, "F");
        doc.addImage(base64Data, "JPEG", margin + 1, cursorY + 1, imgWidth, imgHeight);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("SOS Image Attachment", margin + imgWidth + 6, cursorY + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Verified Emergency Photo", margin + imgWidth + 6, cursorY + 13);

        cursorY += imgHeight + 6;
      } catch (err) {
        // fallback if image fails
      }
    }
  }

  // 8. IMMEDIATE RESPONSE REQUIRED BANNER (Visually Prominent)
  if (cursorY < pageHeight - 22) {
    cursorY = Math.max(cursorY, pageHeight - 36);
  }
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(margin, cursorY, contentWidth, 12, 2, 2, "FD");

  doc.setTextColor(185, 28, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("IMMEDIATE RESPONSE REQUIRED - DISPATCH NEAREST EMERGENCY CREW", pageWidth / 2, cursorY + 7.5, { align: "center" });

  // FOOTER
  const footerY = pageHeight - 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("URBANPULSE GUARDIAN AI • EMERGENCY SOS COMMAND NETWORK", margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.text("CONFIDENTIAL EMERGENCY DOSSIER", pageWidth - margin, footerY, { align: "right" });

  doc.save(`UrbanPulse_Emergency_SOS_${report.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
}

/**
 * Generates and downloads a clean, professional PDF incident report.
 */
export async function downloadReportPDF(report: Report): Promise<void> {
  const isSos = isEmergencySosReport(report);
  if (isSos) {
    return generateEmergencySOSReport(report);
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 0;

  // -------------------------------------------------------------
  // 1. TOP HEADER BANNER (UrbanPulse Guardian AI Branding)
  // -------------------------------------------------------------
  const headerHeight = 30;
  if (isSos) {
    doc.setFillColor(185, 28, 28); // Deep Emergency Red #B91C1C
  } else {
    doc.setFillColor(15, 23, 42); // Dark Slate Navy #0F172A
  }
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("URBANPULSE GUARDIAN AI", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text("MUNICIPAL INCIDENT DOSSIER & AUDIT TRAIL", margin, 18);

  // Top Right Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("CONFIDENTIAL REPORT", pageWidth - margin, 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const formattedDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 16, { align: "right" });
  doc.text(`Ticket ID: #${report.id}`, pageWidth - margin, 21, { align: "right" });

  cursorY = headerHeight + 10;

  // -------------------------------------------------------------
  // 2. INCIDENT STATUS OVERVIEW BAR
  // -------------------------------------------------------------
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 24, 3, 3, "FD");

  // Status Chip Box
  let statusBg = [239, 246, 255];
  let statusText = [29, 78, 216];
  if (report.status === "Resolved") {
    statusBg = [236, 253, 245];
    statusText = [4, 120, 87];
  } else if (report.status === "In Progress") {
    statusBg = [254, 243, 199];
    statusText = [180, 83, 9];
  } else if (isSos || report.status === "Pending") {
    statusBg = [254, 226, 226];
    statusText = [185, 28, 28];
  }

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(margin + 4, cursorY + 4, 45, 16, 2, 2, "F");
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text((report.status || "PENDING").toUpperCase(), margin + 26.5, cursorY + 14, { align: "center" });

  // Key Metrics Grid
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SEVERITY SCORE", margin + 58, cursorY + 9);
  doc.text("PRIORITY LEVEL", margin + 98, cursorY + 9);
  doc.text("REPORT CHANNEL", margin + 138, cursorY + 9);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${report.severity ?? 50} / 100`, margin + 58, cursorY + 17);
  doc.text(`${report.priority || report.riskLevel || 'Medium'}`, margin + 98, cursorY + 17);
  
  const channelText = isSos 
    ? "Emergency SOS" 
    : report.source === "ROAD_SCANNER" 
    ? "AI Telemetry" 
    : "Citizen App";
  doc.text(channelText, margin + 138, cursorY + 17);

  cursorY += 30;

  // -------------------------------------------------------------
  // 3. CORE INCIDENT DETAILS TABLE
  // -------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Incident Identification & Location", margin, cursorY);
  cursorY += 5;

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  const metadataPairs: Array<[string, string, string, string]> = [
    [
      "Incident Title:", report.title || "Urban Issue Report",
      "Issue Category:", report.category || "General"
    ],
    [
      "Location Address:", report.location || "City Limits",
      "GPS Coordinates:", `${report.latitude ? report.latitude.toFixed(6) : "N/A"}, ${report.longitude ? report.longitude.toFixed(6) : "N/A"}`
    ],
    [
      "Citizen/Reporter:", report.reporterName || "Anonymous Citizen",
      "Contact Email:", report.reporterEmail || "Not specified"
    ],
    [
      "Submission Date:", report.createdAt ? new Date(report.createdAt).toLocaleString() : "Not available",
      "Last Activity:", report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "Not available"
    ]
  ];

  metadataPairs.forEach(([label1, val1, label2, val2]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label1, margin, cursorY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(val1, 75), margin + 28, cursorY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(label2, margin + 100, cursorY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(val2, 70), margin + 128, cursorY);

    cursorY += 7;
  });

  cursorY += 4;

  // -------------------------------------------------------------
  // 4. DESCRIPTION & NARRATIVE
  // -------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Incident Description & Citizen Narrative", margin, cursorY);
  cursorY += 5;

  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  const descText = report.description || "No specific detailed narrative was submitted for this incident.";
  const wrappedDesc = doc.splitTextToSize(descText, contentWidth - 8);
  const descBoxHeight = Math.max(16, wrappedDesc.length * 4.5 + 8);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, descBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(wrappedDesc, margin + 4, cursorY + 6);

  cursorY += descBoxHeight + 8;

  // -------------------------------------------------------------
  // 5. AI TELEMETRY & FIELD OPERATIONS
  // -------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. AI Intelligence & Field Response Status", margin, cursorY);
  cursorY += 5;

  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  const opsPairs: Array<[string, string]> = [
    ["Assigned Dispatch Unit:", report.assignedTo || report.assignment?.teamName || "Unassigned / Municipal Queue"],
    ["Field Task Status:", report.fieldStatus || report.status || "Pending"],
    ["AI Detection Confidence:", report.confidence ? `${report.confidence}%` : "Not evaluated"],
    ["AI Vision Assessment:", report.aiAnalysis?.description || (report.clusterCount ? `AI Road Scanner aggregated ${report.clusterCount} detection frame(s).` : "Standard citizen mobile upload.")]
  ];

  opsPairs.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin, cursorY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const splitVal = doc.splitTextToSize(value, contentWidth - 45);
    doc.text(splitVal, margin + 45, cursorY);

    cursorY += Math.max(6, splitVal.length * 4.5);
  });

  if (report.resolution?.notes || report.fieldVerification?.notes) {
    cursorY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Field Unit Action Notes:", margin, cursorY);

    const notesText = report.resolution?.notes || report.fieldVerification?.notes || "";
    const wrappedNotes = doc.splitTextToSize(notesText, contentWidth - 45);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(30, 41, 59);
    doc.text(wrappedNotes, margin + 45, cursorY);
    cursorY += Math.max(6, wrappedNotes.length * 4.5);
  }

  cursorY += 6;

  // -------------------------------------------------------------
  // 6. PHOTOGRAPHIC EVIDENCE ATTACHMENT
  // -------------------------------------------------------------
  const imageSource = report.image || report.imageUrl || report.evidenceUrl;
  if (imageSource) {
    // Check space on current page
    if (cursorY + 60 > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. Photographic Evidence & Visual Asset", margin, cursorY);
    cursorY += 5;

    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 6;

    const base64Data = await getBase64ImageFromUrl(imageSource);
    if (base64Data) {
      try {
        const imgWidth = 80;
        const imgHeight = 45;
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(margin, cursorY, imgWidth + 2, imgHeight + 2, 1, 1, "F");
        doc.addImage(base64Data, "JPEG", margin + 1, cursorY + 1, imgWidth, imgHeight);

        // Side info box for photo metadata
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("ASSET TELEMETRY", margin + imgWidth + 8, cursorY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`Camera Source: ${report.sourceCamera || 'Mobile Camera'}`, margin + imgWidth + 8, cursorY + 12);
        doc.text(`Bounding Box Lock: ${report.boundingBox ? 'Active' : 'N/A'}`, margin + imgWidth + 8, cursorY + 17);
        if (report.estimatedWidth || report.estimatedLength) {
          doc.text(`Dimensions: W: ${report.estimatedWidth || 'N/A'}, L: ${report.estimatedLength || 'N/A'}`, margin + imgWidth + 8, cursorY + 22);
        }

        cursorY += imgHeight + 8;
      } catch (err) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Attached Asset URL: ${imageSource}`, margin, cursorY + 4);
        cursorY += 12;
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Attached Evidence URL: ${imageSource}`, margin, cursorY + 4);
      cursorY += 12;
    }
  }

  // -------------------------------------------------------------
  // 7. FOOTER
  // -------------------------------------------------------------
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("URBANPULSE GUARDIAN AI • MUNICIPAL COMMAND SERVICES", margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.text("CONFIDENTIAL & PROPRIETARY", pageWidth - margin, footerY, { align: "right" });

  doc.save(`UrbanPulse_Incident_Report_${report.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
}
