import { GPSCoordinate } from "../types";

export interface ExtractedFrame {
  id: string;
  index: number;
  timestamp: number;
  videoTimestampSeconds?: number;
  dataUrl: string;
  blob?: Blob;
  width: number;
  height: number;
  gps?: GPSCoordinate;
}

/**
 * Finds the nearest GPS coordinate from a recorded track based on timestamp difference.
 */
export function synchronizeFrameWithGps(
  frameTimestamp: number,
  gpsTrack: GPSCoordinate[]
): GPSCoordinate | undefined {
  if (!gpsTrack || gpsTrack.length === 0) return undefined;

  let closest: GPSCoordinate | undefined = undefined;
  let minDiff = Infinity;

  for (let i = 0; i < gpsTrack.length; i++) {
    const pt = gpsTrack[i];
    const diff = Math.abs(frameTimestamp - (pt.timestamp || 0));
    if (diff < minDiff) {
      minDiff = diff;
      closest = pt;
    }
  }

  // Always return the closest GPS point available in the track
  return closest || gpsTrack[gpsTrack.length - 1];
}

/**
 * Dynamically detects a supported MediaRecorder MIME type across browsers (Chrome, Safari, Firefox, Edge, iOS).
 */
export function getSupportedMediaRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";

  const candidateMimeTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264",
    "video/webm",
    "video/mp4;codecs=avc1",
    "video/mp4"
  ];

  for (const mime of candidateMimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return "";
}

/**
 * Captures a single image frame from an active HTMLVideoElement using a background HTML5 Canvas.
 */
export function captureFrameFromVideoElement(
  video: HTMLVideoElement,
  targetWidth: number = 640,
  targetHeight: number = 480,
  quality: number = 0.85
): { dataUrl: string; blobPromise: Promise<Blob | null> } | null {
  if (!video || video.readyState < 2) return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);

    const blobPromise = new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    });

    return { dataUrl, blobPromise };
  } catch (err) {
    console.error("Frame capture error:", err);
    return null;
  }
}

/**
 * Extracts frames at regular time intervals from an uploaded or recorded video File/Blob.
 */
export async function extractFramesFromVideoBlob(
  videoBlob: Blob,
  fps: number = 1,
  maxFrames: number = 20,
  gpsTrack: GPSCoordinate[] = [],
  recordingStartTime: number = Date.now(),
  knownDurationSeconds?: number,
  onFrameExtracted?: (frame: ExtractedFrame, totalExtracted: number) => void
): Promise<ExtractedFrame[]> {
  return new Promise((resolve) => {
    if (!videoBlob || videoBlob.size === 0) {
      console.warn("[Frame Extractor] Empty video blob provided.");
      resolve([]);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const videoUrl = URL.createObjectURL(videoBlob);
    const frames: ExtractedFrame[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        try {
          URL.revokeObjectURL(videoUrl);
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch (_) {}
      }
    };

    // Safety timeout in case video loading or seeking gets stuck completely
    const overallTimeout = setTimeout(() => {
      console.warn(`[Frame Extractor] Overall extraction timeout reached. Returning ${frames.length} frames.`);
      cleanup();
      resolve(frames);
    }, 15000); // 15 seconds max overall process timeout

    const processVideo = async () => {
      try {
        const vWidth = video.videoWidth || 640;
        const vHeight = video.videoHeight || 480;
        canvas.width = vWidth;
        canvas.height = vHeight;

        // Calculate valid duration
        let duration = video.duration;
        if (!duration || isNaN(duration) || !isFinite(duration) || duration <= 0) {
          duration = knownDurationSeconds && knownDurationSeconds > 0 ? knownDurationSeconds : 10;
        }

        console.log(`[Frame Extractor] Video ready | BlobSize: ${videoBlob.size} | Dim: ${vWidth}x${vHeight} | Duration: ${duration.toFixed(2)}s`);

        // Generate timestamps starting at 0.5s up to duration
        const step = 1 / Math.max(0.2, fps);
        const timestamps: number[] = [];
        for (let t = 0.5; t < duration && timestamps.length < maxFrames; t += step) {
          timestamps.push(Number(t.toFixed(2)));
        }

        if (timestamps.length === 0) {
          timestamps.push(0.1);
        }

        console.log(`[Frame Extractor] Planned seek timestamps (${timestamps.length}):`, timestamps);

        let frameIndex = 0;

        for (const seekTime of timestamps) {
          if (isResolved) break;

          const seekSuccess = await new Promise<boolean>((seekResolve) => {
            let seekTimer: any = null;

            const onSeeked = () => {
              if (seekTimer) clearTimeout(seekTimer);
              video.removeEventListener("seeked", onSeeked);
              video.removeEventListener("error", onSeekError);
              seekResolve(true);
            };

            const onSeekError = () => {
              if (seekTimer) clearTimeout(seekTimer);
              video.removeEventListener("seeked", onSeeked);
              video.removeEventListener("error", onSeekError);
              seekResolve(false);
            };

            video.addEventListener("seeked", onSeeked);
            video.addEventListener("error", onSeekError);

            seekTimer = setTimeout(() => {
              console.warn(`[Frame Extractor] Seek timeout at ${seekTime}s`);
              video.removeEventListener("seeked", onSeeked);
              video.removeEventListener("error", onSeekError);
              seekResolve(false);
            }, 2000);

            // Set currentTime to trigger async seeked event
            video.currentTime = seekTime;
          });

          if (seekSuccess && ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

            const frameTimestamp = recordingStartTime + Math.round(seekTime * 1000);
            const matchingGps = synchronizeFrameWithGps(frameTimestamp, gpsTrack);

            const blob = await new Promise<Blob>((res) => {
              canvas.toBlob((b) => res(b || new Blob()), "image/jpeg", 0.85);
            });

            if (dataUrl && dataUrl.length > 100) {
              const newFrame: ExtractedFrame = {
                id: `FRAME-${frameIndex + 1}-${Date.now().toString(36)}`,
                index: frameIndex,
                timestamp: frameTimestamp,
                videoTimestampSeconds: seekTime,
                dataUrl,
                blob,
                width: canvas.width,
                height: canvas.height,
                gps: matchingGps
              };

              frames.push(newFrame);
              frameIndex++;

              if (onFrameExtracted) {
                onFrameExtracted(newFrame, frames.length);
              }
            }
          }
        }

        clearTimeout(overallTimeout);
        cleanup();
        resolve(frames);
      } catch (err) {
        console.error("[Frame Extractor] Processing error:", err);
        clearTimeout(overallTimeout);
        cleanup();
        resolve(frames);
      }
    };

    // Attach listeners BEFORE setting src
    video.onloadedmetadata = () => {
      console.log("[Frame Extractor] loadedmetadata event fired");
      processVideo();
    };

    video.onerror = (e) => {
      console.error("[Frame Extractor] video element error:", e);
      clearTimeout(overallTimeout);
      cleanup();
      resolve([]);
    };

    // Set src and trigger load
    video.src = videoUrl;
    video.load();
  });
}

