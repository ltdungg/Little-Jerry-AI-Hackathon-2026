import uuid
import structlog
from lambdas.common.utils import build_response

logger = structlog.get_logger()

def lambda_handler(event, context):
    confirmation_token = str(uuid.uuid4())
    logger.info("slack_draft_created", token=confirmation_token)
    return build_response(200, {
        "preview": f"Draft for {event['channel']}: {event['message']}",
        "confirmation_token": confirmation_token
    })
