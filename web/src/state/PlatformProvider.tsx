/**
 * Platform context — the single live data spine for every screen.
 *
 * Owns: selected source, the WebSocket subscription, the merged round buffer,
 * the analysis payload and connection health. React Query handles the initial
 * fetch and the polling fallback; the socket pushes deltas on top.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { POLL, STORAGE_KEYS } from "@/lib/config";
import { api } from "@/lib/api";
import type { AnalysisPayload, FeedStatus, RoundRecord, SourceInfo } from "@/lib/types";
import { wsTransport } from "@/lib/ws";

const ROUND_BUFFER = 400;

interface PlatformContextValue {
  source: string;
  setSource: (source: string) => void;
  sources: SourceInfo[];
  analysis: AnalysisPayload | null;
  rounds: RoundRecord[];
  latestRound: RoundRecord | null;
  feed: FeedStatus | null;
  connected: boolean;
  isLive: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  flashRoundId: number | null;
  refreshAll: () => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

function readStoredSource(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.source) ?? "aviator";
  } catch {
    return "aviator";
  }
}

function sortNewestFirst(items: RoundRecord[]): RoundRecord[] {
  return [...items].sort((a, b) => {
    const delta = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    return delta !== 0 ? delta : b.id - a.id;
  });
}

function mergeRounds(existing: RoundRecord[], incoming: RoundRecord[]): RoundRecord[] {
  const byId = new Map<number, RoundRecord>();
  for (const round of existing) byId.set(round.id, round);
  for (const round of incoming) byId.set(round.id, round);
  return sortNewestFirst([...byId.values()]).slice(0, ROUND_BUFFER);
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [source, setSourceState] = useState<string>(readStoredSource);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [liveAnalysis, setLiveAnalysis] = useState<AnalysisPayload | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [flashRoundId, setFlashRoundId] = useState<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  /* ---- queries ---------------------------------------------------------- */
  const sourcesQuery = useQuery({
    queryKey: ["sources"],
    queryFn: () => api.sources(),
    refetchInterval: POLL.slow,
    staleTime: 10000,
  });

  const analysisQuery = useQuery({
    queryKey: ["analysis", source],
    queryFn: () => api.analysis(source, undefined, "file"),
    refetchInterval: connected ? POLL.slow : POLL.analysis,
    staleTime: 1500,
  });

  const roundsQuery = useQuery({
    queryKey: ["rounds", source],
    queryFn: () => api.rounds(source, ROUND_BUFFER, 0, "desc", "file"),
    refetchInterval: connected ? POLL.slow : POLL.rounds,
    staleTime: 1500,
  });

  const feedQuery = useQuery({
    queryKey: ["feed-status"],
    queryFn: () => api.feedStatus(),
    refetchInterval: POLL.health,
    staleTime: 5000,
  });

  /* ---- seed the buffer from the REST snapshot --------------------------- */
  useEffect(() => {
    if (roundsQuery.data?.rounds) {
      setRounds((previous) => mergeRounds(previous, roundsQuery.data.rounds));
      setLastUpdated(new Date());
    }
  }, [roundsQuery.data]);

  useEffect(() => {
    if (analysisQuery.data) {
      setLiveAnalysis(analysisQuery.data);
      setLastUpdated(new Date());
    }
  }, [analysisQuery.data]);

  /* ---- websocket -------------------------------------------------------- */
  useEffect(() => {
    wsTransport.connect(source);
    const offStatus = wsTransport.onStatus(setConnected);

    const offSnapshot = wsTransport.on("snapshot", (envelope) => {
      const payload = envelope.payload as { analysis?: AnalysisPayload; rounds?: RoundRecord[]; source?: string };
      if (payload.source && payload.source !== source) return;
      if (payload.analysis) setLiveAnalysis(payload.analysis);
      if (payload.rounds) setRounds((previous) => mergeRounds(previous, payload.rounds ?? []));
      setLastUpdated(new Date());
    });

    const offAnalysis = wsTransport.on("analysis:update", (envelope) => {
      const payload = envelope.payload as AnalysisPayload;
      if (payload?.source && payload.source !== source) return;
      setLiveAnalysis(payload);
      setLastUpdated(new Date());
    });

    const offNewRound = wsTransport.on("round:new", (envelope) => {
      const round = envelope.payload as RoundRecord;
      if (!round || round.source !== source) return;
      setRounds((previous) => mergeRounds(previous, [round]));
      setLastUpdated(new Date());
      setFlashRoundId(round.id);
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashRoundId(null), 1400);
    });

    const offRoundsUpdate = wsTransport.on("rounds:update", (envelope) => {
      const payload = envelope.payload as { rounds?: RoundRecord[]; source?: string };
      if (payload.source && payload.source !== source) return;
      if (payload.rounds?.length) {
        setRounds((previous) => mergeRounds(previous, payload.rounds ?? []));
        setLastUpdated(new Date());
      }
    });

    const offFeed = wsTransport.on("feed:status", () => {
      void queryClient.invalidateQueries({ queryKey: ["feed-status"] });
    });

    const offIngest = wsTransport.on("ingest:scan", () => {
      void queryClient.invalidateQueries({ queryKey: ["ingest-status"] });
      void queryClient.invalidateQueries({ queryKey: ["rounds", source] });
    });

    return () => {
      offStatus();
      offSnapshot();
      offAnalysis();
      offNewRound();
      offRoundsUpdate();
      offFeed();
      offIngest();
    };
  }, [source, queryClient]);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  /* ---- source switching ------------------------------------------------- */
  const setSource = useCallback((next: string): void => {
    setSourceState(next);
    setRounds([]);
    setLiveAnalysis(null);
    try {
      window.localStorage.setItem(STORAGE_KEYS.source, next);
    } catch {
      // Storage unavailable — the selection still applies for this session.
    }
    wsTransport.switchSource(next);
  }, []);

  const refreshAll = useCallback((): void => {
    void queryClient.invalidateQueries();
    wsTransport.send("refresh", { source });
  }, [queryClient, source]);

  /* ---- derived ---------------------------------------------------------- */
  const latestRound = rounds.length > 0 ? rounds[0] : null;
  const isLive = useMemo<boolean>(() => {
    if (!lastUpdated) return false;
    return connected && Date.now() - lastUpdated.getTime() < 45000;
  }, [connected, lastUpdated]);

  const errorMessage = useMemo<string | null>(() => {
    const failure = analysisQuery.error ?? roundsQuery.error ?? sourcesQuery.error;
    if (!failure) return null;
    return failure instanceof Error ? failure.message : "Backend unavailable";
  }, [analysisQuery.error, roundsQuery.error, sourcesQuery.error]);

  const value = useMemo<PlatformContextValue>(
    () => ({
      source,
      setSource,
      sources: sourcesQuery.data?.sources ?? [],
      analysis: liveAnalysis,
      rounds,
      latestRound,
      feed: feedQuery.data ?? null,
      connected,
      isLive,
      loading: analysisQuery.isLoading && liveAnalysis === null,
      error: errorMessage,
      lastUpdated,
      flashRoundId,
      refreshAll,
    }),
    [
      source,
      setSource,
      sourcesQuery.data,
      liveAnalysis,
      rounds,
      latestRound,
      feedQuery.data,
      connected,
      isLive,
      analysisQuery.isLoading,
      errorMessage,
      lastUpdated,
      flashRoundId,
      refreshAll,
    ],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used inside PlatformProvider");
  return context;
}
