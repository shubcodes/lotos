#!/usr/bin/env python3
"""
Arcade.dev Email Reader
Uses Arcade.dev's Gmail toolkit to read emails via their API
"""

import json
import os
import urllib.request
import urllib.parse
from typing import Dict, List, Optional
from datetime import datetime


class ArcadeEmailReader:
    """Client for reading emails via Arcade.dev Gmail toolkit"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Arcade.dev client
        
        Args:
            api_key: Your Arcade.dev API key (or set ARCADE_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("ARCADE_API_KEY")
        self.base_url = "https://api.arcade.dev"
        
        if not self.api_key:
            raise ValueError(
                "Arcade API key required. Set ARCADE_API_KEY environment variable "
                "or pass api_key parameter"
            )
    
    def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict:
        """Make HTTP request to Arcade.dev API"""
        url = f"{self.base_url}{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        req_data = None
        if data:
            req_data = json.dumps(data).encode('utf-8')
        
        request = urllib.request.Request(url, data=req_data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            raise Exception(f"HTTP {e.code}: {error_body}")
    
    def start_auth(self, user_id: str, scopes: List[str] = None) -> Dict:
        """
        Start OAuth authorization flow for Gmail access
        
        Args:
            user_id: User identifier (e.g., email address)
            scopes: OAuth scopes (defaults to Gmail readonly)
        
        Returns:
            Authorization response with URL for user to visit
        """
        if scopes is None:
            scopes = ["https://www.googleapis.com/auth/gmail.readonly"]
        
        data = {
            "user_id": user_id,
            "provider": "google",
            "scopes": scopes
        }
        
        return self._make_request("/auth/start", method="POST", data=data)
    
    def wait_for_auth_completion(self, auth_response: Dict) -> Dict:
        """
        Wait for OAuth authorization to complete
        
        Args:
            auth_response: Response from start_auth()
        
        Returns:
            Completion status
        """
        auth_id = auth_response.get("auth_id")
        if not auth_id:
            raise ValueError("auth_id not found in auth_response")
        
        endpoint = f"/auth/{auth_id}/wait"
        return self._make_request(endpoint)
    
    def list_emails(self, user_id: str, n_emails: int = 10) -> List[Dict]:
        """
        List recent emails from Gmail
        
        Args:
            user_id: User identifier
            n_emails: Number of emails to retrieve
        
        Returns:
            List of email summaries
        """
        data = {
            "tool": "Gmail.ListEmails",
            "parameters": {
                "n_emails": n_emails
            },
            "user_id": user_id
        }
        
        response = self._make_request("/tools/execute", method="POST", data=data)
        return response.get("result", [])
    
    def read_email(self, user_id: str, email_id: str) -> Dict:
        """
        Read a specific email by ID
        
        Args:
            user_id: User identifier
            email_id: Gmail message ID
        
        Returns:
            Full email content
        """
        data = {
            "tool": "Gmail.ReadEmail",
            "parameters": {
                "email_id": email_id
            },
            "user_id": user_id
        }
        
        response = self._make_request("/tools/execute", method="POST", data=data)
        return response.get("result", {})
    
    def search_emails(self, user_id: str, query: str, max_results: int = 10) -> List[Dict]:
        """
        Search emails using Gmail search syntax
        
        Args:
            user_id: User identifier
            query: Gmail search query (e.g., "from:example@gmail.com")
            max_results: Maximum number of results
        
        Returns:
            List of matching emails
        """
        data = {
            "tool": "Gmail.SearchEmails",
            "parameters": {
                "query": query,
                "max_results": max_results
            },
            "user_id": user_id
        }
        
        response = self._make_request("/tools/execute", method="POST", data=data)
        return response.get("result", [])


def main():
    """Example usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Read emails via Arcade.dev")
    parser.add_argument("--api-key", help="Arcade.dev API key", default=None)
    parser.add_argument("--user-id", required=True, help="User identifier (email)")
    parser.add_argument("--auth", action="store_true", help="Start authorization flow")
    parser.add_argument("--list", type=int, default=0, metavar="N", 
                       help="List N recent emails")
    parser.add_argument("--search", help="Search emails with Gmail query")
    
    args = parser.parse_args()
    
    try:
        client = ArcadeEmailReader(api_key=args.api_key)
        
        if args.auth:
            print("🔐 Starting authorization...")
            auth_response = client.start_auth(args.user_id)
            
            if auth_response.get("status") != "completed":
                print(f"\n✅ Authorization URL:")
                print(f"   {auth_response.get('url')}")
                print("\nPlease visit the URL above to authorize Gmail access.")
                print("Waiting for authorization...")
                
                completion = client.wait_for_auth_completion(auth_response)
                if completion.get("status") == "completed":
                    print("✅ Authorization completed!")
                else:
                    print(f"⚠️  Authorization status: {completion.get('status')}")
            else:
                print("✅ Already authorized!")
        
        if args.list > 0:
            print(f"\n📧 Fetching {args.list} recent emails...")
            emails = client.list_emails(args.user_id, n_emails=args.list)
            
            if emails:
                print(f"\n✅ Found {len(emails)} emails:\n")
                for i, email in enumerate(emails, 1):
                    subject = email.get("subject", "No subject")
                    sender = email.get("from", "Unknown sender")
                    date = email.get("date", "Unknown date")
                    print(f"{i}. {subject}")
                    print(f"   From: {sender}")
                    print(f"   Date: {date}\n")
            else:
                print("No emails found.")
        
        if args.search:
            print(f"\n🔍 Searching emails: {args.search}")
            emails = client.search_emails(args.user_id, args.search)
            
            if emails:
                print(f"\n✅ Found {len(emails)} matching emails:\n")
                for i, email in enumerate(emails, 1):
                    subject = email.get("subject", "No subject")
                    sender = email.get("from", "Unknown sender")
                    print(f"{i}. {subject} (from: {sender})")
            else:
                print("No matching emails found.")
        
        if not args.auth and args.list == 0 and not args.search:
            print("Use --auth to authorize, --list N to list emails, or --search QUERY to search")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
