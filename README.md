# Superior Connection 🎓

> **High-Performance, Completely Anonymous University Platform**
> Post campus discussions, photos, and short videos with zero accounts, zero signups, and zero raw IP logging.

---

## 🎨 Branding & Theme
- **Platform Name:** Superior Connection
- **Primary Brand Color:** `#6C1C74` (Rich Purple)
- **Base Theme:** Clean White (`#FFFFFF`) with dark mode toggle where `#6C1C74` acts as the primary accent and text highlight.

---

## 🛡️ Security & Privacy Architecture

| Feature | Implementation | Privacy / Security Benefit |
| :--- | :--- | :--- |
| **Anonymous Session** | Ephemeral Client UUID (`localStorage`) | No student names, emails, passwords, or signup forms required. Students can rotate their identity at any time with 1 click. |
| **Hashed Rate Limiting** | Upstash Redis + `SHA-256(IP + UserAgent + SecretSalt)` | Prevents spam, bot flooding, and DDoS without storing or logging raw student IP addresses in database tables or logs. |
| **EXIF Metadata Stripping** | Cloudinary Direct Signed Uploads (`image_metadata: false`) | Media is uploaded straight from browser to Cloudinary. Strips GPS coordinates, camera model, and creation timestamps before media is hosted. |
| **Local AI-Free Moderation** | Zero-cost deterministic Regex & Leetspeak normalizer (`lib/moderation.ts`) | Intercepts harassment, slurs, cheating rings, and doxxing (phone numbers, student IDs, emails) before database insertion without paying for or sending data to external AI APIs. |
| **Bot Protection** | Cloudflare Turnstile | Invisible human verification challenge preventing scripted automated bot submissions. |
| **Auto-Expiry Self-Destruct** | MongoDB TTL Index (`expiresAt`) | Allows students to publish posts that automatically delete after 24 hours, 3 days, 7 days, or 30 days. |
| **Anti-Double-Vote Protection**| `voterHash` Unique Compound Index | `HMAC-SHA256(anonUserId + IP + Salt)` guarantees one vote per student per item without recording who voted for what. |

---

## 🚀 Technical Stack
- **Framework:** Next.js (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS with `#6C1C74` brand palette, Lucide Icons
- **Database:** MongoDB Atlas with Mongoose ORM
- **Cache & Rate Limiting:** Upstash Redis (Serverless REST API)
- **Storage:** Cloudinary (Direct client-to-cloud signed uploads, max 30MB)
- **Verification:** Cloudflare Turnstile

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env.local` and populate the required keys:

```bash
cp .env.example .env.local
```

### Required Variables
```ini
# MongoDB Atlas
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/superior_connection"

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
RATE_LIMIT_SALT="cryptographic_random_salt_string"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"

# Cloudflare Turnstile
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
CLOUDFLARE_TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

---

## 🏃 Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build
```bash
npm run build
npm run start
```
