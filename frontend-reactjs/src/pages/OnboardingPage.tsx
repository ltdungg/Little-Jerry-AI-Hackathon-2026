import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { useAuth } from '../context/useAuth';
import { useMockResource } from '../hooks/useMockResource';
import { getOnboardingContent, toggleChecklistItem } from '../services/onboarding.service';

export function OnboardingPage() {
  const { user } = useAuth();
  const { data, setData, loading } = useMockResource(() => getOnboardingContent(), []);

  if (loading || !data) {
    return <p className="p-6 text-sm text-slate-400">Đang tải...</p>;
  }

  const doneCount = data.checklist.filter((c) => c.done).length;
  const progress = Math.round((doneCount / data.checklist.length) * 100);

  async function handleToggle(id: string) {
    setData((prev) =>
      prev ? { ...prev, checklist: prev.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) } : prev,
    );
    await toggleChecklistItem(id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Hướng dẫn của tôi" subtitle={`Chào mừng ${user?.name ?? 'bạn'} đến với nhóm ${data.teamName}!`} />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Tiến độ làm quen</span>
          <span className="text-slate-500">{progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
        <ChecklistItems checklist={data.checklist} onToggle={handleToggle} />
      </div>

      <Section title="Giới thiệu về nhóm" icon="Users">
        <p className="text-sm text-slate-600">{data.teamIntro}</p>
      </Section>

      <Section title="Chương trình đang tham gia" icon="FolderKanban">
        <p className="text-sm text-slate-600">{data.programIntro}</p>
      </Section>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Section title="Người liên hệ" icon="Contact">
          <div className="flex flex-col gap-2">
            {data.contacts.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {c.initials}
                </div>
                <div>
                  <p className="text-sm text-slate-700">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.roleLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ưu tiên hiện tại" icon="ListChecks">
          <BulletList items={data.currentPriorities} />
        </Section>

        <Section title="Quyết định quan trọng" icon="Gavel">
          <BulletList items={data.keyDecisions} />
        </Section>

        <Section title="Tài liệu cần đọc" icon="Library">
          <BulletList items={data.requiredDocs} />
        </Section>
      </div>

      <Section title="Câu hỏi thường gặp" icon="HelpCircle">
        <div className="flex flex-col gap-3">
          {data.faqs.map((f) => (
            <div key={f.question}>
              <p className="text-sm font-medium text-slate-700">{f.question}</p>
              <p className="text-sm text-slate-500">{f.answer}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Thuật ngữ" icon="BookOpen">
        <div className="flex flex-col gap-2">
          {data.glossary.map((g) => (
            <p key={g.term} className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">{g.term}</span> — {g.definition}
            </p>
          ))}
        </div>
      </Section>
    </div>
  );
}

function ChecklistItems({
  checklist,
  onToggle,
}: {
  checklist: { id: string; label: string; done: boolean }[];
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {checklist.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(item.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
          >
            <Icon
              name={item.done ? 'CheckSquare' : 'Square'}
              size={16}
              className={item.done ? 'text-brand-600' : 'text-slate-300'}
            />
            <span className={item.done ? 'text-slate-400 line-through' : 'text-slate-700'}>{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={15} className="text-brand-500" />
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}
