#!/usr/bin/env python3
"""
Arcade.dev Email Reader using official arcadepy SDK
Uses MCP elicitation for authorization when needed
"""

import os
import sys
from typing import Optional, List, Dict

try:
    from arcadepy import Arcade
    from arcadepy.exceptions import AuthorizationError
except ImportError:
    print("❌ arcadepy not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "arcadepy", "-q"])
    from arcadepy import Arcade
    from arcadepy.exceptions import AuthorizationError


class ArcadeEmailReader:
    """Email reader using Arcade.dev's official Python SDK"""
    
    def __init__(self, api_key: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize Arcade client
        
        Args:
            api_key: Arcade.dev API key (or set ARCADE_API_KEY env var)
            user_id: User identifier for your app (email, UUID, etc.)
        """
        self.api_key = api_key or os.getenv("ARCADE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Arcade API key required. Set ARCADE_API_KEY environment variable "
                "or pass api_key parameter"
            )
        
        self.client = Arcade(api_key=self.api_key)
        self.user_id = user_id
    
    def get_gmail_tools(self, user_id: Optional[str] = None):
        """
        Get Gmail tools from Arcade
        
        Args:
            user_id: User identifier (uses instance user_id if not provided)
        
        Returns:
            List of Gmail tools
        """
        user_id = user_id or self.user_id
        if not user_id:
            raise ValueError("user_id is required")
        
        try:
            # Get Gmail toolkit
            toolkit = self.client.tools.list(toolkit="gmail", limit=30)
            return toolkit.items
        except Exception as e:
            print(f"❌ Error fetching tools: {e}")
            raise
    
    def read_emails(self, user_id: Optional[str] = None, n_emails: int = 10) -> List[Dict]:
        """
        Read recent emails
        
        Args:
            user_id: User identifier
            n_emails: Number of emails to retrieve
        
        Returns:
            List of email dictionaries
        """
        user_id = user_id or self.user_id
        if not user_id:
            raise ValueError("user_id is required")
        
        try:
            # Get Gmail tools
            tools = self.get_gmail_tools(user_id)
            
            # Find the ListEmails tool
            list_tool = None
            for tool in tools:
                if "list" in tool.name.lower() or "email" in tool.name.lower():
                    list_tool = tool
                    break
            
            if not list_tool:
                # Try to find any Gmail tool that can list emails
                for tool in tools:
                    if "gmail" in tool.name.lower():
                        list_tool = tool
                        break
            
            if not list_tool:
                raise ValueError("Could not find Gmail list emails tool")
            
            # Execute the tool
            result = self.client.tools.execute(
                tool=list_tool.name,
                parameters={"n_emails": n_emails},
                user_id=user_id
            )
            
            return result.get("result", [])
        
        except AuthorizationError as e:
            # This is where we'd trigger MCP elicitation
            auth_url = str(e)
            raise AuthorizationNeededError(
                f"Authorization required. Please visit: {auth_url}",
                auth_url=auth_url,
                user_id=user_id
            )
        except Exception as e:
            print(f"❌ Error reading emails: {e}")
            raise
    
    def search_emails(self, user_id: Optional[str] = None, query: str = "", max_results: int = 10) -> List[Dict]:
        """
        Search emails using Gmail query syntax
        
        Args:
            user_id: User identifier
            query: Gmail search query
            max_results: Maximum results
        
        Returns:
            List of matching emails
        """
        user_id = user_id or self.user_id
        if not user_id:
            raise ValueError("user_id is required")
        
        try:
            tools = self.get_gmail_tools(user_id)
            
            # Find search tool
            search_tool = None
            for tool in tools:
                if "search" in tool.name.lower():
                    search_tool = tool
                    break
            
            if not search_tool:
                raise ValueError("Could not find Gmail search tool")
            
            result = self.client.tools.execute(
                tool=search_tool.name,
                parameters={"query": query, "max_results": max_results},
                user_id=user_id
            )
            
            return result.get("result", [])
        
        except AuthorizationError as e:
            auth_url = str(e)
            raise AuthorizationNeededError(
                f"Authorization required. Please visit: {auth_url}",
                auth_url=auth_url,
                user_id=user_id
            )
        except Exception as e:
            print(f"❌ Error searching emails: {e}")
            raise


class AuthorizationNeededError(Exception):
    """Custom exception for when authorization is needed"""
    def __init__(self, message: str, auth_url: str, user_id: str):
        super().__init__(message)
        self.auth_url = auth_url
        self.user_id = user_id


def main():
    """Main function with MCP elicitation support"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Read emails via Arcade.dev")
    parser.add_argument("--api-key", help="Arcade.dev API key", default=None)
    parser.add_argument("--user-id", required=True, help="User identifier (email)")
    parser.add_argument("--list", type=int, default=0, metavar="N", help="List N emails")
    parser.add_argument("--search", help="Search emails")
    
    args = parser.parse_args()
    
    try:
        reader = ArcadeEmailReader(api_key=args.api_key, user_id=args.user_id)
        
        if args.list > 0:
            print(f"📧 Reading {args.list} recent emails...")
            emails = reader.read_emails(n_emails=args.list)
            
            if emails:
                print(f"\n✅ Found {len(emails)} emails:\n")
                for i, email in enumerate(emails, 1):
                    subject = email.get("subject", "No subject")
                    sender = email.get("from", email.get("sender", "Unknown"))
                    date = email.get("date", email.get("received_date", "Unknown"))
                    print(f"{i}. {subject}")
                    print(f"   From: {sender}")
                    print(f"   Date: {date}\n")
            else:
                print("No emails found.")
        
        if args.search:
            print(f"🔍 Searching: {args.search}")
            emails = reader.search_emails(query=args.search)
            
            if emails:
                print(f"\n✅ Found {len(emails)} emails:\n")
                for i, email in enumerate(emails, 1):
                    subject = email.get("subject", "No subject")
                    sender = email.get("from", email.get("sender", "Unknown"))
                    print(f"{i}. {subject} (from: {sender})")
            else:
                print("No matching emails found.")
        
        if args.list == 0 and not args.search:
            print("Use --list N to list emails or --search QUERY to search")
    
    except AuthorizationNeededError as e:
        print("\n" + "=" * 70)
        print("🔐 AUTHORIZATION REQUIRED")
        print("=" * 70)
        print(f"\nTo read emails, you need to authorize Gmail access.")
        print(f"\nAuthorization URL:")
        print(f"  {e.auth_url}")
        print(f"\nPlease visit the URL above to authorize access.")
        print("=" * 70)
        
        # This is where MCP elicitation would be triggered
        # In a real MCP server, we'd use server.elicitInput() here
        return 1
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
