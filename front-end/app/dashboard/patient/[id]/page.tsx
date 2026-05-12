'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import PhysioChatWidget from "../../../components/PhysioChatWidget";

type PatientDashboardResponse = {
  patient: {
    id: string;
    cpf: string;
    phone: string;
    address: string;
    birthDate: string;
    age: number;
    phase: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'DEMITIDO';
    condition: string;
    user: { name: string; loginCode: string };
  };
  videos: Array<{ id: string; title: string; videoUrl: string; phase: number }>;
  exercises: Array<{
    id: string;
    title: string;
    description?: string | null;
    phase: number;
    isActive: boolean;
    completed?: boolean;
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

type EditPatientFormData = {
  name: string;
  cpf: string;
  phone: string;
  address: string;
  birthDate: string;
  condition: string;
  phase: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'DEMITIDO';
  password: string;
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
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormData, setEditFormData] = useState<EditPatientFormData>({
    name: '',
    cpf: '',
    phone: '',
    address: '',
    birthDate: '',
    condition: '',
    phase: 1,
    status: 'IN_PROGRESS',
    password: '',
  });

  const [videoForm, setVideoForm] = useState({ title: '', videoUrl: '', phase: 1 });
  const [exerciseForm, setExerciseForm] = useState({ title: '', description: '', phase: 1 });

  const token = useMemo(() => getUser()?.token ?? '', []);

  const formatDateForInput = (date: string) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

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

  const downloadReport = async () => {
    if (!patientId) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/patient/${patientId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let message = 'Erro ao gerar relatório.';

        try {
          const result = await response.json();
          message = result.message || message;
        } catch {
          message = 'Erro ao gerar relatório.';
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] ?? `relatorio-paciente-${patientId}.docx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
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

  const openEditModal = () => {
    if (!data) return;

    setEditFormData({
      name: data.patient.user.name,
      cpf: data.patient.cpf,
      phone: data.patient.phone,
      address: data.patient.address,
      birthDate: formatDateForInput(data.patient.birthDate),
      condition: data.patient.condition,
      phase: data.patient.phase,
      status: data.patient.status,
      password: '',
    });
    setEditError('');
    setShowEditPassword(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditError('');
    setShowEditPassword(false);
    setEditFormData({
      name: '',
      cpf: '',
      phone: '',
      address: '',
      birthDate: '',
      condition: '',
      phase: 1,
      status: 'IN_PROGRESS',
      password: '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setEditFormData((prev) => ({
      ...prev,
      [name]: name === 'phase' ? Number(value) : value,
    }));
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    setEditError('');
    setIsEditing(true);

    try {
      const { password, ...baseData } = editFormData;
      const editPayload = password.trim() ? { ...baseData, password } : baseData;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editPayload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao atualizar paciente.');

      closeEditModal();
      await refreshDashboard();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar paciente.');
    } finally {
      setIsEditing(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteError('');
  };

  const handleDeletePatient = async () => {
    if (!patientId) return;

    setDeleteError('');
    setIsDeleting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${patientId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Erro ao excluir paciente.');

      closeDeleteModal();
      router.push('/dashboard');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir paciente.');
    } finally {
      setIsDeleting(false);
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

  const formatPatientInfo = (value: string | null | undefined) => {
    const normalized = value?.trim();
    return normalized ? normalized : 'Nao informado';
  };

  return (
    <main className="min-h-screen bg-[#E5F5FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#CBE9FB] shadow-lg flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
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
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#CBE9FB] bg-white px-4 py-2.5 text-sm font-semibold text-[#096196] transition-all hover:bg-[#E5F5FF] sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
                </svg>
                Acoes do Perfil
                <svg
                  className={`w-4 h-4 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isActionsMenuOpen ? (
                <div className="mt-2 w-full rounded-xl border border-[#DCEFFC] bg-white p-2 shadow-lg sm:absolute sm:right-0 sm:z-20 sm:mt-3 sm:w-72">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsDetailsOpen(true);
                      }}
                      className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#096196] transition-all hover:bg-[#E5F5FF]"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12c0 1.38-4.03 6-9 6s-9-4.62-9-6 4.03-6 9-6 9 4.62 9 6z" />
                      </svg>
                      Detalhes do Paciente
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        void downloadReport();
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#096196] transition-all hover:bg-[#E5F5FF] disabled:opacity-60"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" />
                      </svg>
                      Baixar Relatorio
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        openEditModal();
                      }}
                      className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-green-600 transition-all hover:bg-green-50"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L12 14l-4 1 1-4 8.414-8.414z" />
                      </svg>
                      Editar Paciente
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        openDeleteModal();
                      }}
                      className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir Paciente
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-[#096196] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#0B78B7] hover:shadow-lg"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-[#CBE9FB] shadow-sm">
            <p className="text-sm text-[#3A6C89]">Dor (EVA)</p>
            <p className="text-2xl font-bold text-[#096196] mt-1">
              {data.summary.latestPainLevel ?? '--'}
            </p>
            <p className="text-xs text-[#3A6C89] mt-2">
              {data.summary.latestPainAt
                ? `Ultimo registro: ${new Date(data.summary.latestPainAt).toLocaleString('pt-BR')}`
                : 'Nenhum registro de dor ainda.'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[#CBE9FB] shadow-sm">
            <p className="text-sm text-[#3A6C89]">Exercícios Concluídos</p>
            <p className="text-2xl font-bold text-[#096196] mt-1">
              {data.summary.completedExercises}/{data.summary.totalExercises}
            </p>
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
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        exercise.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {exercise.completed ? 'Concluído' : 'Não concluído'}
                      </span>
                      {exercise.lastCheckAt ? (
                        <span className="text-xs text-[#3A6C89]">
                          Última atualização: {new Date(exercise.lastCheckAt).toLocaleString('pt-BR')}
                        </span>
                      ) : null}
                    </div>
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
          <h2 className="text-lg font-bold text-[#096196] mb-4">Historico de Dor (EVA)</h2>
          {data.sessions.length === 0 ? (
            <p className="text-[#3A6C89]">Nenhum registro de dor ainda.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-auto">
              {data.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-[#D6EEFC] bg-[#F3FAFF] p-4"
                >
                  <div>
                    <p className="font-semibold text-[#096196]">
                      {new Date(session.date).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-[#3A6C89]">Registro informado pelo paciente</p>
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

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#CBE9FB] bg-white p-8">
            <h2 className="text-2xl font-bold text-[#096196] mb-6">Editar Paciente</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {editError}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                  placeholder="Nome do paciente"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                    CPF *
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={editFormData.cpf}
                    onChange={handleEditChange}
                    required
                    className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditChange}
                    required
                    className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                    placeholder="(27) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={editFormData.birthDate}
                    onChange={handleEditChange}
                    required
                    className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Endereco *
                </label>
                <input
                  type="text"
                  name="address"
                  value={editFormData.address}
                  onChange={handleEditChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                  placeholder="Rua, numero, bairro, cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Condicao *
                </label>
                <input
                  type="text"
                  name="condition"
                  value={editFormData.condition}
                  onChange={handleEditChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Fase do Tratamento *
                </label>
                <select
                  name="phase"
                  value={editFormData.phase}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                >
                  <option value={1}>Fase 1</option>
                  <option value={2}>Fase 2</option>
                  <option value={3}>Fase 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Status do Paciente *
                </label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                >
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="COMPLETED">Finalizado</option>
                  <option value="DEMITIDO">Demitido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditChange}
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                    placeholder="Digite para alterar a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 text-[#3A6C89] hover:text-[#096196] transition-colors"
                    title={showEditPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showEditPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.956 9.956 0 012.042-3.368m2.144-1.982A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.965 9.965 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 10L3 2" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#3A6C89] mt-1">
                  Por seguranca, a senha atual nao pode ser exibida. Deixe em branco para manter a senha existente.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 bg-[#E5F5FF] text-[#096196] py-3 px-4 rounded-xl font-semibold hover:bg-[#D8EFFD] transition-colors"
                  disabled={isEditing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#096196] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#0B78B7] hover:shadow-lg transition-all disabled:opacity-50"
                  disabled={isEditing}
                >
                  {isEditing ? 'Salvando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#CBE9FB] bg-white p-8">
            <h2 className="text-2xl font-bold text-[#096196] mb-3">Confirmar Exclusao</h2>
            <p className="text-[#3A6C89] mb-6">
              Tem certeza que deseja excluir o paciente{' '}
              <span className="font-semibold text-[#096196]">{data.patient.user.name}</span>?
            </p>

            {deleteError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {deleteError}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 bg-[#E5F5FF] text-[#096196] py-3 px-4 rounded-xl font-semibold hover:bg-[#D8EFFD] transition-colors"
                disabled={isDeleting}
              >
                Nao
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDetailsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[#CBE9FB] bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-[#E5F2FB] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#096196]">Detalhes do Paciente</h2>
                <p className="mt-1 text-sm text-[#3A6C89]">
                  Informacoes completas do cadastro do paciente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg bg-[#096196] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0B78B7]"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Nome</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {formatPatientInfo(data.patient.user.name)}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Login</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {formatPatientInfo(data.patient.user.loginCode)}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">CPF</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {formatPatientInfo(data.patient.cpf)}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Telefone</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {formatPatientInfo(data.patient.phone)}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Data de Nascimento</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {data.patient.birthDate
                    ? new Date(data.patient.birthDate).toLocaleDateString('pt-BR')
                    : 'Nao informado'}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Idade</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {Number.isFinite(data.patient.age) ? `${data.patient.age} anos` : 'Nao informado'}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Condicao</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {formatPatientInfo(data.patient.condition)}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Status</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {patientStatusMeta[data.patient.status].label}
                </p>
              </div>

              <div className="rounded-xl border border-[#DCEFFC] bg-[#F8FCFF] p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3A6C89]">Endereco</p>
                <p className="mt-2 text-base font-bold text-[#096196]">
                  {formatPatientInfo(data.patient.address)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PhysioChatWidget initialPatientId={patientId} />
    </main>
  );
}
