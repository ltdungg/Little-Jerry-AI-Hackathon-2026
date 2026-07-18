import * as api from '../lib/api';
import type { Meeting, MeetingActionItem } from '../types';

function mapActionItem(a: any): MeetingActionItem {
  return {
    id: a.action_item_id,
    title: a.title,
    owner: a.owner ?? null,
    dueDate: a.due_date ?? null,
    status: a.status,
  };
}

function mapMeeting(m: any): Meeting {
  return {
    id: m.meeting_id,
    title: m.title,
    date: m.date || '',
    durationMinutes: m.duration_minutes || 0,
    participants: m.participants || [],
    teamId: m.team_id || '',
    programName: m.program_name || '',
    summary: m.summary || '',
    keyTopics: m.key_topics || [],
    proposedDecisions: m.proposed_decisions || [],
    actionItems: (m.action_items || []).map(mapActionItem),
    openQuestions: m.open_questions || [],
  };
}

export async function listMeetings(): Promise<Meeting[]> {
  const raw = await api.getMeetings();
  return raw.map(mapMeeting);
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  try {
    return mapMeeting(await api.getMeeting(id));
  } catch {
    return undefined;
  }
}

export async function confirmActionItem(meetingId: string, actionItemId: string, owner: string): Promise<Meeting> {
  const raw = await api.decideMeetingActionItem(meetingId, actionItemId, 'confirm', owner);
  return mapMeeting(raw);
}

export async function rejectActionItem(meetingId: string, actionItemId: string): Promise<Meeting> {
  const raw = await api.decideMeetingActionItem(meetingId, actionItemId, 'reject');
  return mapMeeting(raw);
}
