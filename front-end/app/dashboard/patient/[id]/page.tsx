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
      <main className="min-h-screen bg-[#E5F5FF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#096196]" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#E5F5FF] p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 border border-[#CBE9FB]">
          <p className="text-red-600">{error || 'Não foi possível carregar o perfil.'}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-[#096196] font-semibold">Voltar ao Dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E5F5FF] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-[#3A6C89]">Perfil do Paciente</p>
            <h1 className="text-2xl font-bold text-[#096196]">{data.patient.user.name}</h1>
            <p className="text-[#3A6C89]">{data.patient.condition} • Fase {data.patient.phase}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadReport}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#096196] text-white font-semibold hover:bg-[#0B78B7] disabled:opacity-60"
            >
              Baixar Relatório
            </button>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-white border border-[#CBE9FB] text-[#096196] font-semibold">
              Voltar
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Adesão</p>
            <p className="text-2xl font-bold text-[#096196]">{data.summary.adherenceRate}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Dor Média (EVA)</p>
            <p className="text-2xl font-bold text-[#096196]">{data.summary.avgPain}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Freq./semana</p>
            <p className="text-2xl font-bold text-[#096196]">{data.summary.weeklyFrequency}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Sessões</p>
            <p className="text-2xl font-bold text-[#096196]">{data.summary.completedSessions}/{data.summary.totalSessions}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB]">
            <h2 className="text-lg font-bold text-[#096196] mb-4">Adicionar Vídeo</h2>
            <form onSubmit={addVideo} className="space-y-3">
              <input className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2" placeholder="Título do vídeo" value={videoForm.title} onChange={(e) => setVideoForm((prev) => ({ ...prev, title: e.target.value }))} required />
              <input className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2" placeholder="URL do YouTube" value={videoForm.videoUrl} onChange={(e) => setVideoForm((prev) => ({ ...prev, videoUrl: e.target.value }))} required />
              <input type="number" min={1} className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2" placeholder="Fase" value={videoForm.phase} onChange={(e) => setVideoForm((prev) => ({ ...prev, phase: Number(e.target.value) }))} />
              <button disabled={saving} className="w-full bg-[#096196] text-white rounded-lg py-2 font-semibold hover:bg-[#0B78B7] disabled:opacity-60">Adicionar Vídeo</button>
            </form>
            <div className="mt-4 space-y-2 max-h-64 overflow-auto">
              {data.videos.map((video) => (
                <div key={video.id} className="border border-[#CBE9FB] rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#096196]">{video.title}</p>
                    <p className="text-xs text-[#3A6C89]">Fase {video.phase}</p>
                  </div>
                  <button onClick={() => removeVideo(video.id)} className="text-red-600 font-semibold text-sm">Excluir</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB]">
            <h2 className="text-lg font-bold text-[#096196] mb-4">Plano de Exercícios</h2>
            <form onSubmit={addExercise} className="space-y-3">
              <input className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2" placeholder="Título do exercício" value={exerciseForm.title} onChange={(e) => setExerciseForm((prev) => ({ ...prev, title: e.target.value }))} required />
              <textarea className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2" placeholder="Descrição (opcional)" value={exerciseForm.description} onChange={(e) => setExerciseForm((prev) => ({ ...prev, description: e.target.value }))} />
              <input type="number" min={1} className="w-full border border-[#CBE9FB] rounded-lg px-3 py-2" placeholder="Fase" value={exerciseForm.phase} onChange={(e) => setExerciseForm((prev) => ({ ...prev, phase: Number(e.target.value) }))} />
              <button disabled={saving} className="w-full bg-[#096196] text-white rounded-lg py-2 font-semibold hover:bg-[#0B78B7] disabled:opacity-60">Adicionar Exercício</button>
            </form>
            <div className="mt-4 space-y-2 max-h-64 overflow-auto">
              {data.exercises.map((exercise) => (
                <div key={exercise.id} className="border border-[#CBE9FB] rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#096196]">{exercise.title}</p>
                    <p className="text-xs text-[#3A6C89]">Fase {exercise.phase}</p>
                  </div>
                  <button onClick={() => removeExercise(exercise.id)} className="text-red-600 font-semibold text-sm">Excluir</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB]">
          <h2 className="text-lg font-bold text-[#096196] mb-4">Registro de Interações</h2>
          <form onSubmit={addInteraction} className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 border border-[#CBE9FB] rounded-lg px-3 py-2"
              placeholder="Adicionar orientação/interação para telemonitoramento"
              value={interactionNote}
              onChange={(e) => setInteractionNote(e.target.value)}
              required
            />
            <button disabled={saving} className="bg-[#096196] text-white rounded-lg px-4 py-2 font-semibold hover:bg-[#0B78B7] disabled:opacity-60">Registrar</button>
          </form>
          <div className="mt-4 space-y-2 max-h-72 overflow-auto">
            {data.interactions.map((item) => (
              <div key={item.id} className="border border-[#CBE9FB] rounded-lg p-3">
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
