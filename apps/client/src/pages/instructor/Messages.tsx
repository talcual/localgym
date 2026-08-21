import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { messagesApi } from '../../api';
import type { Message, MessageThread } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTo = searchParams.get('to') ?? '';
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(initialTo || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refreshThreads = useCallback(async () => {
    const t = await messagesApi.threads();
    setThreads(t);
  }, []);

  const loadConversation = useCallback(async (userId: string) => {
    const list = await messagesApi.withUser(userId);
    setMessages(list);
    await messagesApi.markRead(userId).catch(() => undefined);
    await refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    (async () => {
      try {
        await refreshThreads();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshThreads]);

  useEffect(() => {
    if (activeUserId) loadConversation(activeUserId);
  }, [activeUserId, loadConversation]);

  // Polling básico cada 15s para refrescar hilos y conversación activa.
  useEffect(() => {
    const id = window.setInterval(async () => {
      await refreshThreads();
      if (activeUserId) {
        const list = await messagesApi.withUser(activeUserId);
        setMessages(list);
      }
    }, 15_000);
    return () => window.clearInterval(id);
  }, [activeUserId, refreshThreads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!activeUserId || !body.trim()) return;
    const text = body.trim();
    setBody('');
    const optimistic: Message = {
      id: 'tmp-' + Date.now(),
      senderId: user?.id ?? '',
      recipientId: activeUserId,
      body: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await messagesApi.send(activeUserId, text);
      await loadConversation(activeUserId);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    }
  }

  if (loading) return <div className="text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Mensajes
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Conversa con tus clientes o tu instructor.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-slate-800/80 bg-[#0d1526] p-2">
          {threads.length === 0 ? (
            <p className="p-3 text-xs text-slate-500">Sin conversaciones.</p>
          ) : (
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.userId}>
                  <button
                    type="button"
                    onClick={() => setActiveUserId(t.userId)}
                    className={
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ' +
                      (activeUserId === t.userId
                        ? 'bg-violet-600/20 text-white'
                        : 'hover:bg-slate-800/60')
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {t.displayName}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {t.lastMessage.body.slice(0, 40)}
                      </span>
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
                        {t.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex h-[70vh] flex-col rounded-xl border border-slate-800/80 bg-[#0d1526]">
          {!activeUserId ? (
            <div className="m-auto text-slate-400">Selecciona una conversación.</div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={
                        'flex ' + (mine ? 'justify-end' : 'justify-start')
                      }
                    >
                      <div
                        className={
                          'max-w-[75%] rounded-2xl px-3 py-2 text-sm ' +
                          (mine
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-800 text-slate-100')
                        }
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.body}
                        </div>
                        <div className="mt-1 text-right text-[10px] opacity-70">
                          {new Date(m.createdAt).toLocaleString('es', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2 border-t border-slate-800 p-3"
              >
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!body.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-sm hover:bg-violet-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}