import structlog
from typing import Any

def create_logger(name: str, correlation_id: str, workflow_id: str, tenant_id: str):
    return structlog.get_logger(name, correlation_id=correlation_id, workflow_id=workflow_id, tenant_id=tenant_id)

class MetricCollector:
    def emit(self, name: str, value: Any, unit: str, dimensions: dict):
        pass
