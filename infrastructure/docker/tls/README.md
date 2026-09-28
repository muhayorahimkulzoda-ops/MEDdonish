Put `cert.pem` and `key.pem` here for the local Caddy HTTPS edge. Do not commit the private key.

```bash
docker run --rm -v "$(pwd)/infrastructure/docker/tls:/out" alpine/openssl req -x509 -newkey rsa:2048 -keyout /out/key.pem -out /out/cert.pem -days 825 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```
