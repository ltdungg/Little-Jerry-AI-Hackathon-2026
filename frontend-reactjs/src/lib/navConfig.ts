import type { NavGroup } from '../types';

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Trang chủ',
    icon: 'Home',
    items: [
      {
        label: 'Trang chủ',
        path: '/',
        icon: 'LayoutDashboard',
        blurb: 'Tổng quan công việc, cập nhật và thông báo.',
        features: [
          'Nhiệm vụ, cập nhật và thông báo quan trọng nhất trong ngày',
          'Tổng hợp nhanh tình hình các chương trình bạn tham gia',
        ],
      },
    ],
  },
  {
    label: 'Trợ lý trí tuệ nhân tạo',
    icon: 'Sparkles',
    items: [
      {
        label: 'Trợ lý trí tuệ nhân tạo',
        path: '/assistant',
        icon: 'MessageCircle',
        blurb: 'Hỏi, tra cứu lịch sử và các câu trả lời đã lưu.',
        features: [],
      },
    ],
  },
  {
    label: 'Công việc',
    icon: 'Workflow',
    items: [
      {
        label: 'Dự án',
        path: '/projects',
        icon: 'FolderKanban',
        blurb: 'Danh sách dự án — bấm vào một dự án để xem toàn bộ thông tin, nhiệm vụ, báo cáo và bàn giao.',
        features: [],
      },
      {
        label: 'Bàn giao',
        path: '/handoffs',
        icon: 'ArrowLeftRight',
        blurb: 'Quản lý các bản bàn giao công việc — theo dõi tiến trình và phê duyệt.',
        features: [
          'Xem danh sách tất cả bàn giao theo trạng thái',
          'Chi tiết từng bàn giao với đầu việc, tài liệu, bối cảnh',
          'Phê duyệt và giao nhận bàn giao',
        ],
      },
    ],
  },
  {
    label: 'Con người',
    icon: 'Users',
    items: [
      {
        label: 'Các nhóm',
        path: '/teams',
        icon: 'Users',
        blurb: 'Danh sách các nhóm, mục tiêu và chương trình phụ trách.',
        features: [
          'Thành viên, vai trò và chương trình của từng nhóm',
          'Tình trạng hoạt động và báo cáo gần nhất của nhóm',
        ],
      },
      {
        label: 'Danh sách thành viên',
        path: '/members',
        icon: 'Contact',
        blurb: 'Toàn bộ nhân viên và tình nguyện viên trong tổ chức.',
        features: [
          'Vai trò, nhóm và chương trình được gán',
          'Thời hạn tham gia đối với tình nguyện viên',
        ],
      },
      {
        label: 'Kết thúc tham gia',
        path: '/offboarding',
        icon: 'LogOut',
        blurb: 'Quản lý người sắp kết thúc thời gian tham gia và thu hồi quyền.',
        features: [
          'Danh sách người sắp hết hạn truy cập và quyền cần thu hồi',
          'Xác nhận hoàn thành bàn giao trước ngày kết thúc',
        ],
      },
      {
        label: 'Sơ đồ tổ chức',
        path: '/org-chart',
        icon: 'Network',
        blurb: 'Cơ cấu tổ chức phân cấp từ lãnh đạo xuống từng nhóm và cá nhân.',
        features: [
          'Xem theo cây phân cấp từ cấp cao xuống thấp',
          'Bấm vào một node để thu gọn/mở rộng nhánh dưới quyền',
        ],
      },
    ],
  },
  {
    label: 'Kho kiến thức',
    icon: 'BookOpen',
    items: [
      {
        label: 'Thư viện tài liệu',
        path: '/knowledge',
        icon: 'Library',
        blurb: 'Toàn bộ tài liệu của tổ chức ở một nơi duy nhất.',
        features: [
          'Tìm kiếm và lọc theo nhóm, chương trình, loại tài liệu',
          'Trí tuệ nhân tạo phát hiện tài liệu trùng lặp hoặc mâu thuẫn',
          'Cảnh báo tài liệu lâu không được cập nhật',
        ],
      },
      {
        label: 'Kho quyết định',
        path: '/knowledge/decisions',
        icon: 'Archive',
        blurb: 'Lưu trữ toàn bộ quyết định đã được xác nhận của tổ chức.',
        features: ['Tra cứu nhanh lý do và bối cảnh của từng quyết định trong quá khứ'],
      },
      {
        label: 'Tìm kiếm tri thức',
        path: '/knowledge/search',
        icon: 'Search',
        blurb: 'Tìm kiếm tài liệu từ Knowledge Base của tổ chức.',
        features: [
          'Tìm kiếm chính xác trong kho tài liệu nội bộ',
          'Hiển thị điểm liên quan và nguồn tài liệu',
        ],
      },
      {
        label: 'Kiểm tra kiến thức',
        path: '/knowledge/check',
        icon: 'BadgeCheck',
        blurb: 'Rà soát và xác nhận độ chính xác của kiến thức đang lưu trữ.',
        features: [
          'Yêu cầu kiểm tra tài liệu định kỳ',
          'Đánh dấu tài liệu lỗi thời và chỉ định tài liệu thay thế',
        ],
      },
    ],
  },
  {
    label: 'Quản trị',
    icon: 'ShieldCheck',
    items: [
      {
        label: 'Người dùng',
        path: '/admin/users',
        icon: 'UserCog',
        blurb: 'Quản lý tài khoản nhân viên và tình nguyện viên.',
        features: [
          'Tạo, khoá tài khoản và gán nhóm, vai trò, chương trình',
          'Cấu hình ngày bắt đầu / kết thúc tham gia',
        ],
      },
      {
        label: 'Vai trò và quyền',
        path: '/admin/roles',
        icon: 'KeyRound',
        blurb: 'Kiểm soát quyền xem, tạo, chỉnh sửa, phê duyệt và chia sẻ dữ liệu.',
        features: ['Phân quyền chi tiết theo vai trò và theo nhóm'],
      },
      {
        label: 'Nguồn dữ liệu',
        path: '/admin/data-sources',
        icon: 'Database',
        blurb: 'Kết nối thư điện tử, công cụ nhắn tin, kho tài liệu, lịch họp.',
        features: ['Kiểm tra kết nối, xem lỗi và thực hiện đồng bộ thủ công'],
      },
      {
        label: 'Đồng bộ dữ liệu',
        path: '/admin/sync',
        icon: 'RefreshCcw',
        blurb: 'Theo dõi lịch đồng bộ và trạng thái các nguồn dữ liệu.',
        features: ['Xem lần đồng bộ gần nhất, lỗi phát sinh, tạm dừng kết nối'],
      },
      {
        label: 'Cấu hình trí tuệ nhân tạo',
        path: '/admin/ai-config',
        icon: 'Settings2',
        blurb: 'Cấu hình cách trợ lý AI được phép hoạt động trong hệ thống.',
        features: ['Giới hạn phạm vi trả lời, nguồn dữ liệu và mức độ tự động hoá'],
      },
      {
        label: 'Nhật ký hoạt động',
        path: '/admin/activity-log',
        icon: 'ScrollText',
        blurb: 'Ghi lại toàn bộ hoạt động xem, chỉnh sửa, phê duyệt trong hệ thống.',
        features: [
          'Ai đã xem, chỉnh sửa, phê duyệt quyết định, xuất dữ liệu',
          'Nội dung và nguồn được trí tuệ nhân tạo sử dụng để trả lời',
        ],
      },
      {
        label: 'Theo dõi hệ thống',
        path: '/admin/system-monitor',
        icon: 'Activity',
        blurb: 'Tình trạng vận hành chung của nền tảng.',
        features: ['Giám sát lỗi đồng bộ dữ liệu và tình trạng tài khoản bị khoá'],
      },
    ],
  },
];

export const ALL_NAV_LEAVES = NAV_GROUPS.flatMap((g) => g.items);
