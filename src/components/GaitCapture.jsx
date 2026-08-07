import React, { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Gauge, LockKeyhole, Play, ShieldCheck, Smartphone } from "lucide-react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const WASM_ROOT = "/mediapipe/wasm";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32],
];

const clamp = (value, min = 0.5, max = 1.5) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a, b, c) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const divisor = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!divisor) return 0;
  return Math.acos(Math.min(1, Math.max(-1, (ab.x * cb.x + ab.y * cb.y) / divisor))) * 180 / Math.PI;
};
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const deviation = (values) => {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
};

function deriveMetrics(frames, motionSamples) {
  const valid = frames.filter((points) => points?.length >= 33);
  const hipCenters = valid.map((p) => ({ x: (p[23].x + p[24].x) / 2, y: (p[23].y + p[24].y) / 2 }));
  const shoulderCenters = valid.map((p) => ({ x: (p[11].x + p[12].x) / 2, y: (p[11].y + p[12].y) / 2 }));
  const scales = valid.map((p) => Math.max(.08, distance(p[11], p[12])));
  const leftKnees = valid.map((p) => angle(p[23], p[25], p[27]));
  const rightKnees = valid.map((p) => angle(p[24], p[26], p[28]));
  const ankleTravel = valid.map((p) => distance(p[27], p[28]) / Math.max(.08, distance(p[23], p[24])));
  // Body-relative drift prevents ordinary travel across the camera image from
  // being misclassified as postural sway.
  const torsoOffsets = shoulderCenters.map((point, index) => (point.x - hipCenters[index].x) / scales[index]);
  const velocities = hipCenters.slice(1).map((point, index) => distance(point, hipCenters[index]));
  const accelerations = velocities.slice(1).map((value, index) => Math.abs(value - velocities[index]));
  const motionEnergy = motionSamples.length ? mean(motionSamples) : mean(velocities) * 30;

  const kneeRangeDegrees = Math.max(...leftKnees, ...rightKnees) - Math.min(...leftKnees, ...rightKnees);
  const asymmetry = mean(leftKnees.map((value, index) => Math.abs(value - rightKnees[index]))) / 30;
  const sway = deviation(torsoOffsets) / .1;
  const smoothness = mean(accelerations) / .008;
  const efficiency = mean(ankleTravel) * .35 + motionEnergy * .08;

  return {
    mobility: Number(clamp(.72 + Math.min(kneeRangeDegrees / 180, 1.5) * .45).toFixed(3)),
    balance: Number(clamp(.75 + Math.min(sway, 2) * .25).toFixed(3)),
    symmetry: Number(clamp(.75 + Math.min(asymmetry, 2) * .3).toFixed(3)),
    energyFlow: Number(clamp(.78 + Math.min(efficiency, 2) * .18).toFixed(3)),
    smoothness: Number(clamp(.78 + Math.min(smoothness, 2) * .18).toFixed(3)),
  };
}

export default function GaitCapture({ unlocked, onMetrics }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const framesRef = useRef([]);
  const motionRef = useRef([]);
  const lastVideoTimeRef = useRef(-1);
  const detectorFramesRef = useRef(0);
  const detectorErrorsRef = useRef(0);
  const noPoseTimerRef = useRef(null);
  const autoFinishedRef = useRef(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Camera remains on this device; raw video is not saved.");
  const [consent, setConsent] = useState(false);
  const [poseVisible, setPoseVisible] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [cameraCount, setCameraCount] = useState(null);
  const [detectorFrames, setDetectorFrames] = useState(0);

  const stopCamera = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
    animationRef.current = null;
    noPoseTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setPoseVisible(false);
  };

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.removeEventListener("devicemotion", collectMotion);
    landmarkerRef.current?.close();
  }, []);

  async function enableMotion() {
    try {
      if (typeof DeviceMotionEvent === "undefined") throw new Error("Motion sensors are not available on this device.");
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== "granted") throw new Error("Motion sensor permission was not granted.");
      }
      window.addEventListener("devicemotion", collectMotion);
      setMotionEnabled(true);
      setMessage("Phone motion sensor connected. Keep the device secured at your waist or in a snug pocket.");
    } catch (error) {
      setMessage(error.message || "Motion sensors could not be enabled.");
    }
  }

  function collectMotion(event) {
    const source = event.accelerationIncludingGravity;
    if (!source) return;
    motionRef.current.push(Math.hypot(source.x || 0, source.y || 0, source.z || 0) / 9.81);
    if (motionRef.current.length > 900) motionRef.current.shift();
  }

  async function loadLandmarker() {
    if (landmarkerRef.current) return landmarkerRef.current;
    setStatus("loading");
    setMessage("Loading the private on-device pose model…");
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
    try {
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: .35,
        minPosePresenceConfidence: .35, minTrackingConfidence: .35,
      });
    } catch {
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL },
        runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: .35,
        minPosePresenceConfidence: .35, minTrackingConfidence: .35,
      });
    }
    return landmarkerRef.current;
  }

  function drawPose(points) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = Math.max(2, canvas.width / 320);
    context.strokeStyle = "rgba(94, 234, 212, .9)";
    context.fillStyle = "#fde68a";
    CONNECTIONS.forEach(([from, to]) => {
      if ((points[from].visibility ?? 1) < .5 || (points[to].visibility ?? 1) < .5) return;
      context.beginPath();
      context.moveTo(points[from].x * canvas.width, points[from].y * canvas.height);
      context.lineTo(points[to].x * canvas.width, points[to].y * canvas.height);
      context.stroke();
    });
    points.forEach((point) => {
      if ((point.visibility ?? 1) < .55) return;
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(3, canvas.width / 180), 0, Math.PI * 2);
      context.fill();
    });
  }

  function analyzeFrame() {
    const video = videoRef.current;
    if (!video || !landmarkerRef.current || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        const result = landmarkerRef.current.detectForVideo(video, performance.now());
        detectorErrorsRef.current = 0;
        detectorFramesRef.current += 1;
        if (detectorFramesRef.current % 10 === 0) setDetectorFrames(detectorFramesRef.current);
        const points = result.landmarks?.[0];
        setPoseVisible(Boolean(points));
        if (points) {
          if (noPoseTimerRef.current) clearTimeout(noPoseTimerRef.current);
          noPoseTimerRef.current = null;
          drawPose(points);
          framesRef.current.push(points.map((point) => ({ x: point.x, y: point.y, z: point.z, visibility: point.visibility })));
          if (framesRef.current.length > 600) framesRef.current.shift();
          setFrameCount(framesRef.current.length);
          if (framesRef.current.length >= 300 && !autoFinishedRef.current) {
            autoFinishedRef.current = true;
            finishScan();
            return;
          }
        }
      } catch (error) {
        detectorErrorsRef.current += 1;
        if (detectorErrorsRef.current === 1) {
          console.error("Pose detector frame error", error);
          setMessage("The camera is live, but the pose detector encountered a frame error. Retrying automatically.");
        }
      }
    }
    animationRef.current = requestAnimationFrame(analyzeFrame);
  }

  async function startCamera() {
    if (!unlocked || !consent) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera capture requires a supported browser and HTTPS.");
      await loadLandmarker();
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
        });
      } catch (preferredError) {
        if (!["NotFoundError", "OverconstrainedError"].includes(preferredError.name)) throw preferredError;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraCount(devices.filter((device) => device.kind === "videoinput").length);
      streamRef.current = stream;
      framesRef.current = [];
      motionRef.current = [];
      detectorFramesRef.current = 0;
      detectorErrorsRef.current = 0;
      autoFinishedRef.current = false;
      setFrameCount(0);
      setDetectorFrames(0);
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("capturing");
      setMessage("Face the camera and walk or march naturally in place. Keep your full body visible while the 300-frame capture completes.");
      analyzeFrame();
      noPoseTimerRef.current = setTimeout(() => {
        if (framesRef.current.length === 0 && detectorFramesRef.current > 0) {
          setMessage("The detector is running but cannot see a complete person. Face the camera, step back until your head and both feet are visible, and increase front lighting.");
        }
      }, 4000);
    } catch (error) {
      stopCamera();
      if (error.name === "NotAllowedError" || error.name === "SecurityError") {
        setMessage("Camera permission is blocked. Select the camera icon beside the address bar, allow camera access, then try again.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraCount(0);
        setMessage("No camera was detected. Connect or enable a webcam, allow camera access in Windows Privacy settings, then reload this page.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setMessage("The camera is present but unavailable. Close Camera, Zoom, Teams, or another app using it, then try again.");
      } else if (error.name === "OverconstrainedError") {
        setMessage("The available camera could not provide a compatible video mode. Reconnect it or try another browser.");
      } else {
        setMessage(error.message || "Camera capture could not start.");
      }
    }
  }

  function finishScan() {
    if (framesRef.current.length < 30) {
      setMessage("Not enough visible movement yet. Keep your full body in view and continue walking.");
      return;
    }
    const metrics = deriveMetrics(framesRef.current, motionRef.current);
    onMetrics(metrics);
    setMessage(`Captured ${framesRef.current.length} pose frames. Review the derived ratios below before saving.`);
    stopCamera();
  }

  return <section className="live-gait-capture" id="movement-capture">
    <div className="capture-heading"><div><p className="ne-kicker">Live biometric movement capture</p><h2>Let the camera map your motion constellation.</h2><p>On-device pose estimation measures body landmarks; it does not identify your face or inspect bones.</p></div><span className={status === "capturing" ? "live" : ""}><i /> {status === "capturing" ? "Capturing" : status === "loading" ? "Loading model" : "Sensor standby"}</span></div>
    <div className="capture-grid">
      <div className="camera-stage">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        {status !== "capturing" && <div className="camera-placeholder"><Camera size={42} /><strong>Camera chamber</strong><span>Full body · landscape view · good lighting</span></div>}
        {status === "capturing" && <div className="tracking-badge"><i /> {poseVisible ? `${frameCount}/300 pose frames · auto-analysis when ready` : "Step back until your full body is visible"}</div>}
      </div>
      <div className="capture-console">
        <div className="sensor-readout"><span><small>Pose frames</small><strong>{frameCount}</strong></span><span><small>Detector</small><strong>{status === "capturing" ? detectorFrames > 0 ? "RUNNING" : "STARTING" : "READY"}</strong></span><span><small>Camera</small><strong>{cameraCount === null ? "READY" : cameraCount > 0 ? `${cameraCount} FOUND` : "NONE"}</strong></span></div>
        <div className="capture-instructions"><h3>Capture protocol</h3><ol><li>Place the camera 8–12 feet away and face it directly.</li><li>Keep your head, hands, and both feet in frame.</li><li>Walk or march naturally in place until the counter reaches 300.</li><li>Repeat in similar footwear and lighting for useful trends.</li></ol></div>
        <label className="camera-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><ShieldCheck size={14} /></span><p>I consent to live camera processing. Raw video will not be saved by this feature.</p></label>
        <div className="capture-actions">
          {status !== "capturing" ? <button className="start-capture" disabled={!unlocked || !consent} onClick={startCamera}>{!unlocked ? <LockKeyhole size={16} /> : <Play size={16} />} Start live scan</button> : <><button className="finish-capture" onClick={finishScan}><Gauge size={16} /> Calculate movement ratios</button><button onClick={stopCamera}><CircleStop size={16} /> Stop</button></>}
          <button disabled={motionEnabled} onClick={enableMotion}><Smartphone size={16} /> {motionEnabled ? "Phone sensor connected" : "Add phone motion sensor"}</button>
        </div>
        <p className="capture-message">{message}</p>
      </div>
    </div>
  </section>;
}
