import { delay } from './mockClient';
import type { Team } from '../types';

const teams: Team[] = [
  {
    id: 'team-health',
    name: 'Health & WASH',
    mission: 'Cải thiện tiếp cận nước sạch và vệ sinh cho cộng đồng vùng cao.',
    programNames: ['Clean Water Access', 'Mobile Health Outreach'],
    members: [
      { id: 'u-001', name: 'Sarah Johnson', initials: 'SJ', roleLabel: 'Trưởng nhóm' },
      { id: 'u-003', name: 'Priya Nair', initials: 'PN', roleLabel: 'Thành viên' },
    ],
    status: 'active',
    lastReportAt: '2 ngày trước',
  },
  {
    id: 'team-education',
    name: 'Education',
    mission: 'Nâng cao chất lượng giáo dục nông thôn qua xây dựng trường và tập huấn giáo viên.',
    programNames: ['Rural Education', 'Teacher Training Fellowship'],
    members: [
      { id: 'u-002', name: 'Marcus Tran', initials: 'MT', roleLabel: 'Trưởng nhóm' },
      { id: 'u-001', name: 'Sarah Johnson', initials: 'SJ', roleLabel: 'Thành viên' },
      { id: 'u-007', name: 'Linh Phạm', initials: 'LP', roleLabel: 'Tình nguyện viên' },
    ],
    status: 'needs_support',
    lastReportAt: '5 giờ trước',
  },
  {
    id: 'team-tech',
    name: 'Tech for Good',
    mission: 'Triển khai hạ tầng số cho các trung tâm cộng đồng.',
    programNames: ['Community Digital Infrastructure'],
    members: [
      { id: 'u-004', name: 'Elena Lopez', initials: 'EL', roleLabel: 'Trưởng nhóm' },
      { id: 'u-008', name: 'David Kim', initials: 'DK', roleLabel: 'Thành viên' },
    ],
    status: 'needs_support',
    lastReportAt: 'Hôm qua',
  },
  {
    id: 'team-youth',
    name: 'Youth Development',
    mission: 'Phát triển kỹ năng lãnh đạo cho thanh niên địa phương.',
    programNames: ['Youth Leadership Program'],
    members: [{ id: 'u-008', name: 'David Kim', initials: 'DK', roleLabel: 'Trưởng nhóm' }],
    status: 'active',
    lastReportAt: '3 ngày trước',
  },
  {
    id: 'team-economic',
    name: 'Economic Empowerment',
    mission: 'Hỗ trợ tài chính vi mô cho phụ nữ khởi nghiệp.',
    programNames: ['Women Microfinance Circles'],
    members: [{ id: 'u-006', name: 'Grace Owusu', initials: 'GO', roleLabel: 'Trưởng nhóm' }],
    status: 'active',
    lastReportAt: '6 ngày trước',
  },
  {
    id: 'team-emergency',
    name: 'Emergency Response',
    mission: 'Chuẩn bị và ứng phó thiên tai cho khu vực miền Trung.',
    programNames: ['Disaster Relief Readiness'],
    members: [{ id: 'u-002', name: 'Marcus Tran', initials: 'MT', roleLabel: 'Trưởng nhóm' }],
    status: 'needs_support',
    lastReportAt: '4 giờ trước',
  },
];

export async function listTeams(): Promise<Team[]> {
  return delay([...teams]);
}

export async function getTeam(id: string): Promise<Team | undefined> {
  return delay(teams.find((t) => t.id === id));
}
