"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_MODEL_LABEL, GROQ_TEXT, labelFor } from "@/lib/model-catalog";

// ── Types ──────────────────────────────────────────────────────────────────
export type ModelStatus = "ok" | "quota" | "error" | "unknown";

export interface ModelStatusState {
  /** Which model label is currently active (last reported by any chat) */
  activeModel: string;
  /** True when we've fallen back to Groq (all Gemini models unavailable) */
  isOnFallback: boolean;
  /** Per-model quota status from the last check, keyed by model id */
  modelStatuses: Record<string, ModelStatus>;
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
  activeModel:   DEFAULT_MODEL_LABEL,
  isOnFallback:  false,
  modelStatuses: {},
  lastChecked:   null,
  checking:      false,
  checkStatus:   async () => {},
  reportModel:   () => {},
});

const CACHE_KEY = "a3_model_status_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — avoid burning quota on auto-probes

interface CachedStatus {
  modelStatuses: Record<string, ModelStatus>;
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
  const [activeModel,   setActiveModel]   = useState(DEFAULT_MODEL_LABEL);
  const [isOnFallback,  setIsOnFallback]  = useState(false);
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [lastChecked,   setLastChecked]   = useState<number | null>(null);
  const [checking,      setChecking]      = useState(false);
  const didInit = useRef(false);

  const checkStatus = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res  = await fetch("/api/model-status");
      const data = await res.json();
      if (data.models) {
        setModelStatuses(data.models);
        setIsOnFallback(!!data.fallback);
        if (data.activeLabel) setActiveModel(data.activeLabel);
        const ts = Date.now();
        setLastChecked(ts);
        saveCache({ modelStatuses: data.models, active: data.active, fallback: !!data.fallback, ts });
      }
    } catch {
      // network error — keep stale state
    } finally {
      setChecking(false);
    }
  }, [checking]);

  // ── On mount: hydrate from cache only. No auto-probe — the user clicks ↻
  //    to check. Avoids burning Gemini quota just by opening the app. ──────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const cached = loadCache();
    if (cached) {
      setModelStatuses(cached.modelStatuses);
      setIsOnFallback(cached.fallback);
      setLastChecked(cached.ts);
      setActiveModel(cached.active === "groq" ? GROQ_TEXT.label : labelFor(cached.active));
    }
  }, []);

  // ── reportModel: called by chat pages after each AI response ──────────
  const reportModel = useCallback((label: string) => {
    setActiveModel(label);
    const isGroq = label.toLowerCase().includes("groq");
    setIsOnFallback(isGroq);
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
