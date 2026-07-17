'use client';
import { useState } from 'react';
import { sendMessage } from '@/lib/api';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const response = await sendMessage(input);
    setMessages(prev => [...prev, { type: 'user', content: input }, { type: 'ai', ...response }]);
    setInput('');
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 ${m.type === 'user' ? 'text-right' : 'text-left'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div>Đang xử lý...</div>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 rounded"
          placeholder="Nhập yêu cầu của bạn..."
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Gửi</button>
      </form>
    </div>
  );
}
