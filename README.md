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

## 📂 Project Structure

```bash
src/
├── assets/             # Static assets
├── components/
│   ├── HeroOverlay.vue     # Initial Landing Page (Concept)
│   ├── PixelDashboard.vue  # Background Grid & Visualizer
│   ├── CreateProject.vue   # Authenticated Dashboard (Forms + Solana)
│   ├── SideNavigation.vue  # Right-side collapsible menu
│   └── WalletModal.vue     # Connect Wallet Popup
├── composables/
│   └── useAnchorProject.ts # Solana/Anchor Logic (PDA, RPC calls)
├── App.vue             # Main Layout & Scroll/Zoom Logic
└── main.ts             # Entry point
```

## 🚀 Getting Started

### Prerequisites

* Node.js (v18+)
* Solana Wallet Extension (Phantom, Backpack, etc.)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/rust-cat.git
   cd rust-cat
   ```
2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```
3. **Environment Setup (Optional)**
   If you have a deployed Solana Program ID, update it in `src/composables/useAnchorProject.ts`:

   ```typescript
   const PROGRAM_ID = new PublicKey("YOUR_DEPLOYED_PROGRAM_ID");
   ```
4. **Run Development Server**

   ```bash
   npm run dev
   ```

## 🔗 Smart Contract Integration

This frontend is designed to interact with a Solana Anchor program. The core logic creates a **Project PDA** using the following seeds:

```rust
// Rust (Anchor) equivalent logic
pub fn initialize_project(ctx: Context<Initialize>, name: String, ...) -> Result<()> {
    // Seeds: b"project", name, admin_pubkey
}
```

Ensure your local or devnet program matches the IDL defined in `useAnchorProject.ts`.

## ⚖️ Credits & Licenses

* **Design Inspiration:**
  * Layout inspired by [Dropbox Brand Guidelines](https://brand.dropbox.com/).
  * Color palette references [Trawelt](https://trawelt.com/).
* **Assets:**
  * Background images courtesy of [Unsplash](https://unsplash.com/).
  * Fonts: [Inter](https://fonts.google.com/specimen/Inter) & [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (OFL).
* **Tech Stack:**
  * Built with open-source software (Vue, Vite, Anchor).
