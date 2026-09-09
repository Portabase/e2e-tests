"""Create local emulator buckets/containers with Python's standard library."""
import base64
import datetime
import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request


def send(url, method, headers, body=b"", accepted=(200, 201, 204, 409)):
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            assert response.status in accepted
    except urllib.error.HTTPError as error:
        if error.code not in accepted:
            raise


def rustfs():
    now = datetime.datetime.now(datetime.timezone.utc)
    stamp, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    digest = hashlib.sha256(b"").hexdigest()
    signed = "host;x-amz-content-sha256;x-amz-date"
    canonical = f"PUT\n/portabase-e2e\n\nhost:rustfs:9000\nx-amz-content-sha256:{digest}\nx-amz-date:{stamp}\n\n{signed}\n{digest}"
    scope = f"{day}/us-east-1/s3/aws4_request"
    to_sign = f"AWS4-HMAC-SHA256\n{stamp}\n{scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
    key = b"AWS4portabase-e2e-secret"
    for part in (day, "us-east-1", "s3", "aws4_request"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
    send("http://rustfs:9000/portabase-e2e", "PUT", {
        "x-amz-date": stamp, "x-amz-content-sha256": digest,
        "Authorization": f"AWS4-HMAC-SHA256 Credential=portabase-e2e/{scope}, SignedHeaders={signed}, Signature={signature}",
    })


def azurite():
    date = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    canonical = f"x-ms-date:{date}\nx-ms-version:2023-11-03\n/portabase/portabase/portabase-e2e\nrestype:container"
    to_sign = "PUT\n" + "\n" * 11 + canonical
    key = base64.b64decode("cG9ydGFiYXNlLWUyZS1henVyaXRlLXNlY3JldA==")
    signature = base64.b64encode(hmac.new(key, to_sign.encode(), hashlib.sha256).digest()).decode()
    send("http://azurite:10000/portabase/portabase-e2e?restype=container", "PUT", {
        "Content-Type": "", "x-ms-date": date, "x-ms-version": "2023-11-03",
        "Authorization": f"SharedKey portabase:{signature}",
    })


def gcs():
    send("http://fake-gcs-server:4443/storage/v1/b?project=portabase-e2e", "POST", {
        "Content-Type": "application/json",
    }, json.dumps({"name": "portabase-e2e"}).encode())


for initialize in (rustfs, azurite, gcs):
    for attempt in range(60):
        try:
            initialize()
            print(f"{initialize.__name__}: ready", flush=True)
            break
        except (OSError, AssertionError):
            if attempt == 59:
                raise
            time.sleep(2)
