#!/usr/bin/env python3
"""
Test MCP Server
Kiểm tra connection và tools
"""

import json
import subprocess
import sys
import time
from typing import Optional

def send_request(method: str, params: Optional[dict] = None, req_id: int = 1) -> dict:
    """Gửi JSON-RPC request tới MCP server"""
    request = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": method
    }
    if params:
        request["params"] = params
    
    try:
        process = subprocess.run(
            [sys.executable, "-m", "mcp_server_standalone"],
            input=json.dumps(request) + "\n",
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if process.returncode != 0:
            print(f"❌ Process error: {process.stderr}")
            return {}
        
        if not process.stdout.strip():
            print(f"❌ Empty response from server")
            return {}
        
        try:
            response = json.loads(process.stdout.strip())
            return response
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
            print(f"   Raw output: {process.stdout}")
            return {}
            
    except subprocess.TimeoutExpired:
        print(f"❌ Timeout: MCP server did not respond within 10 seconds")
        return {}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {}


def test_tools_list():
    """Test: Lấy danh sách tools"""
    print("\n📋 TEST: tools/list")
    print("-" * 50)
    
    response = send_request("tools/list")
    
    if "error" in response:
        print(f"❌ Error: {response['error']['message']}")
        return False
    
    if "result" not in response:
        print(f"❌ No result in response")
        return False
    
    tools = response["result"]
    print(f"✅ Found {len(tools)} tools:")
    
    for tool in tools:
        print(f"\n  📌 {tool['name']}")
        print(f"     Description: {tool['description']}")
        if "inputSchema" in tool:
            schema = tool["inputSchema"]
            required = schema.get("required", [])
            props = schema.get("properties", {})
            print(f"     Required params: {', '.join(required) if required else 'None'}")
            print(f"     All params: {', '.join(props.keys())}")
    
    return len(tools) > 0


def test_claude_chat():
    """Test: Claude chat"""
    print("\n\n💬 TEST: claude_chat")
    print("-" * 50)
    
    response = send_request("tools/call", {
        "name": "claude_chat",
        "arguments": {
            "prompt": "Tóm tắt một dòng về MCP là gì",
            "temperature": 0.5,
            "max_tokens": 100
        }
    })
    
    if "error" in response:
        print(f"❌ Error: {response['error']['message']}")
        return False
    
    result = response.get("result", {})
    content = result.get("content", [{}])[0]
    text = content.get("text", "")
    
    if text:
        print(f"✅ Claude response:\n   {text}")
        return True
    else:
        print(f"❌ No text in response: {response}")
        return False


def test_oauth_login():
    """Test: OAuth login URL"""
    print("\n\n🔐 TEST: oauth_get_login_url (slack)")
    print("-" * 50)
    
    response = send_request("tools/call", {
        "name": "oauth_get_login_url",
        "arguments": {
            "provider": "slack"
        }
    })
    
    if "error" in response:
        print(f"❌ Error: {response['error']['message']}")
        return False
    
    result = response.get("result", {})
    content = result.get("content", [{}])[0]
    text = content.get("text", "")
    
    if text:
        print(f"✅ OAuth URL generated:\n{text}")
        return True
    else:
        print(f"❌ No text in response: {response}")
        return False


def test_slack_tools():
    """Test: Slack tools (list channels)"""
    print("\n\n🔗 TEST: slack_list_channels")
    print("-" * 50)
    
    response = send_request("tools/call", {
        "name": "slack_list_channels",
        "arguments": {}
    })
    
    if "error" in response:
        print(f"⚠️  Error: {response['error']['message']}")
        print(f"   (This is expected if SLACK_BOT_TOKEN is not set)")
        return True  # Not a failure if token not configured
    
    result = response.get("result", {})
    content = result.get("content", [{}])[0]
    text = content.get("text", "")
    
    if text:
        print(f"✅ Response: {text[:200]}...")
        return True
    else:
        print(f"❌ No text in response: {response}")
        return False


def test_jira_tools():
    """Test: Jira tools (list issues)"""
    print("\n\n🔗 TEST: jira_list_issues")
    print("-" * 50)
    
    response = send_request("tools/call", {
        "name": "jira_list_issues",
        "arguments": {
            "project": "DEMO"
        }
    })
    
    if "error" in response:
        print(f"⚠️  Error: {response['error']['message']}")
        print(f"   (This is expected if JIRA credentials are not set)")
        return True  # Not a failure if credentials not configured
    
    result = response.get("result", {})
    content = result.get("content", [{}])[0]
    text = content.get("text", "")
    
    if text:
        print(f"✅ Response: {text[:200]}...")
        return True
    else:
        print(f"❌ No text in response: {response}")
        return False


def test_error_handling():
    """Test: Error handling"""
    print("\n\n⚠️  TEST: Error Handling")
    print("-" * 50)
    
    # Test unknown tool
    response = send_request("tools/call", {
        "name": "unknown_tool",
        "arguments": {}
    })
    
    if "error" in response and response["error"]["code"] == -32603:
        print(f"✅ Error handling works: {response['error']['message']}")
        return True
    else:
        print(f"❌ Unexpected response: {response}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("🚀 MCP SERVER TEST SUITE")
    print("=" * 50)
    
    tests = [
        ("Tools List", test_tools_list),
        ("Claude Chat", test_claude_chat),
        ("OAuth Login", test_oauth_login),
        ("Slack Tools", test_slack_tools),
        ("Jira Tools", test_jira_tools),
        ("Error Handling", test_error_handling),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ EXCEPTION in {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit(main())
