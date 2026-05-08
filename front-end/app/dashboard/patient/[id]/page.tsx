'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PatientDashboardResponse = {
  patient: {
    id: string;
    phase: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'DEMITIDO';
    condition: string;
    user: { name: string };
  };
  videos: Array<{ id: string; title: string; videoUrl: string; phase: number }>;
  exercises: Array<{
    id: string;
    title: string;
    description?: string | null;
    phase: number;
    isActive: boolean;
  }>;
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

function getUser() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (!token || !userStr) return null;
  try {
    return { token, user: JSON.parse(userStr) as { role: string } };
  } catch {
    return null;
  }
}

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id;

  const [data, setData] = useState<PatientDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [videoForm, setVideoForm] = useState({ title: '', videoUrl: '', phase: 1 });
  const [exerciseForm, setExerciseForm] = useState({ title: '', description: '', phase: 1 });
  const [interactionNote, setInteractionNote] = useState('');

  const token = useMemo(() => getUser()?.token ?? '', []);

  const refreshDashboard = async () => {
    if (!patientId) return;
    try {
      const auth = getUser();
      if (!auth || auth.user.role !== 'physio') {
        router.push('/');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao carregar perfil do paciente.');
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil.');
    }
  };

  useEffect(() => {
    if (!patientId) return;

    let isCancelled = false;

    const loadInitialDashboard = async () => {
      try {
        const auth = getUser();
        if (!auth || auth.user.role !== 'physio') {
          router.push('/');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao carregar perfil do paciente.');

        if (!isCancelled) {
          setData(result);
          setError('');
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar perfil.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadInitialDashboard();

    return () => {
      isCancelled = true;
    };
  }, [patientId, router]);

  const addVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(videoForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao adicionar vídeo.');
      setVideoForm({ title: '', videoUrl: '', phase: 1 });
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar vídeo.');
    } finally {
      setSaving(false);
    }
  };

  const removeVideo = async (videoId: string) => {
    if (!confirm('Deseja remover este vídeo?')) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao remover vídeo.');
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover vídeo.');
    } finally {
      setSaving(false);
    }
  };

  const addExercise = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(exerciseForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao adicionar exercício.');
      setExerciseForm({ title: '', description: '', phase: 1 });
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar exercício.');
    } finally {
      setSaving(false);
    }
  };

  const removeExercise = async (exerciseId: string) => {
    if (!confirm('Deseja remover este exercício?')) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/exercises/${exerciseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao remover exercício.');
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover exercício.');
    } finally {
      setSaving(false);
    }
  };

  const addInteraction = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientId || !interactionNote.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: interactionNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao registrar interação.');
      setInteractionNote('');
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar interação.');
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = async () => {
    if (!patientId) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}/report-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao gerar relatório.');

      const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName ?? 'relatorio-paciente.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar relatório.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#E5F5FF] flex items-center justify-center p-6">
        <div className="bg-white border border-[#CBE9FB] rounded-2xl shadow-lg px-8 py-10 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#096196] mx-auto" />
          <p className="mt-4 text-[#3A6C89] font-medium">Carregando perfil do paciente...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#E5F5FF] p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 border border-[#CBE9FB] shadow-lg">
          <p className="text-red-600 font-medium">{error || 'Não foi possível carregar o perfil.'}</p>
          <Link href="/dashboard" className="mt-5 inline-flex items-center rounded-lg bg-[#096196] px-4 py-2 text-white font-semibold hover:bg-[#0B78B7] transition-colors">
            Voltar ao Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const patientStatusMeta = {
    IN_PROGRESS: {
      label: 'Em andamento',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    COMPLETED: {
      label: 'Finalizado',
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    DEMITIDO: {
      label: 'Demitido',
      className: 'bg-red-100 text-red-700 border-red-200',
    },
  } as const;

  return (
    <main className="min-h-screen bg-[#E5F5FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB] shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-linear-to-br from-[#096196] to-[#0B78B7] rounded-xl shadow-md shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[#3A6C89]">Perfil do Paciente</p>
              <h1 className="text-2xl font-bold text-[#096196]">{data.patient.user.name}</h1>
              <p className="text-[#3A6C89]">{data.patient.condition} • Fase {data.patient.phase}</p>
              <span className={`inline-flex mt-3 items-center px-3 py-1 rounded-full border text-xs font-semibold ${patientStatusMeta[data.patient.status].className}`}>
                {patientStatusMeta[data.patient.status].label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={downloadReport}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#096196] text-white font-semibold hover:bg-[#0B78B7] hover:shadow-lg transition-all disabled:opacity-60"
            >
              Baixar Relatório
            </button>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[#096196] text-white font-semibold hover:bg-[#0B78B7] transition-colors">
              Voltar
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-[#CBE9FB] shadow-sm">
            <p className="text-sm text-[#3A6C89]">Adesão</p>
            <p className="text-2xl font-bold text-[#096196] mt-1">{data.summary.adherenceRate}%</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[#CBE9FB] shadow-sm">
            <p className="text-sm text-[#3A6C89]">Dor Média (EVA)</p>
            <p className="text-2xl font-bold text-[#096196] mt-1">{data.summary.avgPain}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[#CBE9FB] shadow-sm">
            <p className="text-sm text-[#3A6C89]">Freq./semana</p>
            <p className="text-2xl font-bold text-[#096196] mt-1">{data.summary.weeklyFrequency}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[#CBE9FB] shadow-sm">
            <p className="text-sm text-[#3A6C89]">Sessões</p>
            <p className="text-2xl font-bold text-[#096196] mt-1">{data.summary.completedSessions}/{data.summary.totalSessions}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB] shadow-lg">
            <h2 className="text-lg font-bold text-[#096196] mb-4">Adicionar Vídeo</h2>
            <form onSubmit={addVideo} className="space-y-3">
              <input className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]" placeholder="Título do vídeo" value={videoForm.title} onChange={(e) => setVideoForm((prev) => ({ ...prev, title: e.target.value }))} required />
              <input className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]" placeholder="URL do YouTube" value={videoForm.videoUrl} onChange={(e) => setVideoForm((prev) => ({ ...prev, videoUrl: e.target.value }))} required />
              <input type="number" min={1} className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]" placeholder="Fase" value={videoForm.phase} onChange={(e) => setVideoForm((prev) => ({ ...prev, phase: Number(e.target.value) }))} />
              <button disabled={saving} className="w-full bg-[#096196] text-white rounded-lg py-2 font-semibold hover:bg-[#0B78B7] disabled:opacity-60">Adicionar Vídeo</button>
            </form>
            <div className="mt-4 space-y-2 max-h-64 overflow-auto">
              {data.videos.map((video) => (
                <div key={video.id} className="bg-[#F3FAFF] border border-[#D6EEFC] rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#096196]">{video.title}</p>
                    <p className="text-xs text-[#3A6C89]">Fase {video.phase}</p>
                  </div>
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB] shadow-lg">
            <h2 className="text-lg font-bold text-[#096196] mb-4">Plano de Exercícios</h2>
            <form onSubmit={addExercise} className="space-y-3">
              <input className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]" placeholder="Título do exercício" value={exerciseForm.title} onChange={(e) => setExerciseForm((prev) => ({ ...prev, title: e.target.value }))} required />
              <textarea className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]" placeholder="Descrição (opcional)" value={exerciseForm.description} onChange={(e) => setExerciseForm((prev) => ({ ...prev, description: e.target.value }))} />
              <input type="number" min={1} className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]" placeholder="Fase" value={exerciseForm.phase} onChange={(e) => setExerciseForm((prev) => ({ ...prev, phase: Number(e.target.value) }))} />
              <button disabled={saving} className="w-full bg-[#096196] text-white rounded-lg py-2 font-semibold hover:bg-[#0B78B7] disabled:opacity-60">Adicionar Exercício</button>
            </form>
            <div className="mt-4 space-y-2 max-h-64 overflow-auto">
              {data.exercises.map((exercise) => (
                <div key={exercise.id} className="bg-[#F3FAFF] border border-[#D6EEFC] rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#096196]">{exercise.title}</p>
                    <p className="text-xs text-[#3A6C89]">Fase {exercise.phase}</p>
                  </div>
                  <button
                    onClick={() => removeExercise(exercise.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB] shadow-lg">
          <h2 className="text-lg font-bold text-[#096196] mb-4">Registro de Interações</h2>
          <form onSubmit={addInteraction} className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 border border-[#CBE9FB] rounded-lg px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
              placeholder="Adicionar orientação/interação para telemonitoramento"
              value={interactionNote}
              onChange={(e) => setInteractionNote(e.target.value)}
              required
            />
            <button disabled={saving} className="bg-[#096196] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[#0B78B7] disabled:opacity-60">Registrar</button>
          </form>
          <div className="mt-4 space-y-2 max-h-72 overflow-auto">
            {data.interactions.map((item) => (
              <div key={item.id} className="bg-[#F3FAFF] border border-[#D6EEFC] rounded-lg p-3">
                <p className="text-[#096196]">{item.note}</p>
                <p className="text-xs text-[#3A6C89] mt-1">
                  {item.author.name} ({item.author.role === 'physio' ? 'Fisioterapeuta' : 'Paciente'}) • {new Date(item.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
