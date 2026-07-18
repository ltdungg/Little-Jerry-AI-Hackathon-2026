### Imports
import json
import os
import uuid
import boto3


### Execute

# Lazy initialize AWS Bedrock AgentCore client
agentcore_client = None


def get_agentcore_client():
    """Get Bedrock AgentCore client, initializing it lazily on first use"""
    global agentcore_client
    if agentcore_client is None:
        agentcore_client = boto3.client("bedrock-agentcore")
    return agentcore_client


# Lambda handler
def lambda_handler(event, context):
    """
    Receives payload from receiver Lambda and invokes AgentCore runtime synchronously
    """
    print(f"🟡 Invoker received event: {json.dumps(event)}")

    try:
        # Read environment variables
        AGENT_RUNTIME_ARN = os.environ.get("AGENT_RUNTIME_ARN")

        # Generate unique session ID for this invocation (isolated microVM)
        session_id = str(uuid.uuid4())

        print(f"🟢 Invoking AgentCore runtime: {AGENT_RUNTIME_ARN}")
        print(f"🟢 Session ID: {session_id}")

        # Extract useful fields for the agent
        slack_event = event.get("slack_event", {})
        inner_event = slack_event.get("event", {})
        channel_id = inner_event.get("channel", "")
        text = inner_event.get("text", "")
        
        # Enrich the event so the agent can easily find it
        event["channel_id"] = channel_id
        event["user_message"] = text

        # Invoke AgentCore runtime synchronously (can take minutes)
        client = get_agentcore_client()
        response = client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            runtimeSessionId=session_id,
            payload=json.dumps(event).encode("utf-8"),
        )

        print(f"🟢 AgentCore runtime invoked successfully")
        return {"statusCode": 200, "body": json.dumps({"message": "AgentCore invoked"})}

    except Exception as error:
        print(f"❌ Error invoking AgentCore: {str(error)}")
        # Return error but don't crash
        return {"statusCode": 500, "body": json.dumps({"error": str(error)})}
