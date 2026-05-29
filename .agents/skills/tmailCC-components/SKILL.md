---
name: tmailCC-components
description: Work with tmailCC React components, hooks, and UI patterns. Use when building new UI features, modifying existing components, or adding interactive elements.
version: 1.0.0
---

# tmailCC Frontend Components

## Component Location

All components are in `client/components/`.

## Core Components

### Sidebar.tsx
Navigation sidebar with dark/light mode toggle, menu items, and responsive collapse.

### AdminPanel.tsx
Admin management UI — user list, domain management, dotmail config.

### DeveloperSettings.tsx
API key management UI — create, list, delete API keys with scopes.

### DotmailView.tsx
Gmail dotmail management — add parent Gmail, generate dot-variants, view OTP.

### NotificationSound.tsx
Audio notification component using Web Audio API or HTMLAudioElement.

### Turnstile.tsx
Cloudflare Turnstile widget integration for bot protection.

## Key Hooks / Contexts

### RealtimeContext.tsx
Provides realtime email subscription context. Pattern:

```typescript
// client/lib/RealtimeContext.tsx
const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  useEffect(() => {
    const ch = supabase.channel(`emails:${accountId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emails',
        filter: `account_id=eq.${accountId}`,
      }, handleChange)
      .subscribe();
    setChannel(ch);
    
    return () => { ch.unsubscribe(); };
  }, [accountId]);
  
  return (
    <RealtimeContext.Provider value={{ channel }}>
      {children}
    </RealtimeContext.Provider>
  );
}
```

## API Client Pattern

```typescript
// client/lib/api.ts
export async function fetchEmails(address: string): Promise<Email[]> {
  const token = getAuthToken(); // from localStorage
  const res = await fetch(`/api/emails?address=${encodeURIComponent(address)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data.emails;
}
```

## Auth Flow

```typescript
// client/lib/auth.ts
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}
```

## Supabase Client (Browser)

```typescript
// client/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## State Management

tmailCC uses React Context for global state:
- `RealtimeContext` — Realtime subscriptions
- `AuthContext` (implicit) — Auth token in localStorage

For component state, use local `useState`/`useReducer`. No external state library needed.

## Styling

- Tailwind CSS for all styles
- CSS variables for theme tokens in `globals.css`
- Dark mode via `dark:` Tailwind prefix and `prefers-color-scheme`

## Dark Mode Pattern

```typescript
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// Check current mode
const isDark = document.documentElement.classList.contains('dark');
```

## Notification Sound

```typescript
// client/lib/notification.ts
export function playNotificationSound() {
  const audio = new Audio('/notification.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {}); // Ignore autoplay errors
}
```

## Responsive Breakpoints

- Mobile: default (no prefix)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)
- Large: `xl:` (1280px+)

## Key Pages

| Page | Route | Purpose |
|------|-------|---------|
| Landing | `/landing` | Public landing page |
| App | `/app` | Main dashboard (requires auth) |
| OTP | `/otp` | View emails without login (token-based) |
| Docs | `/docs/[filename]` | Documentation pages |

## Form Validation

Use native HTML5 validation + custom JS for complex cases. Pattern:

```typescript
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAccountAddress(localPart: string): boolean {
  return /^[a-zA-Z0-9]{1,64}$/.test(localPart);
}
```

## Loading States

Use Tailwind's `animate-pulse` for skeletons:

```typescript
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded" />
```

## Error Handling

```typescript
try {
  const emails = await fetchEmails(address);
  setData(emails);
} catch (error) {
  setError(error instanceof Error ? error.message : 'Unknown error');
}
```

## Icon Usage

Use inline SVG icons or a library like `lucide-react`. Keep SVGs consistent in size (20x20 or 24x24).
