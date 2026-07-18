import { delay } from './mockClient';
import type { Decision, DecisionApprovalStatus } from '../types';

let decisions: Decision[] = [
  {
    id: 'decision-1',
    title: 'Chọn phương án khoan giếng thay vì kéo đường ống',
    content:
      'Nhóm Health & WASH quyết định chọn khoan giếng làm phương án cấp nước chính cho khu vực đồi núi.',
    programId: 'proj-clean-water',
    programName: 'Clean Water Access',
    decidedAt: '3 Th7',
    ownerName: 'Priya Nair',
    approverName: 'Sarah Johnson',
    participants: ['Priya Nair', 'Sarah Johnson'],
    reason: 'Chi phí vận hành dài hạn thấp hơn 40% so với kéo đường ống trên địa hình đồi núi.',
    alternativesConsidered: ['Kéo đường ống từ hồ chứa trung tâm', 'Xe bồn chở nước định kỳ'],
    expectedImpact: 'Giảm chi phí bảo trì hằng năm, thời gian triển khai lâu hơn khoảng 2 tuần.',
    followUpTasks: ['Khảo sát nguồn nước khu vực Bắc Kạn'],
    approvalStatus: 'confirmed',
    effectiveStatus: 'active',
    supersededByTitle: null,
  },
  {
    id: 'decision-2',
    title: 'Chuyển nhà cung cấp vật liệu xây dựng',
    content: 'Đổi sang nhà cung cấp mới do nhà cung cấp cũ liên tục chậm giao hàng.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    decidedAt: 'Chưa xác định',
    ownerName: 'Marcus Tran',
    approverName: null,
    participants: ['Marcus Tran'],
    reason: 'Nhà cung cấp hiện tại chậm giao vật liệu 3 tuần liên tiếp, ảnh hưởng tiến độ xây trường.',
    alternativesConsidered: ['Thương lượng lại với nhà cung cấp cũ', 'Chia nhỏ đơn hàng cho 2 nhà cung cấp'],
    expectedImpact: 'Rút ngắn thời gian giao vật liệu, chi phí có thể tăng nhẹ khoảng 5%.',
    followUpTasks: [],
    approvalStatus: 'ai_suggested',
    effectiveStatus: 'active',
    supersededByTitle: null,
  },
  {
    id: 'decision-3',
    title: 'Ưu tiên tuyển site manager từ tỉnh lân cận',
    content: 'Mở rộng phạm vi tuyển dụng sang các tỉnh lân cận thay vì chỉ tuyển tại địa phương.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    decidedAt: '15 Th7',
    ownerName: 'Sarah Johnson',
    approverName: null,
    participants: ['Sarah Johnson', 'Marcus Tran'],
    reason: 'Nguồn nhân lực tại chỗ không đủ đáp ứng 5 vị trí cần tuyển.',
    alternativesConsidered: ['Thuê ngoài qua bên thứ ba', 'Đào tạo nhân sự nội bộ'],
    expectedImpact: 'Có thể phát sinh chi phí đi lại/ăn ở cho nhân sự ngoài tỉnh.',
    followUpTasks: ['Tuyển 5 vị trí quản lý công trình'],
    approvalStatus: 'reviewing',
    effectiveStatus: 'active',
    supersededByTitle: null,
  },
  {
    id: 'decision-4',
    title: 'Dùng xe bồn chở nước tạm thời',
    content: 'Phương án cấp nước tạm thời trong lúc chờ khoan giếng, đã bị thay thế.',
    programId: 'proj-clean-water',
    programName: 'Clean Water Access',
    decidedAt: '20 Th5',
    ownerName: 'Priya Nair',
    approverName: 'Sarah Johnson',
    participants: ['Priya Nair'],
    reason: 'Giải pháp ngắn hạn trong lúc chưa chốt phương án chính.',
    alternativesConsidered: [],
    expectedImpact: 'Chi phí vận hành cao, chỉ phù hợp ngắn hạn.',
    followUpTasks: [],
    approvalStatus: 'confirmed',
    effectiveStatus: 'superseded',
    supersededByTitle: 'Chọn phương án khoan giếng thay vì kéo đường ống',
  },
  {
    id: 'decision-5',
    title: 'Hoãn mở rộng chương trình vi tín dụng sang tỉnh mới',
    content: 'Tạm hoãn kế hoạch mở rộng sang tỉnh mới trong quý này.',
    programId: 'proj-microfinance',
    programName: 'Women Microfinance Circles',
    decidedAt: '1 Th7',
    ownerName: 'Grace Owusu',
    approverName: 'Sarah Johnson',
    participants: ['Grace Owusu'],
    reason: 'Đối tác ngân hàng chưa hoàn tất thẩm định rủi ro cho khu vực mới.',
    alternativesConsidered: ['Vẫn mở rộng nhưng giảm quy mô'],
    expectedImpact: 'Trì hoãn mục tiêu tăng trưởng quý 3 khoảng 1 tháng.',
    followUpTasks: [],
    approvalStatus: 'confirmed',
    effectiveStatus: 'active',
    supersededByTitle: null,
  },
];

export interface ListDecisionsParams {
  approvalStatus?: DecisionApprovalStatus | 'all';
  programId?: string;
  onlyConfirmed?: boolean;
}

export async function listDecisions(params: ListDecisionsParams = {}): Promise<Decision[]> {
  let result = decisions;
  if (params.approvalStatus && params.approvalStatus !== 'all') {
    result = result.filter((d) => d.approvalStatus === params.approvalStatus);
  }
  if (params.programId) result = result.filter((d) => d.programId === params.programId);
  if (params.onlyConfirmed) result = result.filter((d) => d.approvalStatus === 'confirmed');
  return delay([...result]);
}

export async function approveDecision(id: string, approverName: string): Promise<Decision> {
  decisions = decisions.map((d) =>
    d.id === id ? { ...d, approvalStatus: 'confirmed' as const, approverName } : d,
  );
  return delay(decisions.find((d) => d.id === id)!);
}

export async function rejectDecision(id: string): Promise<Decision> {
  decisions = decisions.map((d) => (d.id === id ? { ...d, approvalStatus: 'rejected' as const } : d));
  return delay(decisions.find((d) => d.id === id)!);
}

export function decisionApprovalLabel(status: DecisionApprovalStatus): string {
  return {
    ai_suggested: 'AI đề xuất',
    draft: 'Bản nháp',
    reviewing: 'Đang xem xét',
    confirmed: 'Đã xác nhận',
    rejected: 'Bị từ chối',
  }[status];
}
