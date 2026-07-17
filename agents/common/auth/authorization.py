"""Role-based authorization for a single-tenant NPO (AIV).

Multi-tenant isolation was removed: the platform serves one organization, so
authorization is about WHAT each role may do (capabilities), not tenant scoping.
"""
from __future__ import annotations

from enum import Enum
from typing import Iterable

from agents.common.contracts.context import UserRole


class Capability(str, Enum):
    KNOWLEDGE_READ = "knowledge:read"      # Hỏi đáp tri thức, tra cứu quyết định/ngữ cảnh
    PROJECT_READ = "project:read"          # Xem dự án, milestone
    TASK_READ = "task:read"                # Xem task/blocker
    TASK_WRITE = "task:write"              # Tạo/sửa task, cập nhật blocker
    STATUS_WRITE = "status:write"          # Gửi cập nhật trạng thái (weekly update)
    REPORT_READ = "report:read"            # Xem báo cáo
    REPORT_CREATE = "report:create"        # Tạo báo cáo tuần
    COMM_DRAFT = "comm:draft"              # Soạn bản nháp thông báo/Slack
    COMM_SEND = "comm:send"                # Gửi thông báo thật
    APPROVE = "approve"                    # Duyệt hành động cần xác nhận
    WORKFLOW_MANAGE = "workflow:manage"    # Huỷ/retry workflow, quản trị


# Capability set for each role (single organization).
ROLE_CAPABILITIES: dict[UserRole, set[Capability]] = {
    UserRole.leader: {
        Capability.KNOWLEDGE_READ, Capability.PROJECT_READ, Capability.TASK_READ,
        Capability.TASK_WRITE, Capability.STATUS_WRITE, Capability.REPORT_READ,
        Capability.REPORT_CREATE, Capability.COMM_DRAFT, Capability.COMM_SEND,
        Capability.APPROVE, Capability.WORKFLOW_MANAGE,
    },
    UserRole.project_manager: {
        Capability.KNOWLEDGE_READ, Capability.PROJECT_READ, Capability.TASK_READ,
        Capability.TASK_WRITE, Capability.STATUS_WRITE, Capability.REPORT_READ,
        Capability.REPORT_CREATE, Capability.COMM_DRAFT, Capability.APPROVE,
    },
    UserRole.team_member: {
        Capability.KNOWLEDGE_READ, Capability.PROJECT_READ, Capability.TASK_READ,
        Capability.TASK_WRITE, Capability.STATUS_WRITE, Capability.REPORT_READ,
    },
    UserRole.volunteer: {
        Capability.KNOWLEDGE_READ, Capability.PROJECT_READ, Capability.TASK_READ,
        Capability.STATUS_WRITE,
    },
}


class AuthorizationError(Exception):
    """Raised when a role lacks a required capability."""


def capabilities_for(role: UserRole) -> set[Capability]:
    return ROLE_CAPABILITIES.get(role, set())


def has_capability(role: UserRole, capability: Capability) -> bool:
    return capability in capabilities_for(role)


def require_capability(role: UserRole, capability: Capability) -> None:
    if not has_capability(role, capability):
        raise AuthorizationError(
            f"Vai trò '{role.value}' không có quyền '{capability.value}'."
        )


def has_any(role: UserRole, capabilities: Iterable[Capability]) -> bool:
    caps = capabilities_for(role)
    return any(c in caps for c in capabilities)
