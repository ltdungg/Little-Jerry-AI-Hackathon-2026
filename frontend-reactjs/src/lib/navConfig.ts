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
    label: 'Điều phối công việc',
    icon: 'Workflow',
    items: [
      {
        label: 'Chương trình',
        path: '/projects',
        icon: 'FolderKanban',
        blurb: 'Theo dõi sức khoẻ và tiến độ của mọi chương trình đang hoạt động.',
        features: [],
      },
      {
        label: 'Nhiệm vụ',
        path: '/tasks',
        icon: 'CheckSquare',
        blurb: 'Toàn bộ nhiệm vụ của các chương trình và nhóm.',
        features: [
          'Nhiệm vụ quá hạn, chưa có người phụ trách, chưa có thời hạn',
          'Công việc phụ thuộc giữa các nhiệm vụ',
          'Bình luận và tài liệu đính kèm trên từng nhiệm vụ',
        ],
      },
      {
        label: 'Cập nhật hằng tuần',
        path: '/weekly-updates',
        icon: 'CalendarClock',
        blurb: 'Quản lý và tổng hợp báo cáo tiến độ hằng tuần của các nhóm.',
        features: [
          'Hệ thống tự tổng hợp bản nháp báo cáo nhóm và toàn tổ chức',
          'Hiển thị người chưa gửi báo cáo và gửi nhắc nhở',
          'Phê duyệt, công bố và tải báo cáo dưới dạng tài liệu',
        ],
      },
      {
        label: 'Khó khăn',
        path: '/issues',
        icon: 'AlertTriangle',
        blurb: 'Ghi nhận, theo dõi và giải quyết khó khăn của tổ chức.',
        features: [
          'Trí tuệ nhân tạo đề xuất khó khăn phát hiện từ hoạt động thực tế',
          'Mức độ ảnh hưởng: Thấp, Trung bình, Cao, Nghiêm trọng',
          'Cơ chế báo động và nâng cấp xử lý khi quá hạn',
        ],
      },
      {
        label: 'Quyết định',
        path: '/decisions',
        icon: 'Gavel',
        blurb: 'Kho lưu trữ quyết định cùng lý do, phương án và người phê duyệt.',
        features: [
          'Trí tuệ nhân tạo đề xuất quyết định, con người xác nhận trước khi chính thức',
          'Lọc theo nhóm, chương trình, người phê duyệt, thời gian',
          'Theo dõi quyết định đã được thay thế bởi quyết định mới',
        ],
      },
      {
        label: 'Cuộc họp',
        path: '/meetings',
        icon: 'CalendarDays',
        blurb: 'Nội dung, tóm tắt và việc cần làm sau mỗi cuộc họp.',
        features: [
          'Tự động tạo tóm tắt, quyết định đề xuất và danh sách công việc',
          'Xác nhận hoặc từ chối nhiệm vụ được đề xuất sau họp',
          'Gửi nội dung sau cuộc họp cho người tham gia',
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
    ],
  },
  {
    label: 'Báo cáo',
    icon: 'BarChart3',
    items: [
      {
        label: 'Bảng thông tin của nhóm',
        path: '/reports/team',
        icon: 'BarChart2',
        blurb: 'Tổng hợp báo cáo, kết quả nổi bật và khó khăn của nhóm.',
        features: [
          'Tổng hợp báo cáo của tất cả thành viên trong nhóm',
          'Ưu tiên của tuần tiếp theo do trưởng nhóm chốt',
        ],
      },
      {
        label: 'Bảng thông tin lãnh đạo',
        path: '/reports/leadership',
        icon: 'TrendingUp',
        blurb: 'Toàn cảnh tổ chức dành cho ban lãnh đạo.',
        features: [
          'Chương trình có nguy cơ chậm, khó khăn nghiêm trọng, quyết định chờ duyệt',
          'Bản tóm tắt hằng tuần do trí tuệ nhân tạo tự động tạo',
        ],
      },
      {
        label: 'Báo cáo hằng tuần',
        path: '/reports/weekly',
        icon: 'FileText',
        blurb: 'Báo cáo tiến độ hằng tuần theo nhóm và toàn tổ chức.',
        features: [
          'Tự động tổng hợp từ cập nhật của các thành viên',
          'Người điều phối kiểm tra trước khi công bố',
        ],
      },
      {
        label: 'Báo cáo đã xuất',
        path: '/reports/exported',
        icon: 'Download',
        blurb: 'Kho báo cáo đã được xuất ra dưới dạng tài liệu.',
        features: ['Tải lại báo cáo các tuần hoặc tháng trước dưới dạng tài liệu'],
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
