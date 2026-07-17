'use client';
import { useEffect, useState } from 'react';
import { sendMessage } from '@/lib/api';
import { signIn, signOut, currentUser } from '@/lib/auth';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth state
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    currentUser().then((u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signIn(username, password);
      const u = await currentUser();
      setUser(u);
    } catch (err: any) {
      setAuthError(err?.message ?? 'Đăng nhập thất bại');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    const response = await sendMessage(input);
    setMessages((prev) => [...prev, { type: 'user', content: input }, { type: 'ai', ...response }]);
    setInput('');
    setLoading(false);
  };

  if (checking) {
    return <div className="p-4 text-gray-500">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!user) {
    return (
      <form onSubmit={handleLogin} className="max-w-sm mx-auto flex flex-col gap-3 border rounded-lg bg-white p-6">
        <h2 className="text-xl font-semibold">Đăng nhập</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 rounded"
          placeholder="Email / Username"
          autoComplete="username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          placeholder="Mật khẩu"
          autoComplete="current-password"
        />
        {authError && <div className="text-red-600 text-sm">{authError}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Đăng nhập
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white p-4">
      <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
        <span>Đã đăng nhập: {user}</span>
        <button onClick={handleLogout} className="underline">Đăng xuất</button>
      </div>
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 ${m.type === 'user' ? 'text-right' : 'text-left'}`}>
            {m.type === 'ai' ? (m.summary ?? m.content ?? JSON.stringify(m)) : m.content}
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
