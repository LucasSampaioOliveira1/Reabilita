'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ChatListItem = {
  patientId: string;
  patientName: string;
  loginCode: string | null;
  condition: string;
  phase: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'DEMITIDO';
  latestMessage: {
    note: string;
    createdAt: string;
    author: {
      name: string;
      role: string;
    };
  } | null;
};

type ChatConversation = {
  patient: {
    id: string;
    name: string;
    loginCode: string | null;
    condition: string;
    phase: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'DEMITIDO';
  };
  interactions: Array<{
    id: string;
    note: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      role: string;
    };
  }>;
};

type PhysioAuth = {
  token: string;
  user: {
    name: string;
    role: string;
  };
};

type PhysioChatWidgetProps = {
  initialPatientId?: string;
};

const CHAT_OPEN_STORAGE_KEY = 'physio-chat:is-open';
const CHAT_PATIENT_STORAGE_KEY = 'physio-chat:selected-patient';

function getPhysioAuth(): PhysioAuth | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) return null;

  try {
    const user = JSON.parse(userStr) as { name: string; role: string };
    if (user.role !== 'physio') {
      return null;
    }

    return { token, user };
  } catch {
    return null;
  }
}

function getStoredChatOpenState() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CHAT_OPEN_STORAGE_KEY) === 'true';
}

function getStoredSelectedPatientId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CHAT_PATIENT_STORAGE_KEY);
}

function getStatusLabel(status: ChatListItem['status']) {
  if (status === 'COMPLETED') return 'Finalizado';
  if (status === 'DEMITIDO') return 'Demitido';
  return 'Em andamento';
}

export default function PhysioChatWidget({
  initialPatientId,
}: PhysioChatWidgetProps) {
  const [auth] = useState(getPhysioAuth);
  const [isOpen, setIsOpen] = useState(getStoredChatOpenState);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    getStoredSelectedPatientId,
  );
  const [searchValue, setSearchValue] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [isLoadingChatList, setIsLoadingChatList] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const loadChatList = useCallback(async () => {
    if (!auth) return;

    setIsLoadingChatList(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/physio/chats`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao carregar conversas.');
      }

      setChatList(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar conversas.',
      );
    } finally {
      setIsLoadingChatList(false);
    }
  }, [auth]);

  const loadConversation = useCallback(
    async (patientId: string) => {
      if (!auth) return;

      setIsLoadingConversation(true);
      setError('');

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/physio/chats/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Erro ao carregar conversa.');
        }

        setConversation(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar conversa.',
        );
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [auth],
  );

  useEffect(() => {
    if (!auth) return;
    const timeoutId = window.setTimeout(() => {
      void loadChatList();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [auth, loadChatList]);

  const effectiveSelectedPatientId = useMemo(() => {
    if (!chatList.length) {
      return null;
    }

    const chatIds = new Set(chatList.map((chat) => chat.patientId));

    if (selectedPatientId && chatIds.has(selectedPatientId)) {
      return selectedPatientId;
    }

    if (initialPatientId && chatIds.has(initialPatientId)) {
      return initialPatientId;
    }

    return chatList[0]?.patientId ?? null;
  }, [chatList, initialPatientId, selectedPatientId]);

  useEffect(() => {
    if (!effectiveSelectedPatientId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadConversation(effectiveSelectedPatientId);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [effectiveSelectedPatientId, loadConversation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CHAT_OPEN_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (effectiveSelectedPatientId) {
      localStorage.setItem(CHAT_PATIENT_STORAGE_KEY, effectiveSelectedPatientId);
    } else {
      localStorage.removeItem(CHAT_PATIENT_STORAGE_KEY);
    }
  }, [effectiveSelectedPatientId]);

  useEffect(() => {
    if (!isOpen || !messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop =
      messagesContainerRef.current.scrollHeight;
  }, [isOpen, conversation?.interactions.length]);

  const filteredChats = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return chatList;
    }

    return chatList.filter((chat) => {
      return (
        chat.patientName.toLowerCase().includes(normalizedSearch) ||
        (chat.loginCode ?? '').toLowerCase().includes(normalizedSearch) ||
        chat.condition.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [chatList, searchValue]);

  const activeConversation =
    conversation && conversation.patient.id === effectiveSelectedPatientId
      ? conversation
      : null;

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setConversation(null);
    setIsOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !effectiveSelectedPatientId || !message.trim()) return;

    setIsSendingMessage(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/patient-dashboard/physio/chats/${effectiveSelectedPatientId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            note: message.trim(),
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao enviar mensagem.');
      }

      setMessage('');
      setConversation((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          interactions: [...prev.interactions, result],
        };
      });

      await loadChatList();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao enviar mensagem.',
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (!auth) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] max-w-5xl overflow-hidden rounded-3xl border border-[#CBE9FB] bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 bg-[#096196] px-5 py-4 text-white">
            <div>
              <p className="text-lg font-bold">Chat com Pacientes</p>
              <p className="text-xs text-white/80 mt-1">
                Converse com qualquer paciente em um so lugar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Fechar
            </button>
          </div>

          <div className="grid h-[calc(100vh-7rem)] max-h-152 min-h-96 grid-cols-1 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-b border-[#CBE9FB] bg-[#F8FCFF] lg:border-b-0 lg:border-r">
              <div className="border-b border-[#CBE9FB] p-4">
                <input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="w-full rounded-xl border border-[#CBE9FB] px-4 py-3 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196]"
                  placeholder="Buscar paciente por nome, login ou condicao"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoadingChatList ? (
                  <div className="p-4 text-sm text-[#3A6C89]">
                    Carregando pacientes...
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-4 text-sm text-[#3A6C89]">
                    Nenhum paciente encontrado para essa busca.
                  </div>
                ) : (
                  filteredChats.map((chat) => {
                    const isSelected = chat.patientId === effectiveSelectedPatientId;

                    return (
                      <button
                        key={chat.patientId}
                        type="button"
                        onClick={() => handleSelectPatient(chat.patientId)}
                        className={`w-full border-b border-[#E3F2FC] px-4 py-4 text-left transition-colors ${
                          isSelected ? 'bg-[#E5F5FF]' : 'hover:bg-[#F1F9FF]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#096196]">
                              {chat.patientName}
                            </p>
                            <p className="mt-1 text-xs text-[#3A6C89]">
                              {chat.condition} • Fase {chat.phase}
                            </p>
                            <p className="mt-1 text-[11px] font-semibold text-[#3A6C89]">
                              {getStatusLabel(chat.status)}
                              {chat.loginCode ? ` • Login ${chat.loginCode}` : ''}
                            </p>
                          </div>
                          {chat.latestMessage ? (
                            <span className="shrink-0 text-[11px] text-[#3A6C89]">
                              {new Date(chat.latestMessage.createdAt).toLocaleDateString(
                                'pt-BR',
                              )}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 truncate text-xs text-[#3A6C89]">
                          {chat.latestMessage
                            ? chat.latestMessage.note
                            : 'Nenhuma mensagem ainda.'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col overflow-hidden bg-white">
              <div className="border-b border-[#CBE9FB] px-5 py-4">
                {activeConversation ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#096196]">
                        {activeConversation.patient.name}
                      </h3>
                      <p className="text-sm text-[#3A6C89]">
                        {activeConversation.patient.condition} • Fase {activeConversation.patient.phase}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[#3A6C89]">
                      <p>{getStatusLabel(activeConversation.patient.status)}</p>
                      {activeConversation.patient.loginCode ? (
                        <p>Login: {activeConversation.patient.loginCode}</p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-[#096196]">
                      Selecione um paciente
                    </h3>
                    <p className="text-sm text-[#3A6C89] mt-1">
                      Escolha um paciente na lista para visualizar a conversa.
                    </p>
                  </div>
                )}
              </div>

              <div
                ref={messagesContainerRef}
                className="min-h-0 flex-1 overflow-y-auto bg-[#F8FCFF] px-5 py-4"
              >
                {isLoadingConversation ? (
                  <div className="text-sm text-[#3A6C89]">
                    Carregando conversa...
                  </div>
                ) : !activeConversation ? (
                  <div className="rounded-2xl border border-[#D6EEFC] bg-white p-4 text-sm text-[#3A6C89]">
                    Nenhuma conversa selecionada.
                  </div>
                ) : activeConversation.interactions.length === 0 ? (
                  <div className="rounded-2xl border border-[#D6EEFC] bg-white p-4 text-sm text-[#3A6C89]">
                    Nenhuma mensagem ainda. Inicie a conversa com este paciente.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeConversation.interactions.map((interaction) => {
                      const isPhysioMessage = interaction.author.role === 'physio';

                      return (
                        <div
                          key={interaction.id}
                          className={`flex ${
                            isPhysioMessage ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm ${
                              isPhysioMessage
                                ? 'border-[#CBE9FB] bg-[#E5F5FF] text-[#096196]'
                                : 'border-[#D6EEFC] bg-white text-[#096196]'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap wrap-break-word">
                              {interaction.note}
                            </p>
                            <p className="mt-2 text-[11px] text-[#3A6C89]">
                              {interaction.author.name} (
                              {interaction.author.role === 'physio'
                                ? 'Fisioterapeuta'
                                : 'Paciente'}
                              ) •{' '}
                              {new Date(interaction.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-[#CBE9FB] bg-white p-4">
                {error ? (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                <form onSubmit={handleSendMessage} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={!effectiveSelectedPatientId}
                    className="flex-1 rounded-xl border border-[#CBE9FB] px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#096196] disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder={
                      effectiveSelectedPatientId
                        ? 'Digite sua mensagem para o paciente'
                        : 'Selecione um paciente para conversar'
                    }
                  />
                  <button
                    type="submit"
                    disabled={
                      isSendingMessage || !message.trim() || !effectiveSelectedPatientId
                    }
                    className="rounded-xl bg-[#096196] px-5 py-3 font-semibold text-white hover:bg-[#0B78B7] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingMessage ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-3 rounded-full bg-[#096196] px-5 py-4 text-white shadow-2xl transition-all hover:bg-[#0B78B7]"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </span>
        <span className="font-semibold">
          {isOpen ? 'Ocultar Chat' : 'Chat com Pacientes'}
        </span>
      </button>
    </div>
  );
}
