import { delay, nextId } from './mockClient';
import { CITATIONS } from '../lib/mockData';
import type { ChatSession, SavedAnswer } from '../types';

const chatSessions: ChatSession[] = [
  { id: 'session-1', title: 'Rủi ro Rural Education tuần này', lastMessageAt: 'Hôm nay', messageCount: 4 },
  { id: 'session-2', title: 'Phương án khoan giếng vs đường ống', lastMessageAt: '2 ngày trước', messageCount: 6 },
  { id: 'session-3', title: 'Người phụ trách Community Digital Infrastructure', lastMessageAt: '5 ngày trước', messageCount: 2 },
  { id: 'session-4', title: 'Tóm tắt hoạt động tháng 6 — Education', lastMessageAt: '3 tuần trước', messageCount: 8 },
];

let savedAnswers: SavedAnswer[] = [
  {
    id: 'saved-1',
    question: 'Tại sao chúng ta chọn phương án khoan giếng thay vì kéo đường ống?',
    answer:
      'Quyết định D-2024-014 ghi nhận nhóm Health & WASH chọn phương án khoan giếng vì chi phí bảo trì thấp hơn 40% so với kéo đường ống trên địa hình đồi núi.',
    citations: [CITATIONS[0]],
    savedAt: '2 ngày trước',
    savedBy: 'Sarah Johnson',
  },
  {
    id: 'saved-2',
    question: 'Ai đang chịu trách nhiệm chương trình Community Digital Infrastructure?',
    answer: 'Elena Lopez là người phụ trách chương trình Community Digital Infrastructure, thuộc nhóm Tech for Good.',
    citations: [],
    savedAt: '1 tuần trước',
    savedBy: 'Sarah Johnson',
  },
];

export async function listChatSessions(): Promise<ChatSession[]> {
  return delay([...chatSessions]);
}

export async function renameChatSession(id: string, title: string): Promise<ChatSession> {
  const idx = chatSessions.findIndex((s) => s.id === id);
  if (idx >= 0) chatSessions[idx] = { ...chatSessions[idx], title };
  return delay(chatSessions[idx]);
}

export async function listSavedAnswers(): Promise<SavedAnswer[]> {
  return delay([...savedAnswers]);
}

export async function removeSavedAnswer(id: string): Promise<void> {
  savedAnswers = savedAnswers.filter((a) => a.id !== id);
  await delay(undefined, 150);
}

export async function saveAnswer(question: string, answer: string, citations: SavedAnswer['citations'], savedBy: string): Promise<SavedAnswer> {
  const entry: SavedAnswer = { id: nextId('saved'), question, answer, citations, savedAt: 'vừa xong', savedBy };
  savedAnswers = [entry, ...savedAnswers];
  return delay(entry);
}
