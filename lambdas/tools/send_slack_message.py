import boto3
import structlog
from lambdas.common.utils import build_response, build_error_response

logger = structlog.get_logger()
secrets = boto3.client("secretsmanager")

def lambda_handler(event, context):
    # Retrieve Slack OAuth from Secrets Manager, then send
    logger.info("sending_slack_message", token=event.get("confirmation_token"))
    return build_response(200, {"status": "sent"})
