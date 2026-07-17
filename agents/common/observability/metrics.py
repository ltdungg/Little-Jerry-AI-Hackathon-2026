import time
from typing import Any
import structlog

logger = structlog.get_logger()

class MetricCollector:
    def __init__(self):
        self.metrics: list[dict[str, Any]] = []

    def record(self, name: str, value: float, unit: str = "Count", dimensions: dict | None = None):
        entry = {"metric_name": name, "value": value, "unit": unit, "dimensions": dimensions or {}}
        self.metrics.append(entry)
        logger.info("metric_recorded", **entry)

    def flush(self):
        result = self.metrics.copy()
        self.metrics.clear()
        return result

def create_metric_collector() -> MetricCollector:
    return MetricCollector()
