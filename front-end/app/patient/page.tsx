'use client';

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
    return user;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

export default function PatientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    loginCode: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const user = getPatientFromStorage();
    if (user?.role === 'patient') {
      router.push('/patient/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.loginCode.trim()) {
      setError('Informe o token de login.');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/patient-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginCode: formData.loginCode,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login do paciente');
      }

      if (data.user?.role !== 'patient') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Esta área é exclusiva para pacientes.');
      }

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/patient/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6 animate-fadeInUp">
      <div className="w-full max-w-md">
        <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary to-accent"></div>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-primary to-secondary rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Login do Paciente
            </h1>
            <p className="text-sm text-gray-600 font-medium">Acesso com token e senha</p>
            <p className="text-xs text-gray-500 mt-1">Área exclusiva para pacientes</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="loginCode"
                className="block text-sm font-semibold text-gray-700"
              >
                Token de Login
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v2a3 3 0 006 0v-2c0-1.657-1.343-3-3-3zm0 0V6m0 12v-2m-6-3H4m16 0h-2" />
                  </svg>
                </div>
                <input
                  id="loginCode"
                  name="loginCode"
                  type="text"
                  required
                  value={formData.loginCode}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white"
                  placeholder="Ex: 123456"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700"
              >
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary transition-colors"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.965 9.965 0 012.184-3.592M6.223 6.223A9.964 9.964 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 9L3 3" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.522 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-linear-to-r from-primary to-secondary text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center">
                  {isLoading ? 'Entrando...' : 'Entrar como Paciente'}
                  {!isLoading && (
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-xs text-gray-500 pt-2">
              Teleassistência fisioterapêutica
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
