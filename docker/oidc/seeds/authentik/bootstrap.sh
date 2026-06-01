#!/usr/bin/env sh
set -eu

python - <<'PY'
import os
import sys
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("AUTHENTIK_BASE_URL", "http://authentik-server:9000")
LIVE_URL = os.environ.get("AUTHENTIK_LIVE_URL", f"{BASE_URL}/-/health/live/")
ATTEMPTS = int(os.environ.get("AUTHENTIK_BOOTSTRAP_ATTEMPTS", "90"))
SLEEP_SECONDS = int(os.environ.get("AUTHENTIK_BOOTSTRAP_SLEEP_SECONDS", "2"))


def wait_for_live() -> None:
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(LIVE_URL, timeout=10) as response:
                if response.status == 200:
                    print("Authentik live health is reachable")
                    return
        except Exception:
            pass
        print(f"Waiting for Authentik live health ({attempt}/{ATTEMPTS})")
        time.sleep(SLEEP_SECONDS)
    raise SystemExit(f"Timed out waiting for Authentik live health at {LIVE_URL}")


wait_for_live()
PY

ak shell -c "import os; from authentik.core.models import Group, User; user = User.objects.get(email=os.environ['AUTHENTIK_BOOTSTRAP_EMAIL']); group = Group.objects.get(name='authentik Admins'); group.users.add(user); print(f'Granted {user.username} authentik Admins membership')" >/dev/null

BOOTSTRAP_ATTEMPTS="${AUTHENTIK_BOOTSTRAP_ATTEMPTS:-90}"
BOOTSTRAP_SLEEP_SECONDS="${AUTHENTIK_BOOTSTRAP_SLEEP_SECONDS:-2}"

reconcile_seed_objects() {
  attempt=1
  while [ "$attempt" -le "$BOOTSTRAP_ATTEMPTS" ]; do
    if ak shell -c "import os; from authentik.core.models import Application, Group, User; from authentik.crypto.models import CertificateKeyPair; from authentik.flows.models import Flow; from authentik.providers.oauth2.models import OAuth2Provider, ScopeMapping; bootstrap_admin = User.objects.get(email=os.environ['AUTHENTIK_BOOTSTRAP_EMAIL']); authentik_admins = Group.objects.get(name='authentik Admins'); authentik_admins.users.add(bootstrap_admin); user, user_created = User.objects.get_or_create(username=os.environ['AUTHENTIK_TEST_USER_USERNAME'], defaults={'email': os.environ['AUTHENTIK_TEST_USER_EMAIL'], 'name': os.environ['AUTHENTIK_TEST_USER_NAME']}); user.email = os.environ['AUTHENTIK_TEST_USER_EMAIL']; user.name = os.environ['AUTHENTIK_TEST_USER_NAME']; user.is_active = True; user.save(); user.set_password(os.environ['AUTHENTIK_TEST_USER_PASSWORD']); user.save(); group, group_created = Group.objects.get_or_create(name=os.environ['AUTHENTIK_TEST_GROUP']); group.is_superuser = False; group.save(); group.users.add(user); auth_flow = Flow.objects.get(slug='default-authentication-flow'); authorization_flow = Flow.objects.get(slug='default-provider-authorization-implicit-consent'); invalidation_flow = Flow.objects.get(slug='default-provider-invalidation-flow'); openid_scope = ScopeMapping.objects.get(scope_name='openid'); profile_scope = ScopeMapping.objects.get(scope_name='profile'); email_scope = ScopeMapping.objects.get(scope_name='email'); signing_key = CertificateKeyPair.objects.get(name='authentik Self-signed Certificate'); provider, provider_created = OAuth2Provider.objects.update_or_create(name=os.environ['AUTHENTIK_PROVIDER_NAME'], defaults={'authentication_flow': auth_flow, 'authorization_flow': authorization_flow, 'invalidation_flow': invalidation_flow, 'client_type': 'confidential', 'client_id': os.environ['AUTHENTIK_CLIENT_ID'], 'client_secret': os.environ['AUTHENTIK_CLIENT_SECRET'], 'access_code_validity': 'minutes=1', 'access_token_validity': 'hours=1', 'refresh_token_validity': 'days=7', 'include_claims_in_id_token': True, 'signing_key': signing_key, 'sub_mode': 'user_email', 'issuer_mode': 'global', '_redirect_uris': [{'matching_mode': 'strict', 'url': os.environ['AUTHENTIK_REDIRECT_URI']}],}); provider.property_mappings.set([openid_scope, profile_scope, email_scope]); application, application_created = Application.objects.update_or_create(slug=os.environ['AUTHENTIK_APPLICATION_SLUG'], defaults={'name': os.environ['AUTHENTIK_APPLICATION_NAME'], 'provider': provider.provider_ptr, 'policy_engine_mode': 'any'}); print(f\"Reconciled Authentik seed user={user.username} group={group.name} provider={provider.name} application={application.slug}\")" >/dev/null 2>&1; then
      return 0
    fi
    echo "Waiting for Authentik seed reconciliation (${attempt}/${BOOTSTRAP_ATTEMPTS})"
    attempt=$((attempt + 1))
    sleep "$BOOTSTRAP_SLEEP_SECONDS"
  done
  return 1
}

reconcile_seed_objects

python - <<'PY'
import json
import os
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("AUTHENTIK_BASE_URL", "http://authentik-server:9000")
DISCOVERY_PATH = os.environ.get("AUTHENTIK_DISCOVERY_PATH", "/application/o/portabase/.well-known/openid-configuration")
DISCOVERY_URL = os.environ.get("AUTHENTIK_DISCOVERY_URL", f"{BASE_URL}{DISCOVERY_PATH}")
ATTEMPTS = int(os.environ.get("AUTHENTIK_BOOTSTRAP_ATTEMPTS", "90"))
SLEEP_SECONDS = int(os.environ.get("AUTHENTIK_BOOTSTRAP_SLEEP_SECONDS", "2"))


def http_request(path: str):
    url = f"{BASE_URL}{path}"
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read().decode("utf-8")
            return response.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return exc.code, body

def wait_for_discovery() -> dict:
    for attempt in range(1, ATTEMPTS + 1):
        status, body = http_request(DISCOVERY_PATH)
        if status == 200:
            parsed = json.loads(body)
            if "issuer" in parsed and "authorization_endpoint" in parsed:
                print(f"Portabase discovery document is reachable at {DISCOVERY_URL}")
                return parsed
        print(f"Waiting for Portabase discovery document ({attempt}/{ATTEMPTS})")
        time.sleep(SLEEP_SECONDS)
    raise SystemExit(f"Timed out waiting for discovery document at {DISCOVERY_URL}")
wait_for_discovery()

print(f"Authentik bootstrap verification completed at {DISCOVERY_URL}")
PY
