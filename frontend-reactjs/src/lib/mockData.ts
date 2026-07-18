import type { AppUser, Citation, Project } from '../types';

export const MOCK_USER: AppUser = {
  id: 'u-001',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@aiv.org',
  role: 'team_lead',
  roleLabel: 'Trưởng nhóm — Giáo dục nông thôn',
  team: 'Rural Education',
  initials: 'SJ',
};

export const PROJECTS: Project[] = [
  {
    id: 'proj-clean-water',
    name: 'Clean Water Access',
    program: 'Global Health Initiative',
    status: 'healthy',
    owner: 'Sarah Johnson',
    ownerInitials: 'SJ',
    nextMilestone: '15 Th10',
    overdueCount: 0,
    highRiskCount: 0,
    progress: 78,
    team: 'Health & WASH',
    updatedAt: '2 ngày trước',
  },
  {
    id: 'proj-rural-edu',
    name: 'Rural Education',
    program: 'Education Programs',
    status: 'at_risk',
    owner: 'Marcus Tran',
    ownerInitials: 'MT',
    nextMilestone: '28 Th9',
    overdueCount: 2,
    highRiskCount: 4,
    progress: 54,
    team: 'Education',
    updatedAt: '5 giờ trước',
  },
  {
    id: 'proj-community-digital',
    name: 'Community Digital Infrastructure',
    program: 'Digital Infrastructure',
    status: 'overdue',
    owner: 'Elena Lopez',
    ownerInitials: 'EL',
    nextMilestone: '10 Th9',
    overdueCount: 8,
    highRiskCount: 3,
    progress: 31,
    team: 'Tech for Good',
    updatedAt: 'Hôm qua',
  },
  {
    id: 'proj-youth-leadership',
    name: 'Youth Leadership Program',
    program: 'Youth Development',
    status: 'healthy',
    owner: 'David Kim',
    ownerInitials: 'DK',
    nextMilestone: '2 Th11',
    overdueCount: 0,
    highRiskCount: 1,
    progress: 66,
    team: 'Youth Development',
    updatedAt: '3 ngày trước',
  },
  {
    id: 'proj-health-outreach',
    name: 'Mobile Health Outreach',
    program: 'Global Health Initiative',
    status: 'at_risk',
    owner: 'Priya Nair',
    ownerInitials: 'PN',
    nextMilestone: '22 Th9',
    overdueCount: 1,
    highRiskCount: 2,
    progress: 47,
    team: 'Health & WASH',
    updatedAt: '1 ngày trước',
  },
  {
    id: 'proj-microfinance',
    name: 'Women Microfinance Circles',
    program: 'Economic Empowerment',
    status: 'healthy',
    owner: 'Grace Owusu',
    ownerInitials: 'GO',
    nextMilestone: '18 Th10',
    overdueCount: 0,
    highRiskCount: 0,
    progress: 82,
    team: 'Economic Empowerment',
    updatedAt: '6 ngày trước',
  },
  {
    id: 'proj-disaster-relief',
    name: 'Disaster Relief Readiness',
    program: 'Emergency Response',
    status: 'overdue',
    owner: 'Marcus Tran',
    ownerInitials: 'MT',
    nextMilestone: '5 Th9',
    overdueCount: 5,
    highRiskCount: 3,
    progress: 39,
    team: 'Emergency Response',
    updatedAt: '4 giờ trước',
  },
  {
    id: 'proj-teacher-training',
    name: 'Teacher Training Fellowship',
    program: 'Education Programs',
    status: 'healthy',
    owner: 'Elena Lopez',
    ownerInitials: 'EL',
    nextMilestone: '30 Th10',
    overdueCount: 0,
    highRiskCount: 0,
    progress: 71,
    team: 'Education',
    updatedAt: '2 ngày trước',
  },
];

export const CITATIONS: Citation[] = [
  {
    id: 'cit-1',
    title: 'Q3_Status_Report.docx',
    snippet:
      '...the rural education initiative is facing unexpected headwinds. Specifically, procurement delays for structural...',
    source: 'SharePoint',
    updatedAt: '3 ngày trước',
  },
  {
    id: 'cit-2',
    title: '#proj-rural-edu',
    snippet:
      '@sarah just an heads up that the local staffing agency couldn’t fill the 5 site manager roles in the northern district.',
    source: 'Slack',
    updatedAt: '5 giờ trước',
  },
];

export const SUGGESTED_QUESTIONS = [
  'What are the latest risks identified in the Rural Education project?',
  'Tại sao chúng ta chọn phương án khoan giếng thay vì kéo đường ống?',
  'Ai đang chịu trách nhiệm chương trình Community Digital Infrastructure?',
  'Trong tháng vừa qua nhóm Education đã làm những gì?',
];

export const QA_BANK: Record<
  string,
  { content: string; citations: Citation[] }
> = {
  'What are the latest risks identified in the Rural Education project?': {
    content:
      'Based on recent reports, the primary risks involve procurement delays and local staffing shortages in the northern district. The Q3 logistics brief indicates that material delivery for the new school builds is currently 3 weeks behind schedule due to regional supply chain bottlenecks.',
    citations: CITATIONS,
  },
  'Tại sao chúng ta chọn phương án khoan giếng thay vì kéo đường ống?': {
    content:
      'Quyết định D-2024-014 ghi nhận nhóm Health & WASH chọn phương án khoan giếng vì chi phí bảo trì thấp hơn 40% so với kéo đường ống trên địa hình đồi núi, dù thời gian triển khai ban đầu lâu hơn khoảng 2 tuần.',
    citations: [
      {
        id: 'cit-3',
        title: 'Decision D-2024-014.md',
        snippet:
          '...sau khi cân nhắc 3 phương án, nhóm quyết định chọn khoan giếng do chi phí vận hành dài hạn thấp hơn đáng kể...',
        source: 'Docs',
        updatedAt: '2 tuần trước',
      },
    ],
  },
  'Ai đang chịu trách nhiệm chương trình Community Digital Infrastructure?': {
    content:
      'Elena Lopez là người phụ trách chương trình Community Digital Infrastructure, thuộc nhóm Tech for Good. Chương trình hiện đang quá hạn với 8 nhiệm vụ trễ tiến độ.',
    citations: [
      {
        id: 'cit-4',
        title: 'Danh sách chương trình',
        snippet: 'Community Digital Infrastructure — Người phụ trách: Elena Lopez — Trạng thái: Quá hạn.',
        source: 'Docs',
        updatedAt: 'Hôm qua',
      },
    ],
  },
};
