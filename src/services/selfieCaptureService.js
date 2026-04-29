/**
 * Browser camera helpers for Staff Time Clock selfie proof.
 * Call requestCameraStream / captureSelfieBlob only after explicit user action.
 * No automatic camera open, no Supabase, no uploads.
 */

const DEFAULT_CONSTRAINTS = {
  video: { facingMode: "user" },
  audio: false,
};

function hasGetUserMedia() {
  return (
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/**
 * @param {MediaStreamConstraints} [constraints] — merged over sensible defaults (front camera).
 */
export async function requestCameraStream(constraints = {}) {
  if (!hasGetUserMedia()) {
    return {
      data: null,
      error: {
        code: "UNSUPPORTED",
        message: "Camera (getUserMedia) is not available in this environment",
      },
    };
  }

  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return {
      data: null,
      error: {
        code: "INSECURE_CONTEXT",
        message: "Camera requires a secure context (HTTPS)",
      },
    };
  }

  const merged = {
    ...DEFAULT_CONSTRAINTS,
    ...constraints,
    video: constraints.video != null ? constraints.video : DEFAULT_CONSTRAINTS.video,
    audio: constraints.audio != null ? constraints.audio : false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(merged);
    return { data: { stream }, error: null };
  } catch (err) {
    const name = err?.name || "";
    let code = "UNKNOWN";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") code = "PERMISSION_DENIED";
    else if (name === "NotFoundError" || name === "DevicesNotFoundError") code = "NO_CAMERA";
    else if (name === "NotReadableError" || name === "TrackStartError") code = "HARDWARE_ERROR";
    else if (name === "OverconstrainedError") code = "OVERCONSTRAINED";

    return {
      data: null,
      error: {
        code,
        message: err?.message || "Could not open camera",
      },
    };
  }
}

/**
 * @param {HTMLVideoElement} videoElement — live preview from requestCameraStream
 * @param {object} [options]
 * @param {string} [options.mimeType='image/jpeg']
 * @param {number} [options.quality=0.88]
 * @param {number} [options.maxWidth] — scale down preserving aspect if set
 * @param {string} [options.fileName='clock-selfie.jpg']
 */
export function captureSelfieBlob(videoElement, options = {}) {
  if (!videoElement || typeof videoElement.videoWidth !== "number") {
    return Promise.resolve({
      data: null,
      error: { code: "INVALID_INPUT", message: "A video element is required" },
    });
  }

  const w = videoElement.videoWidth;
  const h = videoElement.videoHeight;
  if (!w || !h) {
    return Promise.resolve({
      data: null,
      error: {
        code: "CAPTURE_FAILED",
        message: "Video has no frame dimensions yet; wait for loadedmetadata / play",
      },
    });
  }

  const mimeType = options.mimeType || "image/jpeg";
  const quality = typeof options.quality === "number" ? options.quality : 0.88;
  const maxWidth = options.maxWidth;
  const fileName = options.fileName || "clock-selfie.jpg";

  let outW = w;
  let outH = h;
  if (Number.isFinite(maxWidth) && maxWidth > 0 && w > maxWidth) {
    outW = Math.round(maxWidth);
    outH = Math.round((h * maxWidth) / w);
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return Promise.resolve({
        data: null,
        error: { code: "CAPTURE_FAILED", message: "Could not get canvas context" },
      });
    }
    ctx.drawImage(videoElement, 0, 0, outW, outH);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              data: null,
              error: { code: "CAPTURE_FAILED", message: "Could not encode image" },
            });
            return;
          }
          resolve({
            data: {
              blob,
              fileName,
              contentType: mimeType,
            },
            error: null,
          });
        },
        mimeType,
        quality,
      );
    });
  } catch (err) {
    return Promise.resolve({
      data: null,
      error: {
        code: "CAPTURE_FAILED",
        message: err?.message || String(err),
      },
    });
  }
}

/**
 * Stop all tracks on a MediaStream (always call after capture or cancel).
 * @param {MediaStream|null|undefined} stream
 */
export function stopCameraStream(stream) {
  if (!stream || typeof stream.getTracks !== "function") {
    return { data: { stopped: false }, error: null };
  }
  try {
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    return { data: { stopped: true }, error: null };
  } catch (err) {
    return {
      data: { stopped: false },
      error: { code: "STOP_FAILED", message: err?.message || String(err) },
    };
  }
}
