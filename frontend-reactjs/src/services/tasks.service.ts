import { delay, nextId } from './mockClient';
import type { Task, TaskComment, TaskPriority, TaskStatus } from '../types';

let tasks: Task[] = [
  {
    id: 'task-1',
    title: 'Khảo sát nguồn nước khu vực Bắc Kạn',
    description: 'Đánh giá chất lượng nguồn nước tại 3 xã trước khi khoan giếng.',
    programId: 'proj-clean-water',
    programName: 'Clean Water Access',
    teamId: 'team-health',
    assigneeId: 'u-003',
    assigneeName: 'Priya Nair',
    assigneeInitials: 'PN',
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-07-22',
    dependsOnTaskIds: [],
    comments: [],
    updatedAt: '1 ngày trước',
  },
  {
    id: 'task-2',
    title: 'Ký hợp đồng nhà thầu xây trường',
    description: 'Hoàn tất thủ tục pháp lý với nhà thầu xây dựng cho điểm trường mới.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    teamId: 'team-education',
    assigneeId: 'u-002',
    assigneeName: 'Marcus Tran',
    assigneeInitials: 'MT',
    priority: 'high',
    status: 'blocked',
    dueDate: '2026-07-10',
    dependsOnTaskIds: [],
    comments: [
      {
        id: 'c-1',
        author: 'Marcus Tran',
        authorInitials: 'MT',
        content: 'Đang chờ nhà thầu gửi lại báo giá đã điều chỉnh.',
        createdAt: '2 ngày trước',
      },
    ],
    updatedAt: '2 ngày trước',
  },
  {
    id: 'task-3',
    title: 'Tuyển 5 vị trí quản lý công trình',
    description: 'Phối hợp với đơn vị tuyển dụng địa phương để lấp đầy vị trí site manager.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    teamId: 'team-education',
    assigneeId: null,
    assigneeName: null,
    assigneeInitials: null,
    priority: 'high',
    status: 'todo',
    dueDate: '2026-07-25',
    dependsOnTaskIds: [],
    comments: [],
    updatedAt: '5 giờ trước',
  },
  {
    id: 'task-4',
    title: 'Chuẩn bị nội dung tập huấn giáo viên đợt 3',
    description: 'Soạn tài liệu và lịch tập huấn cho 20 giáo viên tham gia đợt tiếp theo.',
    programId: 'proj-teacher-training',
    programName: 'Teacher Training Fellowship',
    teamId: 'team-education',
    assigneeId: 'u-001',
    assigneeName: 'Sarah Johnson',
    assigneeInitials: 'SJ',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-08-05',
    dependsOnTaskIds: [],
    comments: [],
    updatedAt: '3 ngày trước',
  },
  {
    id: 'task-5',
    title: 'Lắp đặt thiết bị mạng tại 2 trung tâm cộng đồng',
    description: 'Triển khai router và điểm phát wifi công cộng.',
    programId: 'proj-community-digital',
    programName: 'Community Digital Infrastructure',
    teamId: 'team-tech',
    assigneeId: 'u-004',
    assigneeName: 'Elena Lopez',
    assigneeInitials: 'EL',
    priority: 'high',
    status: 'blocked',
    dueDate: '2026-07-05',
    dependsOnTaskIds: ['task-2'],
    comments: [],
    updatedAt: 'Hôm qua',
  },
  {
    id: 'task-6',
    title: 'Tổng hợp phản hồi phụ huynh học kỳ 1',
    description: 'Khảo sát nhanh mức độ hài lòng của phụ huynh về chương trình.',
    programId: 'proj-rural-edu',
    programName: 'Rural Education',
    teamId: 'team-education',
    assigneeId: 'u-001',
    assigneeName: 'Sarah Johnson',
    assigneeInitials: 'SJ',
    priority: 'low',
    status: 'done',
    dueDate: '2026-06-30',
    dependsOnTaskIds: [],
    comments: [],
    updatedAt: '1 tuần trước',
  },
  {
    id: 'task-7',
    title: 'Chốt danh sách hộ vay vòng 2',
    description: 'Xét duyệt hồ sơ vay vốn cho nhóm phụ nữ đợt tiếp theo.',
    programId: 'proj-microfinance',
    programName: 'Women Microfinance Circles',
    teamId: 'team-economic',
    assigneeId: 'u-006',
    assigneeName: 'Grace Owusu',
    assigneeInitials: 'GO',
    priority: 'medium',
    status: 'todo',
    dueDate: null,
    dependsOnTaskIds: [],
    comments: [],
    updatedAt: '4 ngày trước',
  },
  {
    id: 'task-8',
    title: 'Diễn tập ứng phó lũ lụt khu vực miền Trung',
    description: 'Tổ chức diễn tập cùng chính quyền địa phương.',
    programId: 'proj-disaster-relief',
    programName: 'Disaster Relief Readiness',
    teamId: 'team-emergency',
    assigneeId: 'u-002',
    assigneeName: 'Marcus Tran',
    assigneeInitials: 'MT',
    priority: 'high',
    status: 'in_progress',
    dueDate: '2026-07-08',
    dependsOnTaskIds: [],
    comments: [],
    updatedAt: '4 giờ trước',
  },
];

export interface ListTasksParams {
  assigneeId?: string;
  status?: TaskStatus | 'all';
  programId?: string;
}

export async function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  let result = tasks;
  if (params.assigneeId) result = result.filter((t) => t.assigneeId === params.assigneeId);
  if (params.status && params.status !== 'all') result = result.filter((t) => t.status === params.status);
  if (params.programId) result = result.filter((t) => t.programId === params.programId);
  return delay([...result]);
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  tasks = tasks.map((t) => (t.id === id ? { ...t, status, updatedAt: 'vừa xong' } : t));
  return delay(tasks.find((t) => t.id === id)!);
}

export async function assignTask(id: string, assigneeName: string, assigneeInitials: string): Promise<Task> {
  tasks = tasks.map((t) =>
    t.id === id
      ? { ...t, assigneeName, assigneeInitials, assigneeId: nextId('u'), updatedAt: 'vừa xong' }
      : t,
  );
  return delay(tasks.find((t) => t.id === id)!);
}

export async function setTaskDueDate(id: string, dueDate: string): Promise<Task> {
  tasks = tasks.map((t) => (t.id === id ? { ...t, dueDate, updatedAt: 'vừa xong' } : t));
  return delay(tasks.find((t) => t.id === id)!);
}

export async function addTaskComment(id: string, content: string, author: string, authorInitials: string): Promise<Task> {
  const comment: TaskComment = {
    id: nextId('comment'),
    author,
    authorInitials,
    content,
    createdAt: 'vừa xong',
  };
  tasks = tasks.map((t) => (t.id === id ? { ...t, comments: [...t.comments, comment] } : t));
  return delay(tasks.find((t) => t.id === id)!);
}

export function taskPriorityLabel(priority: TaskPriority): string {
  return { low: 'Thấp', medium: 'Trung bình', high: 'Cao' }[priority];
}

export function taskStatusLabel(status: TaskStatus): string {
  return { todo: 'Chưa bắt đầu', in_progress: 'Đang làm', blocked: 'Đang bị chặn', done: 'Hoàn thành' }[status];
}
