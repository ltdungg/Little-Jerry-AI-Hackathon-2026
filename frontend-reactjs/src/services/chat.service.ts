import * as api from '../lib/api';
import type { ChatMessage, ChatSession, Citation, SavedAnswer, SourceType } from '../types';

const SOURCE_SYSTEM_MAP: Record<string, SourceType> = {
  sharepoint: 'SharePoint',
  slack: 'Slack',
  s3: 'Docs',
  google_drive: 'Docs',
  manual: 'Docs',
};

function mapCitation(c: any): Citation {
  return {
    id: c.citation_id,
    title: c.document_title || c.source_uri || 'Nguồn không tên',
    snippet: c.excerpt || '',
    source: SOURCE_SYSTEM_MAP[c.source_system] || 'Docs',
    updatedAt: c.last_modified_at || '',
  };
}

export interface ChatAnswer {
  content: string;
  citations: Citation[];
  sources: SourceType[];
}

/** Sends a message to the real Orchestrator via POST /v1/chat. */
export async function sendChatMessage(message: string, projectId?: string, sessionId?: string): Promise<ChatAnswer> {
  const res = await api.sendMessage(message, projectId, sessionId);
  const citations = (res.citations || []).map(mapCitation);
  return {
    content: res.answer || '',
    citations,
    sources: Array.from(new Set(citations.map((c: Citation) => c.source))),
  };
}

function mapSession(s: any): ChatSession {
  return {
    id: s.session_id,
    title: s.title || '',
    lastMessageAt: s.last_message_at || '',
    messageCount: s.message_count || 0,
  };
}

/** Saved-answer citations are stored verbatim as already-mapped Citation
 * objects (unlike chat citations, which arrive fresh from the backend in its
 * raw `source_system`/`document_title` shape via mapCitation above). */
function mapSavedAnswer(s: any): SavedAnswer {
  return {
    id: s.saved_id,
    question: s.question,
    answer: s.answer,
    citations: s.citations || [],
    savedAt: s.saved_at || '',
    savedBy: s.saved_by || '',
  };
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const raw = await api.getChatSessions();
  // Backend already sorts by last_message_at desc; re-sort here too so the
  // list stays correct even if that ever changes upstream.
  return raw.map(mapSession).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function renameChatSession(id: string, title: string): Promise<ChatSession> {
  return mapSession(await api.renameChatSession(id, title));
}

function mapStoredMessage(m: any): ChatMessage {
  const citations = (m.citations || []).map(mapCitation);
  return {
    id: m.message_id,
    role: m.role,
    content: m.content || '',
    synthesizedFrom: m.role === 'assistant' && citations.length > 0 ? citations.length : undefined,
    sources: citations.length > 0 ? Array.from(new Set(citations.map((c: Citation) => c.source))) : undefined,
    citations,
  };
}

export async function listChatSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const raw = await api.getChatSessionMessages(sessionId);
  return raw.map(mapStoredMessage);
}

export async function listSavedAnswers(): Promise<SavedAnswer[]> {
  const raw = await api.getSavedAnswers();
  return raw.map(mapSavedAnswer);
}

export async function removeSavedAnswer(id: string): Promise<void> {
  await api.deleteSavedAnswer(id);
}

export async function saveAnswer(question: string, answer: string, citations: SavedAnswer['citations'], savedBy: string): Promise<SavedAnswer> {
  const raw = await api.createSavedAnswer({ question, answer, saved_by: savedBy, citations });
  return mapSavedAnswer(raw);
}
