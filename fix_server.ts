import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const oldScanner = content.substring(content.indexOf('// B. ROAD SCANNER FRAME ANALYSIS'), content.indexOf('// C. CITIZEN COPILOT CHAT'));
const newScanner = `// B. ROAD SCANNER FRAME ANALYSIS
app.post("/api/scanner/analyze-frame", async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    
    if (ai && image && typeof image === "string" && image.startsWith("data:image")) {
      try {
        const mimePattern = /^data:(image\\/[a-zA-Z+]+);base64,/;
        const match = image.match(mimePattern);
        const mimeType = match ? match[1] : "image/jpeg";
        const base64Data = image.replace(mimePattern, "");
        
        const prompt = \`You are the UrbanPulse Road Scanner Vision AI.
Inspect this dashcam road surface frame. Determine if there is any visible road infrastructure hazard (Pothole, Road Crack / Fissure, Manhole Issue, Road Obstruction, Waterlogging, Garbage Overflow, Damaged Road).

Identify ONLY visible roadway/infrastructure hazards. For each detected hazard:
1. Identify category.
2. Estimate confidence (0-100).
3. Estimate severity (0-100).
4. Describe the visible issue.
5. Locate the visible defect with a tight bounding box.

IMPORTANT FOR BOUNDING BOX (localization):
- The bounding box must surround the ACTUAL visible defect (e.g., the pothole itself, NOT the entire road or fixed coordinates).
- Do NOT invent a hazard if none is visible.
- Use normalized coordinates between 0.0 and 1.0: { "x": float, "y": float, "width": float, "height": float }
- If no supported hazard is visible, return "detected": false.
- If image quality is too blurry, dark, or unrecognizable, return "detected": false.

Respond strictly in this JSON format:
{
  "detected": true/false,
  "detections": [
    {
      "category": "Pothole",
      "severityScore": 82,
      "confidence": 94,
      "description": "Large pothole visible on the roadway",
      "localization": { "x": 0.42, "y": 0.55, "width": 0.18, "height": 0.14 }
    }
  ]
}\`;
        
        const response = await generateContentWithFallback(ai, {
          contents: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ],
          config: { responseMimeType: "application/json" }
        });
        
        const cleaned = (response.text || "{}").replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        const parsed = JSON.parse(cleaned);
        
        let detectionsArray: any[] = [];
        if (parsed.detected !== false) {
           if (Array.isArray(parsed.detections)) {
               detectionsArray = parsed.detections;
           } else if (parsed.category) { 
               detectionsArray = [parsed];
           }
        }
        
        detectionsArray = detectionsArray.map(det => {
            let loc = det.localization || det.boundingBox;
            if (loc) {
                if (loc.x < 0 || loc.y < 0 || loc.width <= 0 || loc.height <= 0 || loc.x + loc.width > 1.05 || loc.y + loc.height > 1.05) {
                    loc = null;
                } else {
                    loc.x = Math.max(0, Math.min(1, loc.x));
                    loc.y = Math.max(0, Math.min(1, loc.y));
                    loc.width = Math.max(0, Math.min(1 - loc.x, loc.width));
                    loc.height = Math.max(0, Math.min(1 - loc.y, loc.height));
                }
            }
            return {
                category: det.category || "Pothole",
                severityScore: Number(det.severityScore || det.severity || 50),
                confidence: Number(det.confidence || 80),
                description: det.description || "",
                boundingBox: loc || null
            };
        });

        const isDetected = detectionsArray.length > 0;

        return res.json({
          detected: isDetected,
          detection: isDetected ? detectionsArray[0] : null,
          detections: detectionsArray
        });
        
      } catch (geminiErr) {
        console.warn("[Road Scanner AI] Frame analysis failed:", geminiErr);
        return res.status(500).json({ error: "AI unavailable.", detected: false });
      }
    }
    return res.status(500).json({ error: "AI unavailable.", detected: false });
  } catch (err: any) {
    console.error("Frame analysis error:", err);
    res.status(500).json({ error: "Failed to analyze road frame." });
  }
});

`;

content = content.replace(oldScanner, newScanner);
fs.writeFileSync('server.ts', content);
