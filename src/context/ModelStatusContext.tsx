"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export type ModelStatus = "ok" | "quota" | "error" | "unknown";

export interface ModelStatusState {
  /** Which model label is currently active (last reported by any chat) */
  activeModel: string;
  /** True when we've fallen back to Groq (Gemini is exhausted) */
  isOnFallback: boolean;
  /** Per-model quota status from the last check */
  modelStatuses: {
    "gemini-2.5-pro": ModelStatus;
    "gemini-2.0-flash": ModelStatus;
  };
  /** When the last status check ran (epoch ms) */
  lastChecked: number | null;
  /** True while a status check is in flight */
  checking: boolean;
  /** Call this to manually re-check quota */
  checkStatus: () => Promise<void>;
  /** Called by chat pages when they get an AI response */
  reportModel: (label: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────
const ModelStatusContext = createContext<ModelStatusState>({
  activeModel:    "Gemini 2.5 Pro",
  isOnFallback:   false,
  modelStatuses:  { "gemini-2.5-pro": "unknown", "gemini-2.0-flash": "unknown" },
  lastChecked:    null,
  checking:       false,
  checkStatus:    async () => {},
  reportModel:    () => {},
});

const CACHE_KEY = "a3_model_status";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — avoid burning quota on auto-probes

interface CachedStatus {
  modelStatuses: { "gemini-2.5-pro": ModelStatus; "gemini-2.0-flash": ModelStatus };
  active: string;
  fallback: boolean;
  ts: number;
}

function loadCache(): CachedStatus | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedStatus = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data: CachedStatus) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {
    // sessionStorage might be unavailable
  }
}

// ── Provider ───────────────────────────────────────────────────────────────
export function ModelStatusProvider({ children }: { children: React.ReactNode }) {
  const [activeModel,   setActiveModel]   = useState("Gemini 2.5 Pro");
  const [isOnFallback,  setIsOnFallback]  = useState(false);
  const [modelStatuses, setModelStatuses] = useState<{ "gemini-2.5-pro": ModelStatus; "gemini-2.0-flash": ModelStatus }>({
    "gemini-2.5-pro":  "unknown",
    "gemini-2.0-flash": "unknown",
  });
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [checking,    setChecking]    = useState(false);
  const didInit = useRef(false);

  const checkStatus = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res  = await fetch("/api/model-status");
      const data = await res.json();
      if (data.models) {
        const statuses = {
          "gemini-2.5-pro":  data.models["gemini-2.5-pro"]  as ModelStatus,
          "gemini-2.0-flash": data.models["gemini-2.0-flash"] as ModelStatus,
        };
        setModelStatuses(statuses);
        setIsOnFallback(!!data.fallback);
        if (data.activeLabel) setActiveModel(data.activeLabel);
        const ts = Date.now();
        setLastChecked(ts);
        saveCache({ modelStatuses: statuses, active: data.active, fallback: !!data.fallback, ts });
      }
    } catch {
      // network error — keep stale state
    } finally {
      setChecking(false);
    }
  }, [checking]);

  // ── On mount: load from cache or fetch fresh ──────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const cached = loadCache();
    if (cached) {
      setModelStatuses(cached.modelStatuses);
      setIsOnFallback(cached.fallback);
      setLastChecked(cached.ts);
      const label = cached.active === "gemini-2.5-pro" ? "Gemini 2.5 Pro"
                  : cached.active === "gemini-2.0-flash" ? "Gemini 2.0 Flash"
                  : "Groq · Llama 3.3";
      setActiveModel(label);
    }
    // No auto-probe on mount — user clicks ↻ to check. Avoids burning Gemini quota.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── reportModel: called by chat pages after each AI response ──────────
  const reportModel = useCallback((label: string) => {
    setActiveModel(label);
    const isGroq = label.toLowerCase().includes("groq") || label.toLowerCase().includes("llama");
    setIsOnFallback(isGroq);
    // Invalidate cache so next sidebar check reflects reality
    if (isGroq) {
      try {
        const cached = loadCache();
        if (cached) {
          cached.fallback = true;
          saveCache(cached);
        }
      } catch { /* ignore */ }
    }
  }, []);

  return (
    <ModelStatusContext.Provider value={{
      activeModel,
      isOnFallback,
      modelStatuses,
      lastChecked,
      checking,
      checkStatus,
      reportModel,
    }}>
      {children}
    </ModelStatusContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useModelStatus() {
  return useContext(ModelStatusContext);
}
