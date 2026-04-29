import Link from "next/link";

export default function RecoverPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 animate-fadeInUp">
      <div className="w-full max-w-md">
        {/* Card principal com gradiente */}
        <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 overflow-hidden">
          {/* Elemento decorativo com gradiente */}
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary to-accent"></div>

          {/* Header com logo/branding */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-primary to-secondary rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Recuperar Senha
            </h1>
            <p className="text-sm text-gray-600 font-medium">Plataforma de Teleassistência</p>
            <p className="text-xs text-gray-500 mt-1">Acesso Profissional</p>
          </div>

          {/* Formulário de recuperação */}
          <form className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700"
              >
                E-mail Profissional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Botão de recuperação com gradiente */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-linear-to-r from-primary to-secondary text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span className="flex items-center justify-center">
                  Enviar link de recuperação
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </form>

          {/* Links de ajuda */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-gray-600">
              Lembrou sua senha?{" "}
              <Link
                href="/"
                className="font-semibold text-primary hover:text-secondary transition-colors"
              >
                Voltar ao login
              </Link>
            </p>
            <p className="text-xs text-gray-500 pt-2">
              Para profissionais de saúde credenciados
            </p>
          </div>
        </div>

        {/* Elementos decorativos adicionais */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span>Teleassistência fisioterapêutica</span>
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
