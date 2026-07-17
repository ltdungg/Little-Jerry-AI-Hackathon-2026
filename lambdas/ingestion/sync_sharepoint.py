import json
import os
from lambdas.ingestion.common import CheckpointManager, DocumentNormalizer, S3Writer

def lambda_handler(event, context):
    use_fixture = os.environ.get("USE_FIXTURE_MODE", "True") == "True"

    if use_fixture:
        with open("fixtures/sharepoint_sample.json", "r") as f:
            data = json.load(f)
    else:
        # Microsoft Graph API calls
        pass

    s3 = S3Writer()
    # Processing logic
    return {"status": "success"}
