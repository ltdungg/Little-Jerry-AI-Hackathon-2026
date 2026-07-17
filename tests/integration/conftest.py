import pytest
import boto3
from moto import mock_aws

@pytest.fixture
def dynamodb_client():
    with mock_aws():
        yield boto3.resource("dynamodb", region_name="us-east-1")
