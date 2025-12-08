#!/usr/bin/env python3
"""
Test script to call Arcade MCP tool and demonstrate elicitation
"""

import json
import urllib.request
import urllib.parse

def call_mcp_tool(tool_name, arguments, session_id=None):
    """Call an MCP tool via HTTP"""
    url = "http://127.0.0.1:4000/mcp"
    
    request_data = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }
    
    if session_id:
        headers["mcp-session-id"] = session_id
    
    req = urllib.request.Request(
        url,
        data=json.dumps(request_data).encode('utf-8'),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            return json.loads(error_body)
        except:
            return {"error": {"code": e.code, "message": error_body}}

def test_arcade_tool():
    """Test the arcade.read_emails tool"""
    print("🧪 Testing Arcade.read_emails Tool")
    print("=" * 70)
    
    # Call without API key to trigger elicitation
    print("\n1. Calling arcade.read_emails without API key...")
    print("   (This should trigger form elicitation for API key)")
    
    result = call_mcp_tool(
        "arcade.read_emails",
        {
            "user_id": "test@example.com",
            "n_emails": 5
        }
    )
    
    print("\n📥 Response:")
    print(json.dumps(result, indent=2))
    
    # Check if elicitation was triggered
    if "error" in result:
        error_code = result["error"].get("code")
        if error_code == -32001:  # ElicitationRequired error code
            print("\n✅ Elicitation triggered!")
            print("   The tool is asking for the API key via form elicitation")
        else:
            print(f"\n⚠️  Error: {result['error']}")
    else:
        print("\n✅ Tool executed successfully!")
        if "result" in result:
            print(f"   Result: {result['result']}")

if __name__ == "__main__":
    test_arcade_tool()
