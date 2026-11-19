// Phone-as-scanner bridge for the desktop app.
//
// A single WebSocket to the backend relay. The relay is "armed" whenever ANY
// editable field (input / textarea / select / contenteditable) is focused, so a
// phone scan is delivered while the user is in any field. Incoming scans are
// routed to a *special* handler if the focused field registered one (e.g. the
// POS barcode field, which auto-adds + beeps); otherwise the code is injected
// straight into the focused field.

import { API_BASE } from "./http";

type ScanHandler = (code: string) => void | Promise<void>;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let desiredArmed = false;
let started = false;

let focusedEl: Element | null = null;
const special = new WeakMap<Element, ScanHandler>();

function wsUrl(): string {
  const base = API_BASE.replace(/^http/i, "ws");
  return `${base}/scanner`;
}

function sendArm(armed: boolean) {
  if (armed === desiredArmed) return;
  desiredArmed = armed;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "arm", armed }));
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 2000);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  try {
    ws = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    // re-send current arm state on (re)connect
    const want = desiredArmed;
    desiredArmed = !want; // force sendArm to transmit
    sendArm(want);
  };
  ws.onmessage = (ev) => {
    let msg: { type?: string; code?: string };
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
    } catch {
      return;
    }
    if (msg?.type === "scan" && typeof msg.code === "string" && msg.code) {
      deliver(msg.code);
    }
  };
  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };
  ws.onerror = () => {
    try {
      ws?.close();
    } catch {
      /* noop */
    }
  };
}

function isEditable(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly;
  }
  return (el as HTMLElement).isContentEditable === true;
}

function injectValue(el: Element, code: string) {
  const node = el as HTMLInputElement | HTMLTextAreaElement;
  const proto =
    node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(node, code);
  else (node as HTMLInputElement).value = code;
  // Notify React (controlled inputs) and native listeners.
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
  node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
}

function deliver(code: string) {
  const el = focusedEl;
  const handler = el ? special.get(el) : undefined;
  if (handler) {
    void handler(code);
  } else if (el && isEditable(el)) {
    injectValue(el, code);
  }
}

function startFocusTracking() {
  if (started) return;
  started = true;
  document.addEventListener(
    "focusin",
    (e) => {
      focusedEl = e.target as Element;
      sendArm(isEditable(focusedEl));
    },
    true,
  );
  document.addEventListener(
    "focusout",
    () => {
      focusedEl = null;
      sendArm(false);
    },
    true,
  );
}

export const scannerBridge = {
  /** Call once at app start. Idempotent. */
  init() {
    startFocusTracking();
    connect();
  },
  /** Register a special handler for a specific field (POS barcode, etc.). */
  register(el: Element, handler: ScanHandler) {
    special.set(el, handler);
  },
  unregister(el: Element) {
    special.delete(el);
  },
};

// ---- audio feedback ----
let audioCtx: AudioContext | null = null;
export function playBeep(ok = true) {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx || new Ctor();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + (ok ? 0.09 : 0.18));
  } catch {
    /* audio unavailable */
  }
}
