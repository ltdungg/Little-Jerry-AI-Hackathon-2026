import json
import os
import sys

# Force UTF-8 for standard output
sys.stdout.reconfigure(encoding='utf-8')

# Set environment variable before importing handler
os.environ["ORCHESTRATOR_RUNTIME_ARN"] = "arn:aws:bedrock-agentcore:ap-southeast-2:314567759962:runtime/npo_ai_dev_orchestrator-B70uwa2qrl"
os.environ["REGION"] = "ap-southeast-2"

# Ensure d:\AI-Hackathon is in sys.path
sys.path.append("d:\\AI-Hackathon")

from lambdas.api.handler import handle_chat
from lambdas.common.utils import build_request_context

def main():
    dataset_path = os.path.join(os.path.dirname(__file__), "evaluation_dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    cases = data.get("dataset", [])
    
    print(f"Running evaluation against {len(cases)} test cases...\n")
    
    for case in cases:
        question = case["question"]
        expected = case["expected"]
        
        print(f"Test ID: {case['id']}")
        print(f"Question: {question}")
        print(f"Expected: {expected}")
        
        # Build mock event and context
        event = {
            "requestContext": {
                "http": {
                    "path": "/v1/chat",
                    "method": "POST"
                }
            },
            "body": json.dumps({"message": question, "project_id": "proj-eval"})
        }
        
        request_ctx = build_request_context(
            {"sub": "test_user", "cognito:groups": "project_manager"},
            event
        )
        
        try:
            resp = handle_chat(event, request_ctx)
            if resp["statusCode"] == 200:
                body = json.loads(resp["body"])
                answer = body.get("answer", "")
                print(f"Agent Answer: {answer}")
                print(f"Status: SUCCESS")
            else:
                print(f"Error Response: {resp}")
                print(f"Status: FAILED")
        except Exception as e:
            print(f"Exception: {e}")
            print(f"Status: FAILED")
        
        print("-" * 50)

if __name__ == "__main__":
    main()
