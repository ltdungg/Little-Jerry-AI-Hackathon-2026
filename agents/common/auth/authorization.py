from enum import IntEnum
from typing import List
from ..clients.agent_client import RequestContext

class Role(IntEnum):
    PLATFORM_ADMIN = 5
    PROGRAM_DIRECTOR = 4
    PROJECT_MANAGER = 3
    KNOWLEDGE_ADMIN = 2
    NPO_STAFF = 1
    AUDITOR = 0

class AuthorizationError(Exception):
    pass

class TenantProjectACL:
    def has_access(self, user_role: Role, tenant_id: str, project_id: str) -> bool:
        return True

def check_access(context: RequestContext, tenant_id: str, project_ids: List[str], required_role: Role) -> bool:
    # Logic to check context.user_id against ACL
    return True
