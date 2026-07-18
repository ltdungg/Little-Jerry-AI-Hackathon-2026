"""
OAuth Helper Script - Generate admin access tokens for Jira and Slack MCP.

Usage:
  1. Run this script: python oauth_helper.py jira
  2. Open the generated URL in browser
  3. Authorize the app
  4. Copy the access_token from the callback
  5. Set environment variable: JIRA_ADMIN_TOKEN=<token>

For Slack:
  1. Run: python oauth_helper.py slack
  2. Follow same steps
  3. Set: SLACK_ADMIN_TOKEN=<token>
"""
import os
import sys
import secrets
import hashlib
import base64
import json
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, parse_qs
from dotenv import load_dotenv

load_dotenv(".env.local")

# OAuth configs
OAUTH_CONFIGS = {
    "jira": {
        "client_id": os.getenv("JIRA_CLIENT_ID"),
        "client_secret": os.getenv("JIRA_CLIENT_SECRET"),
        "authorize_url": "https://auth.atlassian.com/authorize",
        "token_url": "https://auth.atlassian.com/oauth/token",
        "scopes": ["offline_access", "read:jira-work", "write:jira-work"],
        "redirect_uri": "http://localhost:8080/callback",
    },
    "slack": {
        "client_id": os.getenv("SLACK_CLIENT_ID"),
        "client_secret": os.getenv("SLACK_CLIENT_SECRET"),
        "authorize_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "scopes": ["chat:write", "channels:read", "groups:read"],
        "redirect_uri": "http://localhost:8080/callback",
    },
}

# Global to store the auth code
auth_code = None


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        if "/callback" in self.path:
            query = parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            auth_code = query.get("code", [None])[0]

            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"""
                <html><body><h1>Authorization successful!</h1>
                <p>You can close this window.</p></body></html>
            """)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress logs


def generate_pkce():
    """Generate PKCE code_verifier and code_challenge."""
    code_verifier = secrets.token_urlsafe(32)
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return code_verifier, code_challenge


def exchange_code(provider: str, code: str, code_verifier: str = None):
    """Exchange authorization code for access token."""
    config = OAUTH_CONFIGS[provider]

    payload = {
        "grant_type": "authorization_code",
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "code": code,
        "redirect_uri": config["redirect_uri"],
    }

    if code_verifier:
        payload["code_verifier"] = code_verifier

    import urllib.request
    import urllib.parse

    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(config["token_url"], data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"Error: {e.code} - {error_body}")
        return None


def start_oauth_flow(provider: str):
    """Start OAuth flow for the given provider."""
    config = OAUTH_CONFIGS[provider]

    if not config["client_id"] or not config["client_secret"]:
        print(f"Error: {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET must be set in .env.local")
        sys.exit(1)

    # Generate PKCE (required for Jira, optional for Slack)
    code_verifier, code_challenge = generate_pkce()

    # Build authorization URL
    params = {
        "audience": "api.atlassian.com" if provider == "jira" else "",
        "client_id": config["client_id"],
        "scope": " ".join(config["scopes"]),
        "redirect_uri": config["redirect_uri"],
        "state": secrets.token_urlsafe(16),
        "response_type": "code",
    }

    if provider == "jira":
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"
        params["prompt"] = "consent"

    # Remove empty params
    params = {k: v for k, v in params.items() if v}

    import urllib.parse
    auth_url = f"{config['authorize_url']}?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"

    print(f"\n{'='*60}")
    print(f"OAuth Flow for {provider.upper()}")
    print(f"{'='*60}")
    print(f"\n1. Opening browser for authorization...")
    print(f"\n2. If browser doesn't open, copy this URL:")
    print(f"\n{auth_url}\n")

    webbrowser.open(auth_url)

    # Start local server to capture callback
    print(f"3. Waiting for callback on http://localhost:8080/callback...")
    server = HTTPServer(("localhost", 8080), OAuthCallbackHandler)
    server.handle_request()

    if not auth_code:
        print("Error: No authorization code received")
        sys.exit(1)

    print(f"4. Exchanging code for access token...")

    # Exchange code for token
    token_result = exchange_code(provider, auth_code, code_verifier)

    if token_result and "access_token" in token_result:
        access_token = token_result["access_token"]
        refresh_token = token_result.get("refresh_token", "")
        expires_in = token_result.get("expires_in", 3600)

        # Create token data with expiry info for auto-refresh
        import time
        token_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": time.time() + expires_in,
        }

        env_var = f"{provider.upper()}_ADMIN_TOKEN"
        print(f"\n{'='*60}")
        print(f"SUCCESS! Access token obtained.")
        print(f"{'='*60}")
        print(f"\nToken expires in: {expires_in // 3600} hours")
        print(f"Has refresh token: {bool(refresh_token)}")

        if refresh_token:
            print(f"\n✓ Auto-refresh enabled! Token will auto-renew before expiry.")
            print(f"  No need to click 'Allow' again!")

        print(f"\nSet this environment variable:")
        print(f"\n  export {env_var}='{json.dumps(token_data)}'\n")

        # Optionally save to .env.local
        save = input("Save to .env.local? (y/n): ").strip().lower()
        if save == "y":
            with open(".env.local", "a") as f:
                f.write(f"\n{env_var}={json.dumps(token_data)}\n")
            print("Saved to .env.local")
    else:
        print("Error: Failed to get access token")
        print(f"Response: {token_result}")


if __name__ == "__main__":
    provider = sys.argv[1] if len(sys.argv) > 1 else None

    if provider not in OAUTH_CONFIGS:
        print("Usage: python oauth_helper.py <jira|slack>")
        sys.exit(1)

    start_oauth_flow(provider)
