'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getPatientFromStorage() {
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
    return user as { name: string; role: string };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

export default function PatientDashboardPage() {
  const router = useRouter();
  const [patientUser] = useState<{ name: string; role: string } | null>(getPatientFromStorage);

  useEffect(() => {
    if (!patientUser) {
      router.push('/patient');
    }
  }, [patientUser, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/patient');
  };

  if (!patientUser) {
    return (
      <main className="min-h-screen bg-[#E5F5FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#096196] mx-auto"></div>
          <p className="mt-4 text-[#3A6C89]">Carregando...</p>
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
            Olá, {patientUser.name}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#3A6C89]">
            Bem-vindo(a)! Este é o seu dashboard inicial.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            Sair
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Checklist Diário</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">Em breve</p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Escala de Dor (EVA)</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">Em breve</p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#CBE9FB]">
            <p className="text-sm text-[#3A6C89]">Exercícios</p>
            <p className="mt-2 text-2xl font-bold text-[#096196]">Em breve</p>
          </div>
        </div>
      </div>
    </main>
  );
}
