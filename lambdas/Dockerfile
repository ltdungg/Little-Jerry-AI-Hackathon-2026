# syntax=docker/dockerfile:1

# AWS Lambda Python base image: ships the Runtime Interface Client (awslambdaric)
# and the correct ENTRYPOINT, so this image works directly as a Lambda function
# with package_type = "Image".
FROM public.ecr.aws/lambda/python:3.12

# Pinned uv for locked dependency resolution
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

# Resolve locked production dependencies and install them into the Lambda task
# root (not a uv virtualenv, so the Lambda runtime can import them directly).
COPY pyproject.toml uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project --no-hashes -o /tmp/requirements.txt \
    && pip install --no-cache-dir -r /tmp/requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Application source into the task root
COPY lambdas/ ${LAMBDA_TASK_ROOT}/lambdas/
COPY agents/common/ ${LAMBDA_TASK_ROOT}/agents/common/
COPY shared/ ${LAMBDA_TASK_ROOT}/shared/
# Sample fixtures used by ingestion Lambdas when USE_FIXTURE_MODE=true
COPY fixtures/ ${LAMBDA_TASK_ROOT}/fixtures/
# agents/ has no top-level __init__.py; add one so agents.common resolves
RUN touch ${LAMBDA_TASK_ROOT}/agents/__init__.py

# Default handler = API Lambda.
# Other functions reuse this image and override the handler via Terraform:
#   image_config { command = ["lambdas.ingestion.sync_sharepoint.lambda_handler"] }
#   image_config { command = ["lambdas.ingestion.sync_slack.lambda_handler"] }
CMD ["lambdas.api.handler.lambda_handler"]
