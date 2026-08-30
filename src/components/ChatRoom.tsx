import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ChatRoomProps {
  orderId: string;
  currentUserId: string;
}

export function ChatRoom({ orderId, currentUserId }: ChatRoomProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    // Ambil pesan awal berdasarkan order_id
    supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Subscribe ke Supabase Realtime agar pesan langsung muncul tanpa refresh
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
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const { error } = await supabase.from('messages').insert({
      order_id: orderId,
      sender_id: currentUserId,
      message: text,
    });

    if (error) {
      alert('Gagal mengirim pesan: ' + error.message);
    } else {
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-96 border rounded-xl bg-white shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700 border-b pb-2 mb-3">
        Diskusi Pesanan (Nomor Asli Disembunyikan)
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.map((m, idx) => {
          const isMe = m.sender_id === currentUserId;
          return (
            <div
              key={idx}
              className={`flex flex-col max-w-[75%] p-3 rounded-lg text-sm ${
                isMe
                  ? 'ml-auto bg-green-100 text-green-900 rounded-br-none'
                  : 'mr-auto bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <span>{m.message}</span>
              <span className="text-[10px] text-gray-500 mt-1 self-end">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          Kirim
        </button>
      </form>
    </div>
  );
    }
                                                                
