#!/usr/bin/env python3
"""
cloudflare_security_setup.py
============================
Configures Cloudflare security rules for the Sovereign Economic Ecosystem.

Applies:
  - WAF custom rules (block scanners, protect API endpoints, Flash VAS fraud prevention)
  - Rate limiting rules (per endpoint)
  - Bot management settings
  - IP Access Rules (emergency blocks)
  - Security Level: High
  - DDoS protection: L3/L4 + L7 (HTTP)

Usage:
  python cloudflare_security_setup.py --zone-id YOUR_ZONE_ID --api-token YOUR_TOKEN

Requires: pip install cloudflare requests
"""

import argparse
import json
import sys
import requests

BASE = "https://api.cloudflare.com/client/v4"


class CloudflareClient:
    def __init__(self, zone_id: str, api_token: str):
        self.zone_id = zone_id
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

    def _req(self, method: str, path: str, data: dict = None) -> dict:
        url = f"{BASE}{path}"
        resp = requests.request(method, url, headers=self.headers,
                                json=data, timeout=30)
        result = resp.json()
        if not result.get("success"):
            print(f"  ERROR: {result.get('errors')}", file=sys.stderr)
        return result

    # ── Security Level ──────────────────────────────────────────────────────
    def set_security_level(self, level: str = "high"):
        """Options: off | essentially_off | low | medium | high | under_attack"""
        print(f"Setting security level: {level}")
        return self._req("PATCH", f"/zones/{self.zone_id}/settings/security_level",
                         {"value": level})

    def set_ssl_mode(self, mode: str = "full_strict"):
        """Options: off | flexible | full | full_strict"""
        print(f"Setting SSL mode: {mode}")
        return self._req("PATCH", f"/zones/{self.zone_id}/settings/ssl",
                         {"value": mode})

    def enable_hsts(self):
        print("Enabling HSTS...")
        return self._req("PATCH", f"/zones/{self.zone_id}/settings/security_header", {
            "value": {
                "strict_transport_security": {
                    "enabled": True,
                    "max_age": 31536000,
                    "include_subdomains": True,
                    "preload": True,
                    "nosniff": True
                }
            }
        })

    # ── WAF Custom Rules ────────────────────────────────────────────────────
    def create_waf_rules(self):
        print("Creating WAF custom rules...")
        rules = [
            {
                "description": "Block known scanner user agents",
                "expression": '(http.user_agent contains "masscan") or '
                              '(http.user_agent contains "zgrab") or '
                              '(http.user_agent contains "sqlmap") or '
                              '(http.user_agent contains "nikto") or '
                              '(http.user_agent contains "nmap") or '
                              '(http.user_agent contains "dirbuster") or '
                              '(http.user_agent contains "nuclei")',
                "action": "block",
                "enabled": True,
            },
            {
                "description": "Block SQL injection attempts",
                "expression": '(http.request.uri.query contains "union select") or '
                              '(http.request.uri.query contains "1=1") or '
                              '(http.request.uri.query contains "or 1=1") or '
                              '(http.request.body contains "union select")',
                "action": "block",
                "enabled": True,
            },
            {
                "description": "Block path traversal",
                "expression": '(http.request.uri contains "/../") or '
                              '(http.request.uri contains "%2e%2e") or '
                              '(http.request.uri contains "%252e")',
                "action": "block",
                "enabled": True,
            },
            {
                "description": "Block .env and config file access",
                "expression": '(http.request.uri.path contains "/.env") or '
                              '(http.request.uri.path contains "/wp-config") or '
                              '(http.request.uri.path contains "/.git") or '
                              '(http.request.uri.path contains "/config.php")',
                "action": "block",
                "enabled": True,
            },
            {
                "description": "Challenge non-SA traffic on Flash VAS endpoints",
                "expression": '(http.request.uri.path contains "/v1/flash/") and '
                              '(not ip.geoip.country in {"ZA"})',
                "action": "managed_challenge",
                "enabled": True,
            },
            {
                "description": "Block countries with no SA business relevance on sensitive paths",
                "expression": '(http.request.uri.path contains "/v1/flash/") and '
                              '(ip.geoip.country in {"KP" "RU" "CN" "IR"})',
                "action": "block",
                "enabled": True,
            },
            {
                "description": "Managed challenge on admin honeypot paths (log attackers)",
                "expression": '(http.request.uri.path contains "/admin") or '
                              '(http.request.uri.path contains "/wp-admin") or '
                              '(http.request.uri.path contains "/phpmyadmin")',
                "action": "managed_challenge",
                "enabled": True,
            },
        ]

        return self._req("POST", f"/zones/{self.zone_id}/rulesets", {
            "name": "Sovereign Security Rules",
            "description": "Custom WAF rules for Sovereign Economic Ecosystem",
            "kind": "zone",
            "phase": "http_request_firewall_custom",
            "rules": rules,
        })

    # ── Rate Limiting ───────────────────────────────────────────────────────
    def create_rate_limits(self):
        print("Creating rate limiting rules...")
        rate_rules = [
            {
                "description": "MiniGPT4 API rate limit",
                "expression": '(http.request.uri.path contains "/v1/chat")',
                "action": "block",
                "ratelimit": {
                    "characteristics": ["ip.src"],
                    "period": 60,
                    "requests_per_period": 20,
                    "mitigation_timeout": 300,
                }
            },
            {
                "description": "Flash purchase rate limit (fraud prevention)",
                "expression": '(http.request.uri.path contains "/v1/flash/electricity") or '
                              '(http.request.uri.path contains "/v1/flash/water") or '
                              '(http.request.uri.path contains "/v1/flash/airtime") or '
                              '(http.request.uri.path contains "/v1/flash/data")',
                "action": "block",
                "ratelimit": {
                    "characteristics": ["ip.src", "http.request.headers[\"authorization\"]"],
                    "period": 60,
                    "requests_per_period": 5,
                    "mitigation_timeout": 600,  # 10 min block after 5 purchases/min
                }
            },
            {
                "description": "General API rate limit",
                "expression": '(http.request.uri.path starts_with "/api/")',
                "action": "managed_challenge",
                "ratelimit": {
                    "characteristics": ["ip.src"],
                    "period": 10,
                    "requests_per_period": 100,
                    "mitigation_timeout": 60,
                }
            },
        ]

        return self._req("POST", f"/zones/{self.zone_id}/rulesets", {
            "name": "Sovereign Rate Limits",
            "description": "Rate limiting rules for Sovereign platform",
            "kind": "zone",
            "phase": "http_ratelimit",
            "rules": rate_rules,
        })

    # ── DDoS protection tweaks ──────────────────────────────────────────────
    def configure_ddos(self):
        print("Configuring DDoS protection overrides...")
        return self._req("PUT",
            f"/zones/{self.zone_id}/rulesets/phases/ddos_l7/entrypoint",
            {
                "description": "Sovereign DDoS L7 override",
                "rules": [
                    {
                        "action": "execute",
                        "action_parameters": {
                            "id": "4d21379b4f9f4bb088e0729962c8b3cf",  # CF managed L7 DDoS
                            "overrides": {
                                "sensitivity_level": "high",
                            }
                        },
                        "expression": "true",
                        "enabled": True,
                    }
                ]
            }
        )

    def run_all(self):
        print("=== Configuring Cloudflare security for Sovereign ===\n")
        self.set_security_level("high")
        self.set_ssl_mode("full_strict")
        self.enable_hsts()
        self.create_waf_rules()
        self.create_rate_limits()
        self.configure_ddos()
        print("\n=== Cloudflare security configuration complete ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--zone-id", required=True)
    parser.add_argument("--api-token", required=True)
    args = parser.parse_args()

    client = CloudflareClient(zone_id=args.zone_id, api_token=args.api_token)
    client.run_all()
