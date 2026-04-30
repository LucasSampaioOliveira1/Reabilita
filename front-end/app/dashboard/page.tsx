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
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Estrutura inicial do painel profissional
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Esta pagina reserva o espaco para metricas de adesao, evolucao de dor
          e gerenciamento de pacientes, mantendo a separacao por dominio desde o
          inicio.
        </p>
      </div>
    </main>
  );
}
