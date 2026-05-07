'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getUserFromStorage() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) return null;

  try {
    const userData = JSON.parse(userStr);
    if (userData.role !== 'physio') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return userData;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

interface Patient {
  id: string;
  cpf: string;
  address: string;
  birthDate: string;
  age: number;
  condition: string;
  phase: number;
  user: {
    name: string;
    loginCode: string;
  };
}

interface CreatePatientFormData {
  name: string;
  cpf: string;
  address: string;
  birthDate: string;
  password: string;
  condition: string;
}

interface EditPatientFormData {
  name: string;
  cpf: string;
  address: string;
  birthDate: string;
  condition: string;
  phase: number;
  password: string;
}

interface DeletePatientTarget {
  id: string;
  name: string;
}

type PatientFilterField = 'name' | 'login' | 'cpf';

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState<{ name: string; role: string } | null>(getUserFromStorage);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [deletePatientTarget, setDeletePatientTarget] = useState<DeletePatientTarget | null>(null);
  const [filterField, setFilterField] = useState<PatientFilterField>('name');
  const [filterValue, setFilterValue] = useState('');
  const [createdLoginCode, setCreatedLoginCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePatientFormData>({
    name: '',
    cpf: '',
    address: '',
    birthDate: '',
    password: '',
    condition: 'Fratura de Rádio Distal'
  });
  const [editFormData, setEditFormData] = useState<EditPatientFormData>({
    name: '',
    cpf: '',
    address: '',
    birthDate: '',
    condition: '',
    phase: 1,
    password: ''
  });
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const loadPatients = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }
      } catch (err) {
        console.error('Erro ao carregar pacientes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar paciente');
      }

      setCreatedLoginCode(data.loginCode);
      setFormData({
        name: '',
        cpf: '',
        address: '',
        birthDate: '',
        password: '',
        condition: 'Fratura de Rádio Distal'
      });
      fetchPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar paciente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const formatDateForInput = (date: string) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const openDeleteModal = (patient: Patient) => {
    setDeletePatientTarget({
      id: patient.id,
      name: patient.user.name
    });
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePatientTarget(null);
    setDeleteError('');
  };

  const handleDeletePatient = async () => {
    if (!deletePatientTarget) return;

    setDeleteError('');
    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${deletePatientTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao excluir paciente');
      }

      closeDeleteModal();
      fetchPatients();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir paciente');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setEditFormData({
      name: patient.user.name,
      cpf: patient.cpf,
      address: patient.address,
      birthDate: formatDateForInput(patient.birthDate),
      condition: patient.condition,
      phase: patient.phase,
      password: ''
    });
    setEditError('');
    setShowEditPassword(false);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPatientId(null);
    setEditError('');
    setEditFormData({
      name: '',
      cpf: '',
      address: '',
      birthDate: '',
      condition: '',
      phase: 1,
      password: ''
    });
    setShowEditPassword(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: name === 'phase' ? Number(value) : value
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatientId) return;

    setEditError('');
    setIsEditing(true);

    try {
      const token = localStorage.getItem('token');
      const { password, ...baseData } = editFormData;
      const editPayload = password.trim()
        ? { ...baseData, password }
        : baseData;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${editingPatientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar paciente');
      }

      closeEditModal();
      fetchPatients();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar paciente');
    } finally {
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const closeModal = () => {
    setShowModal(false);
    setCreatedLoginCode(null);
    setError('');
    setFormData({
      name: '',
      cpf: '',
      address: '',
      birthDate: '',
      password: '',
      condition: 'Fratura de Rádio Distal'
    });
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      { bg: 'bg-[#D8EFFD]', text: 'text-[#096196]' },
      { bg: 'bg-[#CBE9FB]', text: 'text-[#0A6EA9]' },
      { bg: 'bg-[#E5F5FF]', text: 'text-[#096196]' },
      { bg: 'bg-[#DFF2FE]', text: 'text-[#0B78B7]' },
    ];
    return colors[index % colors.length];
  };

  const totalPatients = patients.length;
  const inProgressPatients = patients.filter(p => p.phase < 3).length;
  const completedPatients = patients.filter(p => p.phase >= 3).length;
  const normalizedFilterValue = filterValue.trim().toLowerCase();
  const normalizedCpfFilter = filterValue.replace(/\D/g, '');
  const filteredPatients = patients.filter((patient) => {
    if (!normalizedFilterValue) {
      return true;
    }

    if (filterField === 'name') {
      return patient.user.name.toLowerCase().includes(normalizedFilterValue);
    }

    if (filterField === 'login') {
      return patient.user.loginCode.toLowerCase().includes(normalizedFilterValue);
    }

    if (!normalizedCpfFilter) {
      return false;
    }

    return patient.cpf.replace(/\D/g, '').includes(normalizedCpfFilter);
  });

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#E5F5FF]">
      <header className="bg-white shadow-sm border-b border-[#CBE9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-6 gap-4 sm:gap-0">
            <div className="flex items-center w-full sm:w-auto justify-center sm:justify-start">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-linear-to-br from-[#096196] to-[#0B78B7] rounded-xl shadow-lg shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-[#096196] leading-none">Reabilita Serra</h1>
                <p className="text-sm text-[#3A6C89] mt-1">Painel do Fisioterapeuta</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 sm:space-x-6 w-full sm:w-auto justify-between sm:justify-end mt-4 sm:mt-0">
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#096196] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0B78B7] hover:shadow-lg transition-all duration-200 shrink-0 text-sm sm:text-base"
              >
                Cadastrar Paciente
              </button>

              <div className="flex items-center space-x-3 sm:space-x-4 border-l border-[#CBE9FB] pl-4 sm:pl-6 shrink-0">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-[#096196] leading-none">{user.name}</p>
                  <p className="text-xs text-[#3A6C89] mt-1">Fisioterapeuta</p>
                </div>
                <div className="w-10 h-10 bg-[#E5F5FF] text-[#096196] font-bold flex items-center justify-center rounded-full shrink-0">
                  {getInitials(user.name)}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200 shrink-0"
                  title="Sair da conta"
                >
                  <span>Sair</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#3A6C89]">Total de Pacientes</p>
                <p className="text-3xl font-bold text-[#096196]">{totalPatients}</p>
                <p className="text-sm text-[#0B78B7] mt-1">Cadastrados</p>
              </div>
              <div className="w-12 h-12 bg-[#E5F5FF] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#096196]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#3A6C89]">Em Andamento</p>
                <p className="text-3xl font-bold text-[#096196]">{inProgressPatients}</p>
                <p className="text-sm text-[#0B78B7] mt-1">
                  {totalPatients > 0 ? Math.round((inProgressPatients / totalPatients) * 100) : 0}% do total
                </p>
              </div>
              <div className="w-12 h-12 bg-[#E5F5FF] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#096196]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#CBE9FB]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#3A6C89]">Concluídos</p>
                <p className="text-3xl font-bold text-[#096196]">{completedPatients}</p>
                <p className="text-sm text-[#0B78B7] mt-1">
                  {totalPatients > 0 ? Math.round((completedPatients / totalPatients) * 100) : 0}% do total
                </p>
              </div>
              <div className="w-12 h-12 bg-[#E5F5FF] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#096196]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#CBE9FB]">
          <div className="px-6 py-4 border-b border-[#CBE9FB]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#096196]">Pacientes Ativos</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value as PatientFilterField)}
                  className="px-3 py-2 border border-[#CBE9FB] rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                >
                  <option value="name">Filtrar por Nome</option>
                  <option value="login">Filtrar por Login</option>
                  <option value="cpf">Filtrar por CPF</option>
                </select>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={
                    filterField === 'name'
                      ? 'Buscar paciente por nome'
                      : filterField === 'login'
                        ? 'Buscar paciente por login'
                        : 'Buscar paciente por CPF'
                  }
                  className="w-full sm:w-72 px-3 py-2 border border-[#CBE9FB] rounded-lg text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                />
              </div>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#096196] mx-auto"></div>
                <p className="mt-4 text-[#3A6C89]">Carregando pacientes...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#3A6C89]">Nenhum paciente cadastrado ainda.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 px-4 py-2 bg-[#096196] text-white rounded-lg hover:bg-[#0B78B7] hover:shadow-lg transition-all text-sm font-semibold"
                >
                  Cadastrar Primeiro Paciente
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[#3A6C89]">
                      Nenhum paciente encontrado para este filtro.
                    </p>
                  </div>
                ) : filteredPatients.map((patient, index) => {
                  const avatarColor = getAvatarColor(index);
                  const initials = getInitials(patient.user.name);

                  return (
                    <div key={patient.id} className="p-4 bg-[#F3FAFF] rounded-xl hover:bg-[#EAF6FF] transition-colors border border-[#D6EEFC]">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4 min-w-50">
                          <div className={`w-12 h-12 ${avatarColor.bg} rounded-full flex items-center justify-center shrink-0`}>
                            <span className={`${avatarColor.text} font-semibold`}>{initials}</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-[#096196]">{patient.user.name}</h3>
                            <p className="text-sm text-[#3A6C89]">{patient.condition} • Fase {patient.phase}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-[#CBE9FB] shadow-sm flex items-center gap-2" title="Código de Login">
                            <span className="text-[#3A6C89]">Login:</span>
                            <span className="font-semibold text-[#096196] font-mono">{patient.user.loginCode}</span>
                          </div>
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-[#CBE9FB] shadow-sm flex items-center gap-2" title="Idade">
                            <span className="text-[#3A6C89]">Idade:</span>
                            <span className="font-semibold text-[#096196]">{patient.age} anos</span>
                          </div>
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-[#CBE9FB] shadow-sm flex items-center gap-2" title="CPF">
                            <span className="text-[#3A6C89]">CPF:</span>
                            <span className="font-semibold text-[#096196]">{patient.cpf}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 sm:justify-end">
                          <button className="p-2 bg-white border border-[#CBE9FB] text-[#096196] hover:bg-[#096196] hover:text-white shadow-sm rounded-lg transition-all" title="Ver Perfil">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal(patient)}
                            className="p-2 bg-white border border-green-200 text-green-600 hover:bg-green-600 hover:text-white shadow-sm rounded-lg transition-all"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(patient)}
                            className="p-2 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white shadow-sm rounded-lg transition-all"
                            title="Excluir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#CBE9FB] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {createdLoginCode ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-[#E5F5FF] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#096196]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-[#096196] mb-2">Paciente Cadastrado!</h3>
                  <p className="text-[#3A6C89]">O código de login foi gerado com sucesso.</p>
                </div>

                <div className="bg-[#E5F5FF] border-2 border-[#CBE9FB] rounded-xl p-6 mb-6">
                  <p className="text-sm text-[#3A6C89] mb-2">Código de Login:</p>
                  <p className="text-4xl font-bold text-[#096196] font-mono tracking-wider">{createdLoginCode}</p>
                  <p className="text-sm text-[#3A6C89] mt-3">Anote este código. O paciente usará para fazer login.</p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full bg-[#096196] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#0B78B7] hover:shadow-lg transition-all"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-[#096196] mb-6">Cadastrar Novo Paciente</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                      placeholder="Nome do paciente"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                        CPF *
                      </label>
                      <input
                        type="text"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                        Data de Nascimento *
                      </label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                      Endereço *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                      Condição *
                    </label>
                    <input
                      type="text"
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#096196]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                      Senha de Acesso *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <p className="text-xs text-[#3A6C89] mt-1">
                      Esta senha será usada junto com o código de login gerado.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-[#E5F5FF] text-[#096196] py-3 px-4 rounded-xl font-semibold hover:bg-[#D8EFFD] transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#096196] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#0B78B7] hover:shadow-lg transition-all disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Cadastrando...' : 'Cadastrar Paciente'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#CBE9FB] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-[#096196] mb-6">Editar Paciente</h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {editError}
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-4">
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
                  Endereço *
                </label>
                <input
                  type="text"
                  name="address"
                  value={editFormData.address}
                  onChange={handleEditChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBE9FB] rounded-xl text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A6C89] mb-2">
                  Condição *
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
                  Por segurança, a senha atual não pode ser exibida. Deixe em branco para manter a senha existente.
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
                  {isEditing ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#CBE9FB] rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-[#096196] mb-3">Confirmar Exclusão</h3>
            <p className="text-[#3A6C89] mb-6">
              Tem certeza que deseja excluir o paciente{' '}
              <span className="font-semibold text-[#096196]">{deletePatientTarget?.name}</span>?
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 bg-[#E5F5FF] text-[#096196] py-3 px-4 rounded-xl font-semibold hover:bg-[#D8EFFD] transition-colors"
                disabled={isDeleting}
              >
                Não
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
      )}
    </main>
  );
}
