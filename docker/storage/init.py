"""Create local emulator buckets/containers with Python's standard library."""
import base64
import datetime
import hashlib
import hmac
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


COMPOSE_FILE = Path(__file__).with_name("docker-compose.yml")


def send(url, method, headers, body=b"", accepted=(200, 201, 204, 409)):
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            assert response.status in accepted
    except urllib.error.HTTPError as error:
        if error.code not in accepted:
            raise


def garage_cli(*args, check=True):
    return subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE_FILE), "exec", "-T", "garage", "/garage", *args],
        check=check,
        capture_output=True,
        text=True,
    )


def garage():
    garage_cli("status")
    if garage_cli("bucket", "info", "portabase-e2e", check=False).returncode:
        node_id = garage_cli("node", "id").stdout.split("@", 1)[0]
        if "Current cluster layout version: 0" in garage_cli("layout", "show").stdout:
            garage_cli("layout", "assign", "-z", "dc1", "-c", "1G", node_id)
            garage_cli("layout", "apply", "--version", "1")
        garage_cli("key", "import", "--yes", "-n", "portabase-e2e", "GK0123456789abcdef01234567", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
        garage_cli("bucket", "create", "portabase-e2e")
    garage_cli("bucket", "allow", "--read", "--write", "--owner", "portabase-e2e", "--key", "portabase-e2e")


def rustfs():
    now = datetime.datetime.now(datetime.timezone.utc)
    stamp, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    digest = hashlib.sha256(b"").hexdigest()
    signed = "host;x-amz-content-sha256;x-amz-date"
    canonical = f"PUT\n/portabase-e2e\n\nhost:localhost:3901\nx-amz-content-sha256:{digest}\nx-amz-date:{stamp}\n\n{signed}\n{digest}"
    scope = f"{day}/us-east-1/s3/aws4_request"
    to_sign = f"AWS4-HMAC-SHA256\n{stamp}\n{scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
    key = b"AWS4portabase-e2e-secret"
    for part in (day, "us-east-1", "s3", "aws4_request"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
    send("http://localhost:3901/portabase-e2e", "PUT", {
        "x-amz-date": stamp, "x-amz-content-sha256": digest,
        "Authorization": f"AWS4-HMAC-SHA256 Credential=portabase-e2e/{scope}, SignedHeaders={signed}, Signature={signature}",
    })


def azurite():
    date = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    canonical = f"x-ms-date:{date}\nx-ms-version:2023-11-03\n/portabase/portabase/portabase-e2e\nrestype:container"
    to_sign = "PUT\n" + "\n" * 11 + canonical
    key = base64.b64decode("cG9ydGFiYXNlLWUyZS1henVyaXRlLXNlY3JldA==")
    signature = base64.b64encode(hmac.new(key, to_sign.encode(), hashlib.sha256).digest()).decode()
    send("http://localhost:10000/portabase/portabase-e2e?restype=container", "PUT", {
        "Content-Type": "", "x-ms-date": date, "x-ms-version": "2023-11-03",
        "Authorization": f"SharedKey portabase:{signature}",
    })


def gcs():
    send("http://localhost:4443/storage/v1/b?project=portabase-e2e", "POST", {
        "Content-Type": "application/json",
    }, json.dumps({"name": "portabase-e2e"}).encode())


def sftpgo():
    credentials = base64.b64encode(b"admin:portabase-e2e-admin-secret").decode()
    token_request = urllib.request.Request("http://localhost:8080/api/v2/token", headers={
        "Authorization": f"Basic {credentials}",
    })
    with urllib.request.urlopen(token_request, timeout=5) as response:
        token = json.load(response)["access_token"]
    user_request = urllib.request.Request(
        "http://localhost:8080/api/v2/users",
        data=json.dumps({
            "username": "portabase-e2e",
            "password": "portabase-e2e-secret",
            "status": 1,
            "home_dir": "/srv/sftpgo/data/portabase-e2e",
            "permissions": {"/": ["*"]},
        }).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(user_request, timeout=5):
            pass
    except urllib.error.HTTPError as error:
        if error.code != 409:
            raise


for initialize in (garage, rustfs, azurite, gcs, sftpgo):
    for attempt in range(60):
        try:
            initialize()
            print(f"{initialize.__name__}: ready", flush=True)
            break
        except (OSError, AssertionError, subprocess.CalledProcessError):
            if attempt == 59:
                raise
            time.sleep(2)
