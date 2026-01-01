Here is a comprehensive `README.md` file tailored to the project we have built together. It covers the features, tech stack, design references, and setup instructions.

# Garden SOL ⚡️

**Garden SOL** is a Web3-native **habit-forming platform** that transforms team goals into on-chain commitments. It leverages financial incentives to reinforce positive behaviors, visualizing progress through pixel art grids.

> **Origin Story:** This project was born from discovering that GitHub contribution graphs can be manipulated through commit date spoofing. We realized that genuine accountability requires immutable, on-chain verification - something GitHub's centralized system cannot provide. Garden SOL solves this by anchoring habit tracking to the Solana blockchain, where timestamps are cryptographically guaranteed and cannot be retroactively modified.

# Demo video

Add here

## 🌟 Key Features

* **Proof of Habit (PoH):**
  * Turns abstract goals into measurable on-chain actions.
  * **Commitment Vaults:** Projects act as **escrow accounts** where users stake SOL as a pledge to complete their tasks.
  * **"Skin in the Game":** Failure to meet milestones can trigger slashing mechanisms (optional), while consistency unlocks the vault.
* **Pixelated Habit Tracker:**
  * Visualizes team velocity and consistency as a growing 100-pixel garden.
  * **Dynamic Growth:** The pixel art evolves based on GitHub commits and Jira task completions.
* **On-Chain Accountability:**
  * **Dedicated Vaults (PDA):** Automatically generates a secure vault for each habit/project using Anchor.
  * **Budget as a Goal:** Users define a **"Target Pledge"** when starting, setting a clear financial scale for their commitment.
* **Treasury Management:**
  * **Fund Treasury:** Anyone can contribute SOL to support a project's goals
  * **Secure Withdrawals:** Only project admins can withdraw funds, with on-chain authorization checks
  * **Balance Tracking:** Real-time treasury balance stored on-chain for full transparency
* **Enterprise-Grade Security:**
  * **Input Validation:** 6+ validation checks prevent malformed data (empty names, oversized arrays, duplicate addresses)
  * **Role-Based Access Control (RBAC):** Admin-only operations enforced on-chain
  * **Protected Accounts:** Creator must be in admin list, preventing lock-out scenarios
  * **Comprehensive Testing:** 15 security tests covering all attack vectors

# 🎨 Design & Inspiration

The UI/UX is crafted with a focus on "Dark Mode" aesthetics and high-fidelity interactions.

* **Pixel Grid Concept:**

  * Heavily inspired by the **[Dropbox Brand Guidelines](https://brand.dropbox.com/)**. We utilize a full-screen dynamic grid layout that fills with color as tasks are completed, mimicking the Dropbox "mosaic" visual identity.
* **Hero Layout:**

  * Reference: **[Reducto.ai via Mobbin](https://mobbin.com/)**. The typography hierarchy and "Zoom-out to App" flow were adapted from modern SaaS landing page trends.

## 🛠 Tech Stack

* **Framework:** Vue 3 (Composition API)
* **Build Tool:** Vite
* **Language:** TypeScript
* **Blockchain:**
  * [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
  * [Anchor Framework](https://www.anchor-lang.com/) (Client)
* **Styling:** Scoped CSS (No external UI frameworks, pure custom styling)
* **Database:** Supabase (Planned - for off-chain metadata)

## 🏗️ Architecture: Hybrid On-chain/Off-chain Approach

Garden SOL uses a **hybrid architecture** that combines the security of blockchain with the flexibility of traditional databases.

### On-Chain (Solana Program Accounts)

**Purpose:** Store critical, tamper-proof data that requires trustless verification.

**Data Stored:**

```rust
pub struct Project {
    pub name: String,              // Project name (max 50 chars)
    pub creator: Pubkey,            // Project creator wallet
    pub admins: Vec<Pubkey>,        // Admin wallets (max 10)
    pub members: Vec<Pubkey>,       // Member wallets (max 50)
    pub github_enabled: bool,       // GitHub integration status
    pub jira_enabled: bool,         // Jira integration status
    pub created_at: i64,            // Creation timestamp
    pub tasks_completed: u8,        // Completed tasks (0-100)
    pub total_tasks: u8,            // Total tasks (100)
    pub treasury_balance: u64,      // Treasury balance in lamports
    pub bump: u8,                   // PDA bump seed
}
```

**Why On-Chain:**

- ✅ Project ownership & permissions (immutable)
- ✅ Treasury balance (PDA controls funds)
- ✅ Task completion milestones (for bounty distribution)
- ✅ Trustless verification of project state

### Off-Chain (Supabase Database)

**Purpose:** Store metadata, UI preferences, and data requiring complex queries.

**Data Stored:**

```typescript
interface ProjectMetadata {
  id: string;                      // UUID
  pda: string;                     // Links to on-chain account
  description: string;             // Long-form description
  github_repo: string;             // GitHub integration
  jira_board: string;              // Jira integration
  pixel_pattern: number[];         // Pre-computed pixel grid
  tags: string[];                  // Searchable tags
  thumbnail_url: string;           // Project image
  last_synced: timestamp;          // Last blockchain sync
}
```

**Why Off-Chain:**

- ✅ Fast search/filtering (SQL queries)
- ✅ Rich metadata (descriptions, images)
- ✅ Cost-effective storage (Solana storage is expensive)
- ✅ Integration settings (GitHub, Jira)

### Data Flow

```
┌─────────────────┐
│  User Wallet    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Garden SOL Frontend (Vue 3)        │
│  ┌─────────────┐  ┌──────────────┐ │
│  │  On-Chain   │  │  Off-Chain   │ │
│  │  Actions    │  │  Actions     │ │
│  └──────┬──────┘  └──────┬───────┘ │
└─────────┼─────────────────┼─────────┘
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌──────────────┐
│  Solana Network  │  │  Supabase    │
│  (Devnet/Mainnet)│  │  Database    │
│                  │  │              │
│  • Project PDAs  │  │  • Metadata  │
│  • Treasury      │  │  • Settings  │
│  • Milestones    │  │  • UI State  │
└──────────────────┘  └──────────────┘
```

## 🚀 Getting Started

### PDA Derivation

Project wallets are deterministically derived using:

- Seed 1: `"project"` (constant)
- Seed 2: Project name (unique identifier)
- Seed 3: Creator's wallet address

This ensures each user can create multiple projects with unique names.

## 📖 Blog & Articles

**[The GitHub Commit Date Manipulation Project: Why We Built Garden SOL](./BLOG-ORIGIN-STORY.md)**

A deep dive into the discovery that sparked this project - how GitHub's contribution graphs can be completely fabricated through Git's timestamp manipulation, and why blockchain provides the only trustworthy solution for accountability systems. Covers the technical vulnerability, implications for hiring and open source, and Garden SOL's cryptographic approach to proving consistency.

**Reading Time:** 5 minutes
**Topics:** Blockchain, GitHub Security, Accountability, Solana, Web3

## 📚 Documentation

### Quick Reference
- **[QUICKSTART.md](./QUICKSTART.md)** - Get started quickly with prioritized TODO list and next steps
- **[IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)** - Detailed technical implementation of security features and Treasury system

### Database & Deployment
- **[supabase-schema.sql](./supabase-schema.sql)** - Database schema and Row Level Security policies
- **[supabase-update-policies.sql](./supabase-update-policies.sql)** - Security policy updates (addresses "policy already exists" errors)

### Deployed Program
- **Program ID:** `FqyzG8CkTU9Z5twgWr8FmbYmyEbcbM97w3qiV4xnF7YW`
- **Network:** Solana Devnet
- **Explorer:** [View on Solana Explorer](https://explorer.solana.com/address/FqyzG8CkTU9Z5twgWr8FmbYmyEbcbM97w3qiV4xnF7YW?cluster=devnet)

## ⚖️ Credits & Licenses

* **Design Inspiration:**
  * Layout inspired by [Dropbox Brand Guidelines](https://brand.dropbox.com/).
  * Color palette references [Trawelt](https://trawelt.com/).
* **Assets:**
  * Background images courtesy of [Unsplash](https://unsplash.com/).
  * Fonts: [Inter](https://fonts.google.com/specimen/Inter) & [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (OFL).
* **Tech Stack:**
  * Built with open-source software (Vue, Vite, Anchor).
