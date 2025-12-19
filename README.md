Here is a comprehensive `README.md` file tailored to the project we have built together. It covers the features, tech stack, design references, and setup instructions.

---

# Garden SOL ⚡️

**Garden SOL** is a Web3-native project management platform that turns development milestones into on-chain crypto bounties. It visualizes team velocity through pixel art grids and integrates GitHub/Jira workflows with Solana smart contracts.

## 🌟 Key Features

* **Immersive Hero Interaction:**
  * Scroll-based zoom-out transition from the concept landing page to the application dashboard.
  * Seamless "Gatekeeper" UI that blocks interaction until a wallet is connected.
* **Pixelated Dashboard:**
  * Visualizes project tasks as a 100-pixel grid.
  * **Dynamic Backgrounds:** Generates unique GitHub-contribution-style pixel art based on project seeds.
* **Web3 Integration:**
  * **Solana & Anchor:** Built with the latest `@coral-xyz/anchor` library.
  * **PDA Generation:** Automatically derives Project Wallet addresses (PDAs) on-chain using seeds (Project Name + Creator Address).
  * **Wallet Auth:** Connects via Phantom (or standard Solana wallets) to unlock features.
* **Project Management:**
  * Create projects with name, admins, and members (wallet addresses).
  * Toggle integrations for GitHub and Jira.

## 🎨 Design & Inspiration

The UI/UX is crafted with a focus on "Dark Mode" aesthetics and high-fidelity interactions.

* **Pixel Grid Concept:**
  * Heavily inspired by the **[Dropbox Brand Guidelines](https://brand.dropbox.com/)**. We utilize a full-screen dynamic grid layout that fills with color as tasks are completed, mimicking the Dropbox "mosaic" visual identity.
* **Hero Layout:**
  * Reference: **[Reducto.ai via Mobbin](https://mobbin.com/)**. The typography hierarchy and "Zoom-out to App" flow were adapted from modern SaaS landing page trends.
* **Color Palette:**
  * Reference: **Trawelt**.
  * Primary: Deep Black (`#050505`)
  * Accent: Neon Green (`#4ade80`) for that "Crypto/Bounty" feel.

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
    pub name: String,              // Project name
    pub creator: Pubkey,            // Project creator wallet
    pub admins: Vec<Pubkey>,        // Admin wallets
    pub members: Vec<Pubkey>,       // Member wallets
    pub created_at: i64,            // Creation timestamp
    pub tasks_completed: u8,        // Completed tasks (0-100)
    pub total_tasks: u8,            // Total tasks (100)
    pub pixel_dna_seed: String,     // Seed for regenerating pixel pattern
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

### Real-World Examples

This hybrid approach is used by leading Web3 projects:

- **Magic Eden**: Trades on-chain, UI/search in database
- **OpenSea**: NFT ownership on-chain, metadata on IPFS/DB
- **Dialect**: Messages on-chain, read receipts off-chain
- **StepN**: Move-to-earn data on-chain, user profiles off-chain

### Future: Decentralized Storage

For complete decentralization, consider:
- **IPFS/Arweave**: Store pixel patterns and images
- **Ceramic Network**: Decentralized database alternative
- **The Graph**: Index on-chain events for querying

## 📂 Project Structure

```bash
rust-cat/
├── frontend/                   # Vue 3 Frontend
│   ├── src/
│   │   ├── assets/
│   │   │   └── styles/
│   │   │       └── global.css   # Design system
│   │   ├── components/
│   │   │   ├── HeroOverlay.vue       # Landing page
│   │   │   ├── PixelDashboard.vue    # Task visualization grid
│   │   │   ├── ProjectDashboard.vue  # Project list view
│   │   │   ├── CreateProject.vue     # Project creation form
│   │   │   ├── SideNavigation.vue    # Drawer navigation
│   │   │   ├── WalletModal.vue       # Connect wallet
│   │   │   └── WalletInfo.vue        # Wallet details modal
│   │   ├── composables/
│   │   │   └── useAnchorProject.ts   # Solana/Anchor integration
│   │   ├── App.vue                   # Main app layout
│   │   └── main.ts                   # Entry point
│   └── package.json
│
├── programs/                   # Anchor Programs (Rust)
│   └── garden_sol/
│       ├── src/
│       │   └── lib.rs          # Smart contract logic
│       └── Cargo.toml
│
├── tests/                      # Anchor Tests
│   └── garden_sol.ts
│
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

* Node.js (v18+)
* Rust & Cargo (for Anchor development)
* Solana CLI & Anchor CLI (v0.31+)
* Solana Wallet Extension (Phantom, Backpack, etc.)
* Supabase Account (optional, for off-chain metadata)

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/rust-cat.git
cd rust-cat
```

#### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

#### 3. Install Anchor Dependencies (Root)

```bash
cd ..
npm install
```

#### 4. Build the Solana Program

```bash
anchor build
```

#### 5. Deploy to Devnet (Optional)

```bash
anchor deploy --provider.cluster devnet
```

After deployment, update the Program ID:

```typescript
// frontend/src/composables/useAnchorProject.ts
const MOCK_MODE = false; // Enable real on-chain mode
const IDL = {
  "address": "YOUR_DEPLOYED_PROGRAM_ID",
  // ...
}
```

#### 6. Setup Supabase (Optional)

1. Create a new project at [supabase.com](https://supabase.com)
2. Create the `projects` table:

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pda TEXT UNIQUE NOT NULL,
  description TEXT,
  github_repo TEXT,
  jira_board TEXT,
  pixel_pattern INTEGER[],
  tags TEXT[],
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced TIMESTAMP WITH TIME ZONE
);

-- Index for fast PDA lookups
CREATE INDEX idx_projects_pda ON projects(pda);
```

3. Add environment variables:

```bash
# frontend/.env.local
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 7. Run Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔗 Smart Contract Integration

### On-Chain Program (Anchor)

The Solana program creates **Project PDAs** (Program Derived Addresses) that act as project treasuries:

```rust
// programs/garden_sol/src/lib.rs
#[program]
pub mod garden_sol {
    pub fn initialize_project(
        ctx: Context<InitializeProject>,
        name: String,
        admins: Vec<Pubkey>,
        members: Vec<Pubkey>,
        github_enabled: bool,
        jira_enabled: bool,
    ) -> Result<()> {
        let project = &mut ctx.accounts.project;
        project.name = name;
        project.creator = ctx.accounts.creator.key();
        project.admins = admins;
        project.members = members;
        project.github_enabled = github_enabled;
        project.jira_enabled = jira_enabled;
        project.created_at = Clock::get()?.unix_timestamp;
        project.tasks_completed = 0;
        project.total_tasks = 100;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeProject<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Project::INIT_SPACE,
        seeds = [b"project", name.as_bytes(), creator.key().as_ref()],
        bump
    )]
    pub project: Account<'info, Project>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

### PDA Derivation

Project wallets are deterministically derived using:
- Seed 1: `"project"` (constant)
- Seed 2: Project name (unique identifier)
- Seed 3: Creator's wallet address

This ensures each user can create multiple projects with unique names.

## 📈 Roadmap

- [x] Hero landing page with scroll-based transitions
- [x] Phantom wallet integration
- [x] Project creation with Solana PDAs
- [x] Drawer-style side navigation
- [x] Pixel DNA pattern generator
- [ ] Supabase integration for metadata
- [ ] GitHub/Jira API integration
- [ ] Task milestone tracking
- [ ] Crypto bounty distribution
- [ ] Multi-signature treasury management
- [ ] Real-time collaboration features
- [ ] Mobile responsive design
- [ ] Mainnet deployment

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚖️ Credits & Acknowledgments

* **Design Inspiration:**
  * Layout inspired by [Dropbox Brand Guidelines](https://brand.dropbox.com/)
  * Color palette references [Trawelt](https://trawelt.com/)
  * Pixel grid concept inspired by GitHub contribution graphs
* **Assets:**
  * Background images courtesy of [Unsplash](https://unsplash.com/)
  * Fonts: [Inter](https://fonts.google.com/specimen/Inter) & [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (OFL)
* **Tech Stack:**
  * Built with open-source software (Vue, Vite, Anchor, Solana)
  * Special thanks to the Solana and Anchor teams

---

**Built with ⚡️ by the Garden SOL team**
