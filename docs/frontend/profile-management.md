# Claude Profile Management

This document explains Auto-Claude's profile management system for handling multiple Claude authentication methods, rate limit tracking, and automatic profile switching.

**Target Audience:** Developers building features related to authentication, rate limiting, or profile management.

---

## Overview

The profile management system allows users to:

1. **Manage Multiple Profiles**: Store multiple Claude authentication methods
2. **Track Rate Limits**: Record and monitor rate limit events per profile
3. **Secure Token Storage**: Encrypt OAuth tokens using OS keychain
4. **Auto-Switch Profiles**: Automatically switch when rate limited (optional)

**Storage Location:** `~/.auto-claude/profiles.json`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Profile Management System                     │
│         (apps/frontend/src/main/claude-profile/)                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Profile       │    │ Rate Limit    │    │ Token         │
│ Storage       │    │ Manager       │    │ Encryption    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ profiles.json │    │ Event History │    │ OS Keychain   │
│ (persistent)  │    │ (in-memory)   │    │ (safeStorage) │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **ProfileStorage** | `profile-storage.ts` | Load/save profiles to disk |
| **RateLimitManager** | `rate-limit-manager.ts` | Track rate limit events |
| **TokenEncryption** | `token-encryption.ts` | Secure token storage |
| **UsageParser** | `usage-parser.ts` | Parse usage data from Claude |
| **Types** | `types.ts` | TypeScript type definitions |

---

## Data Models

### ClaudeProfile

A Claude authentication profile:

```typescript
interface ClaudeProfile {
  id: string;                    // UUID
  name: string;                  // User-friendly name
  type: 'oauth' | 'api-key';     // Authentication method

  // OAuth profiles
  oauthToken?: string;           // Encrypted OAuth token
  configDir?: string;            // Claude config directory path

  // API key profiles
  apiKey?: string;               // Encrypted API key
  baseUrl?: string;              // Custom API endpoint

  // Metadata
  createdAt: Date;
  lastUsedAt?: Date;

  // Rate limit tracking
  usage?: ClaudeUsageData;
  rateLimitEvents?: ClaudeRateLimitEvent[];
}
```

### ClaudeUsageData

Usage statistics for a profile:

```typescript
interface ClaudeUsageData {
  sessionUsage: number;          // Current session usage %
  weeklyUsage: number;           // Weekly usage %
  lastUpdated: Date;
}
```

### ClaudeRateLimitEvent

A recorded rate limit event:

```typescript
interface ClaudeRateLimitEvent {
  type: 'session' | 'weekly';    // Limit type
  hitAt: Date;                   // When limit was hit
  resetAt: Date;                 // When limit resets
  resetTimeString: string;       // Original reset time string
}
```

### ClaudeAutoSwitchSettings

Auto-switch configuration:

```typescript
interface ClaudeAutoSwitchSettings {
  enabled: boolean;              // Enable auto-switching
  proactiveSwapEnabled: boolean; // Monitor before hitting limits
  sessionThreshold: number;      // % at which to consider switching
  weeklyThreshold: number;       // % at which to consider switching
  autoSwitchOnRateLimit: boolean; // Auto-switch or prompt user
  usageCheckInterval: number;    // Check interval in ms (0 = disabled)
}
```

---

## Token Encryption

OAuth tokens are encrypted using Electron's `safeStorage` API, which leverages the OS keychain.

### How It Works

```typescript
import { encryptToken, decryptToken, isTokenEncrypted } from './token-encryption';

// Encrypt a token
const encrypted = encryptToken('oauth_token_here');
// Returns: 'enc:base64encodeddata...'

// Decrypt a token
const decrypted = decryptToken(encrypted);
// Returns: 'oauth_token_here'

// Check if encrypted
isTokenEncrypted('enc:...');  // true
isTokenEncrypted('raw_token'); // false
```

### Storage Format

Encrypted tokens are prefixed with `enc:`:
```
enc:SGVsbG8gV29ybGQ=
```

Legacy unencrypted tokens are stored as-is and will be encrypted on next save.

### Platform Support

| Platform | Encryption Backend |
|----------|-------------------|
| macOS | Keychain |
| Windows | DPAPI |
| Linux | libsecret/kwallet |

---

## Rate Limit Management

The system tracks rate limit events to help users manage their Claude usage.

### Recording Events

```typescript
import { recordRateLimitEvent, isProfileRateLimited } from './rate-limit-manager';

// Record a rate limit hit
const event = recordRateLimitEvent(profile, 'Resets in 2 hours');
// Adds event to profile.rateLimitEvents (keeps last 10)

// Check if currently rate limited
const status = isProfileRateLimited(profile);
// Returns: { limited: true, type: 'session', resetAt: Date }
```

### Rate Limit Classification

```typescript
// From usage-parser.ts
function classifyRateLimitType(resetTimeStr: string): 'session' | 'weekly' {
  // "Resets in X hours" → session limit
  // "Resets on Monday" → weekly limit
}
```

### Event History

Each profile keeps the last 10 rate limit events:

```typescript
profile.rateLimitEvents = [
  {
    type: 'session',
    hitAt: new Date('2025-01-15T10:00:00'),
    resetAt: new Date('2025-01-15T14:00:00'),
    resetTimeString: 'Resets in 4 hours'
  },
  // ... up to 10 events
];
```

---

## Profile Storage

### File Format

Profiles are stored in `~/.auto-claude/profiles.json`:

```json
{
  "version": 3,
  "profiles": [
    {
      "id": "uuid-1234",
      "name": "Personal Claude Pro",
      "type": "oauth",
      "oauthToken": "enc:encrypted_token_data",
      "createdAt": "2025-01-15T10:00:00Z",
      "lastUsedAt": "2025-01-15T14:30:00Z",
      "usage": {
        "sessionUsage": 45,
        "weeklyUsage": 23,
        "lastUpdated": "2025-01-15T14:30:00Z"
      },
      "rateLimitEvents": []
    }
  ],
  "activeProfileId": "uuid-1234",
  "autoSwitch": {
    "enabled": false,
    "proactiveSwapEnabled": false,
    "sessionThreshold": 95,
    "weeklyThreshold": 99,
    "autoSwitchOnRateLimit": false,
    "usageCheckInterval": 30000
  }
}
```

### Version Migration

The storage system handles version migration automatically:

| Version | Changes |
|---------|---------|
| 1 | Initial format |
| 2 | Added `usage` and `rateLimitEvents` |
| 3 | Added encrypted token storage |

```typescript
// Automatic migration on load
function parseAndMigrateProfileData(data) {
  if (data.version === 1) {
    data.version = STORE_VERSION;
    data.autoSwitch = DEFAULT_AUTO_SWITCH_SETTINGS;
  }
  // ... handle other migrations
}
```

### Loading/Saving

```typescript
import {
  loadProfileStore,
  loadProfileStoreAsync,
  saveProfileStore
} from './profile-storage';

// Sync load (blocking)
const data = loadProfileStore(storePath);

// Async load (non-blocking, preferred for initialization)
const data = await loadProfileStoreAsync(storePath);

// Save
saveProfileStore(storePath, data);
```

---

## Usage in Backend Processes

When spawning backend processes (changelog, builds), the active profile's environment is applied:

```typescript
import { getProfileEnv } from '../rate-limit-detector';

// Get environment variables for active profile
const profileEnv = getProfileEnv();
// Returns: { CLAUDE_CODE_OAUTH_TOKEN: '...', CLAUDE_CONFIG_DIR: '...' }

// Apply to subprocess
spawn(command, args, {
  env: {
    ...process.env,
    ...profileEnv  // Active profile credentials
  }
});
```

---

## Auto-Switch Logic

When enabled, the system can automatically switch profiles on rate limits:

### Detection Flow

```
1. Agent process hits rate limit
2. Error output parsed for rate limit pattern
3. Rate limit event recorded for active profile
4. If auto-switch enabled:
   a. Find non-rate-limited profile
   b. Switch active profile
   c. Emit notification to UI
5. If auto-switch disabled:
   a. Emit rate limit notification
   b. Prompt user to switch manually
```

### Configuration

```typescript
const DEFAULT_AUTO_SWITCH_SETTINGS = {
  enabled: false,              // Off by default
  proactiveSwapEnabled: false, // Don't monitor preemptively
  sessionThreshold: 95,        // Switch at 95% session usage
  weeklyThreshold: 99,         // Switch at 99% weekly usage
  autoSwitchOnRateLimit: false,// Prompt user (don't auto-switch)
  usageCheckInterval: 30000    // Check every 30s when enabled
};
```

---

## IPC Handlers

### Available Operations

```typescript
// Get all profiles
const profiles = await window.electronAPI.getClaudeProfiles();

// Get active profile
const active = await window.electronAPI.getActiveClaudeProfile();

// Set active profile
await window.electronAPI.setActiveClaudeProfile(profileId);

// Create profile
await window.electronAPI.createClaudeProfile({
  name: 'Work Account',
  type: 'oauth',
  oauthToken: 'token...'
});

// Delete profile
await window.electronAPI.deleteClaudeProfile(profileId);

// Update auto-switch settings
await window.electronAPI.setAutoSwitchSettings(settings);

// Get auto-switch settings
const settings = await window.electronAPI.getAutoSwitchSettings();
```

### Events

```typescript
// Rate limit detected
window.electronAPI.onRateLimitDetected((info) => {
  console.log(`Profile ${info.profileId} hit ${info.type} limit`);
  console.log(`Resets at: ${info.resetAt}`);
});

// Profile switched
window.electronAPI.onProfileSwitched((newProfileId) => {
  console.log(`Switched to profile: ${newProfileId}`);
});
```

---

## Security Considerations

### Token Storage

- OAuth tokens are **always** encrypted using OS keychain
- Plain tokens are migrated to encrypted format on save
- Tokens are never logged or displayed in UI (use `maskApiKey()`)

### File Permissions

The `profiles.json` file should be readable only by the user:
```bash
chmod 600 ~/.auto-claude/profiles.json
```

### Memory Handling

- Decrypted tokens are held in memory only when needed
- No tokens in error messages or logs

---

## API Profile System

In addition to Claude authentication profiles, there's also an **API Profile** system for custom Anthropic-compatible endpoints:

### APIProfile

```typescript
interface APIProfile {
  id: string;
  name: string;
  baseUrl: string;              // Custom API endpoint
  apiKey: string;               // API key (encrypted)
  models?: {
    default?: string;           // Override default model
    haiku?: string;
    sonnet?: string;
    opus?: string;
  };
  createdAt: number;
  updatedAt: number;
}
```

This is separate from `ClaudeProfile` and used for self-hosted or alternative API endpoints.

---

## Related Documentation

- [Frontend Architecture](./architecture.md) - Electron process model
- [Electron IPC](./electron-ipc.md) - IPC communication patterns
- [Phase Protocol](../phase-protocol.md) - Rate limit detection in builds
