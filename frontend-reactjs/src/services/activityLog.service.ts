import { delay } from './mockClient';
import type { ActivityAction, ActivityLogEntry } from '../types';

const activityLog: ActivityLogEntry[] = [
  { id: 'log-1', actorName: 'Sarah Johnson', action: 'approved', target: 'Quyết định "Dùng xe bồn chở nước tạm thời"', timestamp: '10 phút trước', aiSourceUsed: null },
  { id: 'log-2', actorName: 'Trợ lý AIV', action: 'ai_generated', target: 'Câu trả lời cho "What are the latest risks identified in the Rural Education project?"', timestamp: '25 phút trước', aiSourceUsed: 'Q3_Status_Report.docx, #proj-rural-edu' },
  { id: 'log-3', actorName: 'Marcus Tran', action: 'edited', target: 'Nhiệm vụ "Ký hợp đồng nhà thầu xây trường"', timestamp: '2 giờ trước', aiSourceUsed: null },
  { id: 'log-4', actorName: 'Elena Lopez', action: 'viewed', target: 'Chương trình Community Digital Infrastructure', timestamp: '3 giờ trước', aiSourceUsed: null },
  { id: 'log-5', actorName: 'Người quản trị', action: 'permission_changed', target: 'Vai trò của Linh Phạm → Tình nguyện viên', timestamp: 'Hôm qua', aiSourceUsed: null },
  { id: 'log-6', actorName: 'Priya Nair', action: 'exported', target: 'Báo cáo hằng tuần — Health & WASH', timestamp: 'Hôm qua', aiSourceUsed: null },
  { id: 'log-7', actorName: 'Người quản trị', action: 'account_locked', target: 'Tài khoản Hana Ito (hết hạn tham gia)', timestamp: '2 ngày trước', aiSourceUsed: null },
  { id: 'log-8', actorName: 'Trợ lý AIV', action: 'ai_generated', target: 'Đề xuất khó khăn "Thiếu 5 vị trí quản lý công trình"', timestamp: '2 ngày trước', aiSourceUsed: '#proj-rural-edu (Slack)' },
  { id: 'log-9', actorName: 'Sarah Johnson', action: 'shared', target: 'Câu trả lời đã lưu về phương án khoan giếng', timestamp: '3 ngày trước', aiSourceUsed: null },
  { id: 'log-10', actorName: 'Grace Owusu', action: 'rejected', target: 'Đề xuất mở rộng chương trình vi tín dụng sang tỉnh mới', timestamp: '4 ngày trước', aiSourceUsed: null },
];

export interface ListActivityLogParams {
  action?: ActivityAction | 'all';
}

export async function listActivityLog(params: ListActivityLogParams = {}): Promise<ActivityLogEntry[]> {
  let result = activityLog;
  if (params.action && params.action !== 'all') result = result.filter((l) => l.action === params.action);
  return delay([...result]);
}

export function activityActionLabel(action: ActivityAction): string {
  return {
    viewed: 'Đã xem',
    edited: 'Đã chỉnh sửa',
    approved: 'Đã phê duyệt',
    rejected: 'Đã từ chối',
    exported: 'Đã xuất dữ liệu',
    shared: 'Đã chia sẻ',
    permission_changed: 'Đã đổi quyền',
    ai_generated: 'AI đã tạo nội dung',
    account_locked: 'Tài khoản bị khoá',
  }[action];
}

export function activityActionIcon(action: ActivityAction): string {
  return {
    viewed: 'Eye',
    edited: 'Pencil',
    approved: 'CheckCircle2',
    rejected: 'XCircle',
    exported: 'Download',
    shared: 'Share2',
    permission_changed: 'KeyRound',
    ai_generated: 'Sparkles',
    account_locked: 'Lock',
  }[action];
}
