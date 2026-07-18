import { delay } from './mockClient';
import type { OnboardingContent } from '../types';

let content: OnboardingContent = {
  teamName: 'Education',
  teamIntro:
    'Nhóm Education phụ trách các chương trình giáo dục nông thôn: xây trường, tập huấn giáo viên và hỗ trợ học sinh vùng khó khăn.',
  programIntro:
    'Rural Education đang ở giai đoạn xây dựng điểm trường mới và tuyển thêm nhân sự quản lý công trình.',
  contacts: [
    { name: 'Marcus Tran', roleLabel: 'Trưởng nhóm', initials: 'MT' },
    { name: 'Sarah Johnson', roleLabel: 'Thành viên phụ trách tập huấn', initials: 'SJ' },
  ],
  currentPriorities: ['Chốt hợp đồng nhà thầu xây trường', 'Tuyển 5 vị trí quản lý công trình'],
  keyDecisions: ['Ưu tiên tuyển site manager từ tỉnh lân cận'],
  openTasks: ['Chuẩn bị nội dung tập huấn giáo viên đợt 3'],
  requiredDocs: ['Quy trình an toàn công trường', 'Hướng dẫn tuyển dụng tình nguyện viên'],
  faqs: [
    { question: 'Chương trình Rural Education bắt đầu từ khi nào?', answer: 'Chương trình khởi động từ đầu năm 2025.' },
    { question: 'Tôi cần liên hệ ai khi gặp khó khăn kỹ thuật?', answer: 'Liên hệ Marcus Tran — trưởng nhóm Education.' },
  ],
  glossary: [
    { term: 'Site manager', definition: 'Người quản lý trực tiếp tại công trường xây dựng.' },
    { term: 'AIV', definition: 'Tên viết tắt của tổ chức phi lợi nhuận đang vận hành nền tảng này.' },
  ],
  checklist: [
    { id: 'chk-1', label: 'Đọc Quy trình an toàn công trường', done: true },
    { id: 'chk-2', label: 'Gặp trưởng nhóm để nhận nhiệm vụ đầu tiên', done: true },
    { id: 'chk-3', label: 'Tham gia cuộc họp giao ban tuần đầu tiên', done: false },
    { id: 'chk-4', label: 'Hoàn tất tài khoản trên các công cụ nội bộ', done: false },
  ],
};

export async function getOnboardingContent(): Promise<OnboardingContent> {
  return delay(content);
}

export async function toggleChecklistItem(id: string): Promise<OnboardingContent> {
  content = { ...content, checklist: content.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) };
  return delay(content);
}
