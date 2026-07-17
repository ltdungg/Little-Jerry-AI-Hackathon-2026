import pytest
import boto3
from moto import mock_aws

@pytest.fixture
def aws_credentials():
    import os
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"

@pytest.fixture
def dynamodb(aws_credentials):
    with mock_aws():
        yield boto3.resource("dynamodb", region_name="us-east-1")
