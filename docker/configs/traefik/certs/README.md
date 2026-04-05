# TLS Certificates for UBI-CMS

This directory contains TLS/SSL certificates for the Traefik API Gateway.

## Development Setup

### Generate Self-Signed Certificates

Run the certificate generation script:

```bash
cd docker/configs/traefik/certs
chmod +x generate-certs.sh
./generate-certs.sh
```

This will create:
- `ca.crt` - Root CA certificate
- `ca.key` - Root CA private key
- `ubi-cms.local.crt` - Domain certificate
- `ubi-cms.local.key` - Domain private key
- `wildcard.ubi-cms.local.crt` - Wildcard certificate
- `wildcard.ubi-cms.local.key` - Wildcard private key

### Trust the CA Certificate

#### Windows
1. Double-click `ca.crt`
2. Click "Install Certificate"
3. Select "Local Machine"
4. Place in "Trusted Root Certification Authorities"

#### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```

#### Linux (Ubuntu/Debian)
```bash
sudo cp ca.crt /usr/local/share/ca-certificates/ubi-cms-ca.crt
sudo update-ca-certificates
```

### Update Hosts File

Add these entries to your hosts file:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`  
**Linux/Mac:** `/etc/hosts`

```
127.0.0.1 ubi-cms.local
127.0.0.1 admin.ubi-cms.local
127.0.0.1 api.ubi-cms.local
127.0.0.1 traefik.ubi-cms.local
```

## Production Setup

For production, Traefik will automatically request certificates from Let's Encrypt using ACME protocol.

### Prerequisites
1. Domain name pointing to your server
2. Ports 80 and 443 accessible from the internet
3. Valid email address in `traefik.yml`

### ACME Configuration

The ACME configuration is already set up in `traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@ubi-cms.local  # Update this!
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web
```

### ACME Storage Permissions

```bash
touch acme.json
chmod 600 acme.json
```

## Certificate Rotation

### Development
Certificates are valid for 365 days. Regenerate annually:
```bash
./generate-certs.sh
```

### Production
Let's Encrypt certificates are automatically renewed by Traefik when they're 30 days from expiration.

## Troubleshooting

### Certificate Not Trusted
- Ensure CA certificate is installed in system trust store
- Restart browser after installing CA cert
- Check hosts file entries

### Let's Encrypt Rate Limits
- Use staging CA during testing: `caServer: https://acme-staging-v02.api.letsencrypt.org/directory`
- Switch to production CA when ready

### Certificate Mismatch
- Verify domain in certificate matches the hostname
- Check SAN (Subject Alternative Names) includes all subdomains

## Security Notes

- Never commit private keys (`.key` files) to version control
- Rotate certificates regularly
- Use strong private keys (2048-bit minimum, 4096-bit recommended)
- Monitor certificate expiration dates
