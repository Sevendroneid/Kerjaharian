import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface ChatRoomProps {
  orderId: string;
  currentUserId: string;
}

const MAX_MESSAGE_LENGTH = 2000;

export function ChatRoom({ orderId, currentUserId }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id, order_id, sender_id, message, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (loadError) {
      setError('Pesan tidak dapat dimuat. Silakan coba lagi.');
    } else {
      setMessages((data ?? []) as ChatMessage[]);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    let active = true;

    void loadMessages();

    const channel = supabase
      .channel(`order-chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (!active) return;
          const incoming = payload.new as ChatMessage;
          if (!incoming?.id) return;
          setMessages((prev) => {
            if (prev.some((message) => message.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Koneksi chat terputus. Pesan akan dimuat ulang saat tersedia.');
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [loadMessages, orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || sending || !currentUserId || !orderId) return;

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Pesan terlalu panjang. Maksimal ${MAX_MESSAGE_LENGTH} karakter.`);
      return;
    }

    setSending(true);
    setError(null);

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        order_id: orderId,
        sender_id: currentUserId,
        message,
      })
      .select('id, order_id, sender_id, message, created_at')
      .single();

    if (sendError) {
      setError('Gagal mengirim pesan. Pastikan Anda masih terhubung ke pesanan ini.');
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((item) => item.id === data.id)) return prev;
        return [...prev, data as ChatMessage];
      });
      setText('');
    }

    setSending(false);
  };

  return (
    <div className="flex flex-col h-96 border rounded-xl bg-white shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700 border-b pb-2 mb-3">
        Diskusi Pesanan (Nomor Asli Disembunyikan)
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2" aria-live="polite">
        {loading && <div className="text-sm text-gray-500">Memuat pesan...</div>}
        {!loading && messages.length === 0 && !error && (
          <div className="text-sm text-gray-500">Belum ada pesan. Mulai percakapan.</div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[75%] p-3 rounded-lg text-sm ${
                isMe
                  ? 'ml-auto bg-green-100 text-green-900 rounded-br-none'
                  : 'mr-auto bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <span className="whitespace-pre-wrap break-words">{m.message}</span>
              <span className="text-[10px] text-gray-500 mt-1 self-end">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && <div className="mb-2 text-xs text-red-600" role="alert">{error}</div>}

      <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="Ketik pesan..."
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={sending}
          aria-label="Pesan"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          {sending ? 'Mengirim...' : 'Kirim'}
        </button>
      </form>
    </div>
  );
}
