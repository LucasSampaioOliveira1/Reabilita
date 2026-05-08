'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardData = {
  patient: {
    id: string;
    phase: number;
    condition: string;
    user: { name: string };
  };
  videos: Array<{ id: string; title: string; videoUrl: string; phase: number }>;
  exercises: Array<{ id: string; title: string; description?: string | null; phase: number }>;
  sessions: Array<{ id: string; completed: boolean; painLevel: number; date: string }>;
  interactions: Array<{
    id: string;
    note: string;
    createdAt: string;
    author: { name: string; role: string };
  }>;
  summary: {
    adherenceRate: number;
    avgPain: number;
    weeklyFrequency: number;
    totalSessions: number;
    completedSessions: number;
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
  const [completedAll, setCompletedAll] = useState(false);
  const [painLevel, setPainLevel] = useState(0);
  const [interactionNote, setInteractionNote] = useState('');
  const [isSavingSession, setIsSavingSession] = useState(false);

  useEffect(() => {
    if (!auth) {
      router.push('/patient');
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao carregar seu perfil.');
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [auth, router]);

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
          completed: completedAll,
          painLevel,
          interactionNote: interactionNote.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao salvar checklist.');
      setInteractionNote('');

      const refresh = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const refreshed = await refresh.json();
      if (refresh.ok) setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar checklist.');
    } finally {
      setIsSavingSession(false);
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
    <main className="min-h-screen bg-[#E5F5FF] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#CBE9FB]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#096196]">
            Paciente
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#096196]">
            Olá, {data.patient.user.name}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#3A6C89]">
            Seu perfil de acompanhamento está disponível com exercícios e vídeos personalizados.
          </p>
          {data.notifications.map((note) => (
            <p key={note} className="mt-3 text-sm font-semibold text-[#0B78B7]">
              {note}
            </p>
          ))}
          <button
            onClick={handleLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            Sair
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Adesão</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">{data.summary.adherenceRate}%</p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Dor Média (EVA)</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">{data.summary.avgPain}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Frequência Semanal</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">{data.summary.weeklyFrequency}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Sessões</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">
              {data.summary.completedSessions}/{data.summary.totalSessions}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Checklist Diário e Registro EVA</h2>
          <form onSubmit={handleSessionSubmit} className="space-y-4">
            <label className="flex items-center gap-3 text-[#096196] font-semibold">
              <input
                type="checkbox"
                checked={completedAll}
                onChange={(e) => setCompletedAll(e.target.checked)}
                className="h-4 w-4"
              />
              Concluí os exercícios do dia
            </label>
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
            <div>
              <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                Registro de interações (opcional)
              </label>
              <textarea
                value={interactionNote}
                onChange={(e) => setInteractionNote(e.target.value)}
                className="w-full border border-[#CBE9FB] rounded-lg p-3"
                placeholder="Como foi o treino hoje?"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingSession}
              className="bg-[#096196] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#0B78B7] disabled:opacity-60"
            >
              {isSavingSession ? 'Salvando...' : 'Salvar Registro Diário'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Exercícios Prescritos</h2>
          {data.exercises.length === 0 ? (
            <p className="text-[#3A6C89]">Seu fisioterapeuta ainda não cadastrou exercícios.</p>
          ) : (
            <div className="space-y-3">
              {data.exercises.map((exercise) => (
                <div key={exercise.id} className="border border-[#CBE9FB] rounded-lg p-3">
                  <p className="font-semibold text-[#096196]">{exercise.title}</p>
                  <p className="text-sm text-[#3A6C89]">Fase {exercise.phase}</p>
                  {exercise.description ? (
                    <p className="text-sm text-[#3A6C89] mt-1">{exercise.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Vídeos de Exercícios</h2>
          {data.videos.length === 0 ? (
            <p className="text-[#3A6C89]">Seu fisioterapeuta ainda não adicionou vídeos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.videos.map((video) => (
                <div key={video.id} className="border border-[#CBE9FB] rounded-lg p-3">
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

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Interações</h2>
          {data.interactions.length === 0 ? (
            <p className="text-[#3A6C89]">Nenhuma interação registrada até o momento.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto">
              {data.interactions.map((interaction) => (
                <div key={interaction.id} className="border border-[#CBE9FB] rounded-lg p-3">
                  <p className="text-[#096196]">{interaction.note}</p>
                  <p className="text-xs text-[#3A6C89] mt-1">
                    {interaction.author.name} ({interaction.author.role === 'physio' ? 'Fisioterapeuta' : 'Paciente'}) •{' '}
                    {new Date(interaction.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 ring-1 ring-[#CBE9FB]">
          <h2 className="text-xl font-bold text-[#096196] mb-4">Histórico Recente</h2>
          {data.sessions.length === 0 ? (
            <p className="text-[#3A6C89]">Nenhum registro diário ainda.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto">
              {data.sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between border border-[#CBE9FB] rounded-lg p-3">
                  <span className="text-[#096196] font-semibold">
                    {new Date(session.date).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-[#3A6C89]">EVA: {session.painLevel}</span>
                  <span className={session.completed ? 'text-green-700 font-semibold' : 'text-yellow-700 font-semibold'}>
                    {session.completed ? 'Concluído' : 'Pendente'}
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
