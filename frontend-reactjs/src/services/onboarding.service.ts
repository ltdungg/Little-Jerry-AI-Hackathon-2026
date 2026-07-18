import * as api from '../lib/api';
import type { OnboardingContent } from '../types';

function mapContent(c: any): OnboardingContent {
  return {
    teamName: c.team_name || '',
    teamIntro: c.team_intro || '',
    programIntro: c.program_intro || '',
    contacts: (c.contacts || []).map((ct: any) => ({
      name: ct.name,
      roleLabel: ct.role_label,
      initials: ct.initials,
    })),
    currentPriorities: c.current_priorities || [],
    keyDecisions: c.key_decisions || [],
    openTasks: c.open_tasks || [],
    requiredDocs: c.required_docs || [],
    faqs: c.faqs || [],
    glossary: c.glossary || [],
    checklist: (c.checklist || []).map((item: any) => ({
      id: item.item_id,
      label: item.label,
      done: item.done,
    })),
  };
}

export async function getOnboardingContent(): Promise<OnboardingContent> {
  return mapContent(await api.getOnboarding());
}

export async function toggleChecklistItem(id: string): Promise<OnboardingContent> {
  return mapContent(await api.toggleOnboardingChecklistItem(id));
}
