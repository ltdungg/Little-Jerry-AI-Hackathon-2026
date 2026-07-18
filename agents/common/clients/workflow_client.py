"""DynamoDB access for the WorkflowState single-table (single-tenant AIV).

Simplified key pattern (mirrors dynamodb_client.py's style):
  Workflow : PK=WORKFLOW#<workflowId>   SK=META
"""
import os
from typing import Any

import boto3


def _table():
    table_name = os.environ.get("WORKFLOW_TABLE", "WorkflowState")
    region = os.environ.get("AWS_REGION", "ap-southeast-2")
    return boto3.resource("dynamodb", region_name=region).Table(table_name)


class WorkflowStateClient:
    def __init__(self):
        self.table = _table()

    def create(self, workflow_id: str, item: dict[str, Any]) -> None:
        full_item = {**item, "PK": f"WORKFLOW#{workflow_id}", "SK": "META", "workflow_id": workflow_id}
        self.table.put_item(Item=full_item)

    def get(self, workflow_id: str) -> dict[str, Any] | None:
        resp = self.table.get_item(Key={"PK": f"WORKFLOW#{workflow_id}", "SK": "META"})
        return resp.get("Item")

    def update(self, workflow_id: str, updates: dict[str, Any]) -> None:
        expr_values = {f":{k}": v for k, v in updates.items()}
        self.table.update_item(
            Key={"PK": f"WORKFLOW#{workflow_id}", "SK": "META"},
            UpdateExpression="SET " + ", ".join(f"#{k} = :{k}" for k in updates),
            ExpressionAttributeNames={f"#{k}": k for k in updates},
            ExpressionAttributeValues=expr_values,
        )
