'use client';

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  notifications: string[];
};

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

  const loadDashboard = useCallback(async () => {
    if (!auth) return;
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Erro ao carregar seu perfil.');
    setData(result);
  }, [auth]);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/patient');
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar registro de dor.');
    } finally {
      setIsSavingSession(false);
    }
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
      await loadDashboard();
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

            <div className="flex items-center space-x-3 sm:space-x-4 border-l border-[#CBE9FB] pl-4 sm:pl-6 shrink-0">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <h2 className="text-xl font-bold text-[#096196] mb-4">Registro Diário de Dor (EVA)</h2>
            <form onSubmit={handleSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">Dor atual (EVA 0–10)</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[#096196] font-bold mt-1">{painLevel}/10</p>
              </div>
              <button
                type="submit"
                disabled={isSavingSession}
                className="bg-[#096196] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#0B78B7] hover:shadow-lg transition-all disabled:opacity-60"
              >
                {isSavingSession ? 'Salvando...' : 'Salvar Dor do Dia'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#E5F5FF] text-[#096196]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#096196]">Chat com Fisioterapeuta</h2>
            </div>
            {data.interactions.length === 0 ? (
              <p className="text-[#3A6C89]">Nenhuma mensagem ainda. Envie uma atualização para seu fisioterapeuta.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto mb-4">
                {data.interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className={`rounded-lg p-3 border ${
                      interaction.author.role === 'patient'
                        ? 'bg-[#E5F5FF] border-[#CBE9FB]'
                        : 'bg-[#F8FCFF] border-[#D6EEFC]'
                    }`}
                  >
                    <p className="text-[#096196]">{interaction.note}</p>
                    <p className="text-xs text-[#3A6C89] mt-1">
                      {interaction.author.name} ({interaction.author.role === 'physio' ? 'Fisioterapeuta' : 'Paciente'}) •{' '}
                      {new Date(interaction.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                placeholder="Digite sua mensagem para o fisioterapeuta"
              />
              <button
                type="submit"
                disabled={isSendingMessage || !chatMessage.trim()}
                className="bg-[#096196] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0B78B7] transition-all disabled:opacity-60"
              >
                {isSendingMessage ? 'Enviando...' : 'Enviar'}
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
    </main>
  );
}
