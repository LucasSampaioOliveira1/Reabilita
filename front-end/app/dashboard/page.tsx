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

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState<{ name: string; role: string } | null>(getUserFromStorage);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-700 mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              Bem-vindo, {user.name}!
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            Sair
          </button>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            Estrutura inicial do painel profissional
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Esta página reserva o espaço para métricas de adesão, evolução de dor
            e gerenciamento de pacientes, mantendo a separação por domínio desde o
            início.
          </p>
          <div className="mt-6 p-4 bg-sky-50 rounded-lg border border-sky-200">
            <p className="text-sm text-sky-800">
              ✓ Acesso autorizado para fisioterapeutas
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
