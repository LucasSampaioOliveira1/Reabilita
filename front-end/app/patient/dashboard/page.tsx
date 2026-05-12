'use client';

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CHAT_SYNC_INTERVAL_OPEN_MS = 2500;
const CHAT_SYNC_INTERVAL_IDLE_MS = 5000;
const PATIENT_CHAT_READ_STORAGE_PREFIX = 'patient-chat:read-physio-count:';
const PATIENT_ACTIVITY_READ_STORAGE_PREFIX = 'patient-notifications:read-activities:';

type DashboardData = {
  patient: {
    id: string;
    phase: number;
    condition: string;
    user: { name: string };
  };
  videos: Array<{ id: string; title: string; videoUrl: string; phase: number }>;
  exercises: Array<{
    id: string;
    title: string;
    description?: string | null;
    phase: number;
    completed: boolean;
    lastCheckAt?: string | null;
    lastCheckCompleted?: boolean | null;
  }>;
  sessions: Array<{ id: string; completed: boolean; painLevel: number; date: string }>;
  interactions: Array<{
    id: string;
    note: string;
    createdAt: string;
    author: { name: string; role: string };
  }>;
  summary: {
    latestPainLevel: number | null;
    latestPainAt: string | null;
    totalExercises: number;
    completedExercises: number;
  };
  physioMessageCount: number;
  hasTodayPainRecord: boolean;
  notifications: string[];
};

type PatientNotificationsData = {
  summary: {
    unreadPhysioMessages: number;
  };
  pendingMessages: Array<{
    id: string;
    note: string;
    createdAt: string;
    author: { name: string; role: string };
  }>;
  recentActivities: Array<{
    id: string;
    type: 'physio_message' | 'video_added' | 'exercise_added' | 'daily_reminder';
    title: string;
    description: string;
    createdAt: string;
  }>;
  generatedAt: string;
};

function getPatientChatReadStorageKey(patientId: string) {
  return `${PATIENT_CHAT_READ_STORAGE_PREFIX}${patientId}`;
}

function getPatientActivityReadStorageKey(patientId: string) {
  return `${PATIENT_ACTIVITY_READ_STORAGE_PREFIX}${patientId}`;
}

function getStoredPatientReadCount(patientId: string) {
  if (typeof window === 'undefined') return 0;

  const rawValue = localStorage.getItem(getPatientChatReadStorageKey(patientId));
  if (!rawValue) return 0;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasStoredPatientReadCount(patientId: string) {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getPatientChatReadStorageKey(patientId)) !== null;
}

function getStoredPatientActivityReadAt(patientId: string) {
  if (typeof window === 'undefined') return 0;

  const rawValue = localStorage.getItem(getPatientActivityReadStorageKey(patientId));
  if (!rawValue) return 0;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasStoredPatientActivityReadAt(patientId: string) {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getPatientActivityReadStorageKey(patientId)) !== null;
}

function countIncomingPhysioMessages(interactions: DashboardData['interactions']) {
  return interactions.filter((interaction) => interaction.author.role === 'physio').length;
}

function getPatientAuth() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) return null;

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'patient') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return { token, user: user as { name: string; role: string } };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

function getYoutubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace('/', '')}`;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    return url;
  } catch {
    return url;
  }
}

const PAIN_SCALE_OPTIONS = [
  { value: 0, label: 'Sem dor', color: 'from-[#DCEBFF] to-[#C9D8F6]' },
  { value: 1, label: 'Muito leve', color: 'from-[#D6E6FF] to-[#C4D6F6]' },
  { value: 2, label: 'Leve', color: 'from-[#D2E0FF] to-[#BDCEF1]' },
  { value: 3, label: 'Leve', color: 'from-[#8EDB52] to-[#67B530]' },
  { value: 4, label: 'Controlada', color: 'from-[#7DCE41] to-[#5EA825]' },
  { value: 5, label: 'Moderada', color: 'from-[#FFF45E] to-[#F5E11A]' },
  { value: 6, label: 'Moderada', color: 'from-[#FFD24F] to-[#F6B400]' },
  { value: 7, label: 'Forte', color: 'from-[#FFA34D] to-[#F47B20]' },
  { value: 8, label: 'Intensa', color: 'from-[#FF8C48] to-[#EB5F1C]' },
  { value: 9, label: 'Muito intensa', color: 'from-[#F36B42] to-[#DB4218]' },
  { value: 10, label: 'Maxima', color: 'from-[#E85C43] to-[#C7331B]' },
] as const;

function getPainZoneLabel(value: number) {
  if (value <= 2) return 'Leve';
  if (value <= 6) return 'Moderada';
  return 'Intensa';
}

function getPainBadgeStyles(value: number | null) {
  if (value === null) return 'bg-white border-[#CBE9FB] text-[#096196]';
  if (value <= 2) return 'bg-[#EEF4FF] border-[#C9D8F6] text-[#4D5F87]';
  if (value <= 6) return 'bg-[#FFF8D7] border-[#F5D96D] text-[#8A6400]';
  return 'bg-[#FFE0D6] border-[#F2A285] text-[#B03A12]';
}

export default function PatientDashboardPage() {
  const router = useRouter();
  const [auth] = useState(getPatientAuth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [checkingExerciseId, setCheckingExerciseId] = useState<string | null>(null);
  const [isPainConfirmOpen, setIsPainConfirmOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readPhysioMessageCount, setReadPhysioMessageCount] = useState(0);
  const [readRecentActivityAt, setReadRecentActivityAt] = useState(0);
  const [notificationsData, setNotificationsData] = useState<PatientNotificationsData | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const isChatOpenRef = useRef(false);
  const activePatientIdRef = useRef<string | null>(null);

  const markPhysioMessagesAsRead = useCallback((patientId: string, count: number) => {
    setReadPhysioMessageCount(count);

    if (typeof window !== 'undefined') {
      localStorage.setItem(getPatientChatReadStorageKey(patientId), String(count));
    }
  }, []);

  const markRecentActivitiesAsRead = useCallback((patientId: string, timestamp: number) => {
    setReadRecentActivityAt(timestamp);

    if (typeof window !== 'undefined') {
      localStorage.setItem(getPatientActivityReadStorageKey(patientId), String(timestamp));
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!auth) return;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Erro ao carregar seu perfil.');
    if (activePatientIdRef.current !== result.patient.id) {
      activePatientIdRef.current = result.patient.id;
      const currentPhysioMessages = countIncomingPhysioMessages(result.interactions);
      const storedReadCount = hasStoredPatientReadCount(result.patient.id)
        ? getStoredPatientReadCount(result.patient.id)
        : currentPhysioMessages;
      setReadPhysioMessageCount(storedReadCount);

      if (!hasStoredPatientReadCount(result.patient.id) && typeof window !== 'undefined') {
        localStorage.setItem(
          getPatientChatReadStorageKey(result.patient.id),
          String(storedReadCount),
        );
      }

      const storedActivityReadAt = hasStoredPatientActivityReadAt(result.patient.id)
        ? getStoredPatientActivityReadAt(result.patient.id)
        : 0;
      setReadRecentActivityAt(storedActivityReadAt);
    }
    setData(result);
  }, [auth]);

  const loadChatInteractions = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!auth) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me/chat`,
          {
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Erro ao sincronizar mensagens.');
        }

        setData((prev) =>
          prev
            ? {
                ...prev,
                interactions: result.interactions,
                physioMessageCount: result.physioMessageCount,
              }
            : prev,
        );

        if (activePatientIdRef.current && isChatOpenRef.current) {
          markPhysioMessagesAsRead(
            activePatientIdRef.current,
            countIncomingPhysioMessages(result.interactions),
          );
        }
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error ? err.message : 'Erro ao sincronizar mensagens.',
          );
        }
      }
    },
    [auth, markPhysioMessagesAsRead],
  );

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!auth) return;

      try {
        if (!silent) {
          setIsLoadingNotifications(true);
          setNotificationsError('');
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me/notifications`,
          {
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Erro ao carregar notificacoes.');
        }

        const patientId = activePatientIdRef.current;
        const latestActivityTimestamp = result.recentActivities.reduce(
          (latest: number, activity: PatientNotificationsData['recentActivities'][number]) =>
            Math.max(latest, new Date(activity.createdAt).getTime()),
          0,
        );

        if (patientId && !hasStoredPatientActivityReadAt(patientId)) {
          markRecentActivitiesAsRead(patientId, latestActivityTimestamp);
        }

        setNotificationsData(result);
      } catch (err) {
        if (!silent) {
          setNotificationsError(
            err instanceof Error ? err.message : 'Erro ao carregar notificacoes.',
          );
        }
      } finally {
        if (!silent) {
          setIsLoadingNotifications(false);
        }
      }
    },
    [auth, markRecentActivitiesAsRead],
  );

  useEffect(() => {
    if (!auth) {
      router.push('/patient');
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        await loadDashboard();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [auth, router, loadDashboard]);

  useEffect(() => {
    if (!isChatOpen || !chatMessagesRef.current) return;
    chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
  }, [isChatOpen, data?.interactions.length]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    if (!auth) return;

    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [auth, loadNotifications]);

  useEffect(() => {
    if (!auth) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void loadChatInteractions({ silent: true });
      void loadNotifications({ silent: true });
    }, isChatOpen ? CHAT_SYNC_INTERVAL_OPEN_MS : CHAT_SYNC_INTERVAL_IDLE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [auth, isChatOpen, loadChatInteractions, loadNotifications]);

  useEffect(() => {
    if (!isNotificationsOpen || !data || !notificationsData) return;

    const latestActivityTimestamp = notificationsData.recentActivities.reduce(
      (latest, activity) => Math.max(latest, new Date(activity.createdAt).getTime()),
      0,
    );

    if (latestActivityTimestamp > readRecentActivityAt) {
      const timeoutId = window.setTimeout(() => {
        markRecentActivitiesAsRead(data.patient.id, latestActivityTimestamp);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [
    data,
    isNotificationsOpen,
    markRecentActivitiesAsRead,
    notificationsData,
    readRecentActivityAt,
  ]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/patient');
  };

  const submitPainRecord = async () => {
    if (!auth) return;
    setIsSavingSession(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          painLevel,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao salvar registro de dor.');
      await loadDashboard();
      setIsPainConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar registro de dor.');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSession || hasTodayPainRecord) return;
    setError('');
    setIsPainConfirmOpen(true);
  };

  const handleExerciseCheck = async (exerciseId: string, completed: boolean) => {
    if (!auth) return;
    setCheckingExerciseId(exerciseId);
    setError('');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me/exercises/${exerciseId}/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ completed }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao atualizar exercício.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar exercício.');
    } finally {
      setCheckingExerciseId(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !chatMessage.trim()) return;
    setIsSendingMessage(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          note: chatMessage.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao enviar mensagem.');
      setChatMessage('');
      setData((prev) =>
        prev
          ? {
              ...prev,
              interactions: prev.interactions.some(
                (interaction) => interaction.id === result.id,
              )
                ? prev.interactions
                : [...prev.interactions, result],
            }
          : prev,
      );
      await loadChatInteractions({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (!auth || isLoading) {
    return (
      <main className="min-h-screen bg-[#E5F5FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#096196] mx-auto"></div>
          <p className="mt-4 text-[#3A6C89]">Carregando...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#E5F5FF] p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 border border-[#CBE9FB]">
          <p className="text-red-600">{error || 'Não foi possível carregar seu dashboard.'}</p>
          <button
            onClick={handleLogout}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            Sair
          </button>
        </div>
      </main>
    );
  }

  const hasTodayPainRecord = data.hasTodayPainRecord;
  const currentPhysioMessages = countIncomingPhysioMessages(data.interactions);
  const unreadPhysioMessages = Math.max(
    0,
    currentPhysioMessages - readPhysioMessageCount,
  );
  const unreadRecentActivities = notificationsData
    ? notificationsData.recentActivities.filter(
        (activity) => new Date(activity.createdAt).getTime() > readRecentActivityAt,
      ).length
    : 0;
  const totalUnreadNotifications = unreadPhysioMessages + unreadRecentActivities;

  const handleOpenNotificationsChat = () => {
    markPhysioMessagesAsRead(data.patient.id, currentPhysioMessages);
    setIsNotificationsOpen(false);
    setIsChatOpen(true);
  };

  const formatNotificationDate = (date: string) =>
    new Date(date).toLocaleString('pt-BR');

  const getActivityAccent = (
    type: PatientNotificationsData['recentActivities'][number]['type'],
  ) => {
    if (type === 'physio_message') {
      return {
        bg: 'bg-[#E5F5FF]',
        border: 'border-[#CBE9FB]',
        text: 'text-[#096196]',
      };
    }

    if (type === 'video_added') {
      return {
        bg: 'bg-[#F0F8FF]',
        border: 'border-[#D7EAFE]',
        text: 'text-[#0B78B7]',
      };
    }

    if (type === 'exercise_added') {
      return {
        bg: 'bg-[#EAFBF1]',
        border: 'border-[#BDE8CC]',
        text: 'text-[#1F8A4C]',
      };
    }

    return {
      bg: 'bg-[#FFF8D7]',
      border: 'border-[#F5D96D]',
      text: 'text-[#8A6400]',
    };
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev;

      if (next) {
        markPhysioMessagesAsRead(data.patient.id, currentPhysioMessages);
      }

      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#E5F5FF]">
      <header className="bg-white shadow-sm border-b border-[#CBE9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-6 gap-4 sm:gap-0">
            <div className="flex items-center w-full sm:w-auto justify-center sm:justify-start">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-linear-to-br from-[#096196] to-[#0B78B7] rounded-xl shadow-lg shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1119 12.75M15 12h.01M9 12h.01M12 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-[#096196] leading-none">Reabilita Serra</h1>
                <p className="text-sm text-[#3A6C89] mt-1">Perfil do Paciente</p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 border-l border-[#CBE9FB] pl-4 sm:pl-6 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(true);
                  void loadNotifications();
                }}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#CBE9FB] bg-white text-[#096196] shadow-sm transition-all duration-200 hover:bg-[#E5F5FF] hover:shadow-lg"
                title="Abrir notificacoes"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalUnreadNotifications > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {totalUnreadNotifications > 99 ? '99+' : totalUnreadNotifications}
                  </span>
                ) : null}
              </button>

              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-[#096196] leading-none">{data.patient.user.name}</p>
                <p className="text-xs text-[#3A6C89] mt-1">Paciente</p>
              </div>
              <div className="w-10 h-10 bg-[#E5F5FF] text-[#096196] font-bold flex items-center justify-center rounded-full shrink-0">
                {data.patient.user.name.substring(0, 2).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {data.notifications.length > 0 && (
          <div className="bg-[#DFF2FE] border border-[#CBE9FB] text-[#096196] px-4 py-3 rounded-xl text-sm font-semibold">
            {data.notifications.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <p className="text-sm font-medium text-[#3A6C89]">Dor (EVA)</p>
            <p className="text-3xl font-bold text-[#096196] mt-2">
              {data.summary.latestPainLevel ?? '--'}
            </p>
            <p className="text-xs text-[#3A6C89] mt-2">
              {data.summary.latestPainAt
                ? `Ultimo registro: ${new Date(data.summary.latestPainAt).toLocaleString('pt-BR')}`
                : 'Nenhum registro de dor ainda.'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <p className="text-sm font-medium text-[#3A6C89]">Exercícios Concluídos</p>
            <p className="text-3xl font-bold text-[#096196] mt-2">
              {data.summary.completedExercises}/{data.summary.totalExercises}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <h2 className="text-xl font-bold text-[#096196] mb-4">Registro Diário de Dor (EVA)</h2>
            <form onSubmit={handleSessionSubmit} className="space-y-4">
              <div className="rounded-2xl border border-[#CBE9FB] bg-[#F8FCFF] p-4 sm:p-5">
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">Dor atual (EVA 0–10)</label>
                <div className="overflow-hidden rounded-2xl border border-[#D6EEFC] bg-white shadow-sm">
                  <div className="grid grid-cols-3 border-b border-[#D6EEFC] text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#355B73] sm:text-xs">
                    <div className="border-r border-[#D6EEFC] bg-[#EEF4FF] px-2 py-2">Leve</div>
                    <div className="border-r border-[#D6EEFC] bg-[#FFF8D7] px-2 py-2">Moderada</div>
                    <div className="bg-[#FFE0D6] px-2 py-2">Intensa</div>
                  </div>
                  <div className="grid grid-cols-11 gap-0.5 bg-[#D6EEFC] p-0.5">
                    {PAIN_SCALE_OPTIONS.map((option) => {
                      const isSelected = painLevel === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPainLevel(option.value)}
                          disabled={hasTodayPainRecord}
                          aria-pressed={isSelected}
                          className={`group flex min-h-24 flex-col items-center justify-center gap-2 bg-linear-to-b px-1 py-3 text-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-28 ${option.color} ${
                            isSelected
                              ? 'ring-4 ring-[#096196] ring-inset scale-[0.98]'
                              : 'hover:scale-[1.02]'
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-extrabold sm:h-10 sm:w-10 sm:text-base ${
                              isSelected
                                ? 'border-white bg-white text-[#096196] shadow-md'
                                : 'border-white/80 bg-white/70 text-[#2B3E4A]'
                            }`}
                          >
                            {option.value}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[#213844] sm:text-[11px]">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#D6EEFC] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#3A6C89]">Valor selecionado</p>
                    <p className="mt-1 text-3xl font-bold text-[#096196]">{painLevel}/10</p>
                  </div>
                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-sm font-bold ${getPainBadgeStyles(
                      painLevel,
                    )}`}
                  >
                    {getPainZoneLabel(painLevel)}
                  </span>
                </div>
              </div>
              {hasTodayPainRecord ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  Seu registro diario de dor (EVA) de hoje ja foi realizado. Voce podera registrar novamente amanha.
                </div>
              ) : null}
              <button
                type="submit"
                disabled={isSavingSession || hasTodayPainRecord}
                className="bg-[#096196] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#0B78B7] hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {hasTodayPainRecord
                  ? 'Registro de Hoje Realizado'
                  : isSavingSession
                    ? 'Salvando...'
                    : 'Salvar Dor do Dia'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Exercícios Prescritos</h2>
          {data.exercises.length === 0 ? (
            <p className="text-[#3A6C89]">Seu fisioterapeuta ainda não cadastrou exercícios.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.exercises.map((exercise) => (
                <div key={exercise.id} className="border border-[#CBE9FB] rounded-lg p-4 bg-[#F8FCFF]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[#096196]">{exercise.title}</p>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#096196] shrink-0">
                      <input
                        type="checkbox"
                        checked={exercise.completed}
                        disabled={checkingExerciseId === exercise.id}
                        onChange={(e) => handleExerciseCheck(exercise.id, e.target.checked)}
                        className="h-4 w-4"
                      />
                      {checkingExerciseId === exercise.id ? 'Salvando...' : exercise.completed ? 'Concluído' : 'Não concluído'}
                    </label>
                  </div>
                  <p className="text-sm text-[#3A6C89]">Fase {exercise.phase}</p>
                  {exercise.description ? (
                    <p className="text-sm text-[#3A6C89] mt-1">{exercise.description}</p>
                  ) : null}
                  {exercise.lastCheckAt ? (
                    <p className="text-xs text-[#3A6C89] mt-2">
                      Última atualização: {new Date(exercise.lastCheckAt).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Vídeos de Exercícios</h2>
          {data.videos.length === 0 ? (
            <p className="text-[#3A6C89]">Seu fisioterapeuta ainda não adicionou vídeos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.videos.map((video) => (
                <div key={video.id} className="border border-[#CBE9FB] rounded-lg p-3 bg-[#F8FCFF]">
                  <p className="font-semibold text-[#096196] mb-2">{video.title}</p>
                  <p className="text-xs text-[#3A6C89] mb-2">Fase {video.phase}</p>
                  <div className="aspect-video">
                    <iframe
                      className="w-full h-full rounded"
                      src={getYoutubeEmbedUrl(video.videoUrl)}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Historico de Dor (EVA)</h2>
          {data.sessions.length === 0 ? (
            <p className="text-[#3A6C89]">Nenhum registro de dor ainda.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-auto">
              {data.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-[#CBE9FB] rounded-lg p-4 bg-[#F8FCFF]"
                >
                  <div>
                    <span className="text-[#096196] font-semibold block">
                      {new Date(session.date).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-[#3A6C89]">Registro informado por voce</span>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1 text-sm font-bold text-[#096196] border border-[#CBE9FB]">
                    EVA: {session.painLevel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPainConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2A3D]/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#CBE9FB] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[#096196]">Confirmar registro de dor</h3>
            <p className="mt-3 text-sm text-[#3A6C89]">
              Deseja salvar o valor atual de dor como <span className="font-bold text-[#096196]">{painLevel}/10</span>?
            </p>
            <p className="mt-2 text-xs text-[#3A6C89]">
              Esse registro sera salvo no seu historico de dor (EVA).
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPainConfirmOpen(false)}
                disabled={isSavingSession}
                className="rounded-lg border border-[#CBE9FB] bg-white px-4 py-2 font-semibold text-[#096196] hover:bg-[#F3FAFF] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPainRecord}
                disabled={isSavingSession}
                className="rounded-lg bg-[#096196] px-4 py-2 font-semibold text-white hover:bg-[#0B78B7] disabled:opacity-60"
              >
                {isSavingSession ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isNotificationsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#CBE9FB] bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-[#DCEFFC] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E5F5FF] text-[#096196]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#096196]">Central de Notificacoes</h3>
                    <p className="mt-1 text-sm text-[#3A6C89]">
                      Acompanhe mensagens do fisioterapeuta e atualizacoes do seu plano.
                    </p>
                  </div>
                </div>
                {notificationsData?.generatedAt ? (
                  <p className="mt-3 text-xs text-[#3A6C89]">
                    Ultima atualizacao: {formatNotificationDate(notificationsData.generatedAt)}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="rounded-lg border border-[#CBE9FB] bg-white px-4 py-2 text-sm font-semibold text-[#096196] transition-all hover:bg-[#E5F5FF]"
                >
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="rounded-lg bg-[#096196] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0B78B7]"
                >
                  Fechar
                </button>
              </div>
            </div>

            {notificationsError ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {notificationsError}
              </div>
            ) : null}

            {isLoadingNotifications && !notificationsData ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[#096196]"></div>
                <p className="mt-4 text-sm text-[#3A6C89]">Carregando notificacoes...</p>
              </div>
            ) : notificationsData ? (
              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1fr]">
                <section className="rounded-2xl border border-[#CBE9FB] bg-white p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-[#E5F2FB] pb-4">
                    <div>
                      <h4 className="text-lg font-bold text-[#096196]">Mensagens Pendentes</h4>
                      <p className="mt-1 text-sm text-[#3A6C89]">
                        Mensagens do fisioterapeuta aguardando leitura.
                      </p>
                    </div>
                    <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#096196] px-2 py-1 text-xs font-bold text-white">
                      {unreadPhysioMessages}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {notificationsData.pendingMessages.length === 0 || unreadPhysioMessages === 0 ? (
                      <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] px-4 py-5 text-sm text-[#3A6C89]">
                        Nenhuma mensagem pendente no momento.
                      </div>
                    ) : (
                      notificationsData.pendingMessages
                        .slice(0, unreadPhysioMessages)
                        .map((message) => (
                          <div
                            key={message.id}
                            className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4"
                          >
                            <p className="text-sm font-bold text-[#096196]">
                              {message.author.name}
                            </p>
                            <p className="mt-2 text-sm text-[#096196]">{message.note}</p>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-[11px] text-[#3A6C89]">
                                {formatNotificationDate(message.createdAt)}
                              </p>
                              <button
                                type="button"
                                onClick={handleOpenNotificationsChat}
                                className="inline-flex items-center justify-center rounded-lg bg-[#096196] px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0B78B7]"
                              >
                                Abrir Chat
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#CBE9FB] bg-white p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-[#E5F2FB] pb-4">
                    <div>
                      <h4 className="text-lg font-bold text-[#096196]">Atividades Recentes</h4>
                      <p className="mt-1 text-sm text-[#3A6C89]">
                        Novidades do seu acompanhamento e do seu plano.
                      </p>
                    </div>
                    <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#0B78B7] px-2 py-1 text-xs font-bold text-white">
                      {unreadRecentActivities}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {notificationsData.recentActivities.length === 0 ? (
                      <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] px-4 py-5 text-sm text-[#3A6C89]">
                        Nenhuma atividade recente encontrada.
                      </div>
                    ) : (
                      notificationsData.recentActivities.map((activity) => {
                        const accent = getActivityAccent(activity.type);

                        return (
                          <div
                            key={activity.id}
                            className={`rounded-xl border p-4 ${accent.bg} ${accent.border}`}
                          >
                            <p className={`text-sm font-bold ${accent.text}`}>
                              {activity.title}
                            </p>
                            <p className="mt-2 text-sm text-[#096196]">
                              {activity.description}
                            </p>
                            <p className="mt-2 text-[11px] text-[#3A6C89]">
                              {formatNotificationDate(activity.createdAt)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {isChatOpen ? (
          <div className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-[#CBE9FB] bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 bg-[#096196] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold leading-none">Chat com Fisioterapeuta</p>
                  <p className="text-xs text-white/80 mt-1">Historico salvo automaticamente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div
              ref={chatMessagesRef}
              className="max-h-104 min-h-72 overflow-y-auto bg-[#F8FCFF] px-4 py-4 space-y-3"
            >
              {data.interactions.length === 0 ? (
                <div className="rounded-xl border border-[#D6EEFC] bg-white p-4 text-sm text-[#3A6C89]">
                  Nenhuma mensagem ainda. Envie uma atualização para seu fisioterapeuta.
                </div>
              ) : (
                data.interactions.map((interaction) => {
                  const isPatientMessage = interaction.author.role === 'patient';

                  return (
                    <div
                      key={interaction.id}
                      className={`flex ${isPatientMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${
                          isPatientMessage
                            ? 'bg-[#E5F5FF] border-[#CBE9FB] text-[#096196]'
                            : 'bg-white border-[#D6EEFC] text-[#096196]'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap wrap-break-word">{interaction.note}</p>
                        <p className="mt-2 text-[11px] text-[#3A6C89]">
                          {interaction.author.name} ({interaction.author.role === 'physio' ? 'Fisioterapeuta' : 'Paciente'}) •{' '}
                          {new Date(interaction.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-[#CBE9FB] bg-white p-3">
              <div className="flex items-end gap-2">
                <input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 border border-[#CBE9FB] rounded-xl px-3 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                  placeholder="Digite sua mensagem para o fisioterapeuta"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !chatMessage.trim()}
                  className="shrink-0 rounded-xl bg-[#096196] px-4 py-3 font-semibold text-white hover:bg-[#0B78B7] transition-all disabled:opacity-60"
                >
                  {isSendingMessage ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleToggleChat}
          className="inline-flex items-center gap-3 rounded-full bg-[#096196] px-5 py-4 text-white shadow-2xl hover:bg-[#0B78B7] transition-all"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </span>
          <span className="font-semibold">
            {isChatOpen ? 'Ocultar Chat' : 'Abrir Chat'}
          </span>
          {!isChatOpen && unreadPhysioMessages > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#096196]">
              {unreadPhysioMessages}
            </span>
          ) : null}
        </button>
      </div>
    </main>
  );
}
