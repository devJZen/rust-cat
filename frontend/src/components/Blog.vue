<script setup lang="ts">
import { ref } from 'vue';
import { marked } from 'marked';

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true
});

// Custom renderer for special formatting
const renderer = new marked.Renderer();
const originalListItem = renderer.listitem.bind(renderer);
renderer.listitem = (item: any) => {
  const text = item.text || '';
  // Style list items that start with checkmark emoji
  if (text.startsWith('✅ ')) {
    return `<li class="check-item">${text}</li>`;
  }
  return originalListItem(item);
};

marked.use({ renderer });

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  content: string;
  tags: string[];
}

// --- State ---
const selectedPost = ref<BlogPost | null>(null);

// --- Blog Posts Data ---
const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Why We Built Garden SOL: Reimagining Project Management for Web3',
    excerpt: 'Traditional project management tools weren\'t designed for crypto bounties and on-chain transparency. Here\'s why we built Garden SOL.',
    date: '2024-01-15',
    author: 'Garden SOL Team',
    tags: ['Web3', 'Vision', 'Crypto'],
    content: `
# Why We Built Garden SOL

The world of software development is changing. While GitHub Issues and Jira have served us well, they weren't built for the Web3 era where **trustless verification** and **crypto incentives** matter.

## The Problem We Saw

Traditional project management tools have fundamental limitations in Web3 contexts:

1. **No Native Crypto Integration**: You can't attach SOL bounties to GitHub issues
2. **Centralized Trust**: Team members trust the platform, not cryptographic proofs
3. **No On-Chain Verification**: Milestone completion can't be verified on blockchain
4. **Manual Payment Flows**: Treasury management requires constant manual intervention

## Our Vision: Crypto-Native Project Management

Garden SOL bridges the gap between **traditional dev workflows** (GitHub/Jira) and **Web3 incentives** (Solana PDAs as project treasuries).

### Key Innovation: PDA Project Wallets

Every project gets a **Program Derived Address (PDA)** - a unique Solana wallet that:
- Holds project funds securely on-chain
- Releases bounties based on milestone completion
- Provides transparent, immutable treasury history

### Visual Task Tracking

Inspired by GitHub's contribution graph, we visualize your 100-task roadmap as a **pixel art grid** that fills with color as you progress. It's beautiful, gamified, and instantly shows team velocity.

## What's Next?

We're building the future of decentralized project management. Join us on this journey.

**Follow our progress**: [GitHub](https://github.com/garden-sol) | [Twitter](https://twitter.com/gardensol)
    `
  },
  {
    id: '2',
    title: 'The Architecture Behind Garden SOL: Hybrid On-Chain/Off-Chain Design',
    excerpt: 'Learn how we combine Solana\'s security with traditional databases for the best of both worlds.',
    date: '2024-01-10',
    author: 'Technical Team',
    tags: ['Architecture', 'Solana', 'Technical'],
    content: `
# The Architecture Behind Garden SOL

**🔗 Solana Program (On-Chain)**: [View on GitHub](https://github.com/devJZen/rust-cat/tree/main/programs/garden_sol)

Building a production Web3 app means making smart trade-offs between **decentralization** and **user experience**. Here's how we designed Garden SOL.

## Hybrid Architecture Philosophy

**Not everything belongs on-chain.** We carefully chose what to store where:

### On-Chain (Solana Program - Anchor Framework)
✅ Project ownership & permissions (immutable)
✅ Treasury balances (PDAs control funds)
✅ Admin & member access control
✅ Project creation & funding
✅ Trustless verification of project state

**Technology Stack:**
- **Anchor Framework** (Rust) - Solana program development
- **Program Derived Addresses (PDAs)** - Deterministic project wallets
- **Solana Devnet** - Testing environment

**Key Instructions:**
- \`create_project\` - Initialize project with PDA treasury
- \`fund_treasury\` - Add SOL to project wallet
- \`add_admin\` / \`add_member\` - Manage permissions
- \`update_integrations\` - Enable GitHub/Jira

### Off-Chain (Backend Infrastructure)
✅ Fast search/filtering (SQL queries)
✅ Rich metadata (descriptions, images, names)
✅ Cost-effective storage (Solana storage is expensive)
✅ Integration settings (GitHub OAuth, Jira)
✅ User profiles with wallet addresses
✅ Audit logs for project changes

**Technology Stack:**
- **Supabase** - PostgreSQL database + Auth
- **Row Level Security (RLS)** - Database-level permissions
- **GitHub OAuth** - Social authentication
- **Supabase Realtime** - Live data synchronization

**Database Tables:**
- \`projects\` - Project metadata, names, deadlines
- \`user_profiles\` - GitHub/Jira connections per wallet
- \`project_audit_log\` - Change history tracking
- \`waitlist\` - Early access signups

### Frontend (Vue 3 + TypeScript)
✅ Phantom wallet integration
✅ Real-time project dashboard
✅ Pixel art progress visualization
✅ GitHub/Jira integration UI

**Technology Stack:**
- **Vue 3** (Composition API) - Reactive UI
- **TypeScript** - Type safety
- **@solana/web3.js** - Blockchain interaction
- **@project-serum/anchor** - Program client
- **Netlify** - Deployment & hosting

## Why This Works

Leading Web3 projects use similar patterns:
- **Magic Eden**: Trades on-chain, UI/search in database
- **OpenSea**: NFT ownership on-chain, metadata on IPFS/DB
- **Dialect**: Messages on-chain, read receipts off-chain
- **Tensor**: Analytics off-chain, ownership on-chain

## Data Flow

\`\`\`
User (Phantom Wallet)
        ↓
Vue 3 Frontend (Netlify)
        ↓
   ┌────┴────┐
   ↓         ↓
Solana      Supabase
Program     Database
(Anchor)    (PostgreSQL)
   ↓         ↓
Project     Project
PDA         Metadata
Treasury    & Settings
\`\`\`

**Example: Creating a Project**
1. User connects Phantom wallet
2. Frontend calls Solana program \`create_project\`
3. Program creates PDA treasury on-chain
4. Frontend stores metadata in Supabase
5. User funds treasury with 0.1 SOL
6. Dashboard displays project with pixel grid

## Security & Trust Model

**On-Chain (Trustless)**:
- Project ownership is cryptographically verified
- Treasury funds are controlled by program logic
- Access control enforced by Solana runtime

**Off-Chain (Trust Minimized)**:
- Supabase RLS policies enforce permissions
- OAuth tokens stored securely (encrypted)
- Audit logs track all changes
- Data can be verified against on-chain state

## Future: Full Decentralization

We're exploring:
- **IPFS/Arweave** for permanent metadata storage
- **Ceramic Network** as decentralized database alternative
- **The Graph** for indexing on-chain events
- **GenesysGo Shadow Drive** for Solana-native storage

**Want to contribute?** Check out our [GitHub repository](https://github.com/devJZen/rust-cat) and join the discussion!
    `
  },
  {
    id: '3',
    title: 'From GitHub Graphs to Pixel Art: The Design Story',
    excerpt: 'How we turned GitHub contribution graphs and Dropbox\'s brand guidelines into a unique visual identity.',
    date: '2024-01-05',
    author: 'Design Team',
    tags: ['Design', 'UI/UX', 'Inspiration'],
    content: `
# From GitHub Graphs to Pixel Art: The Design Story

Every developer loves seeing their **GitHub contribution graph** light up. We asked: what if your entire project roadmap looked like that?

## Design Inspiration

We studied three sources:

### 1. GitHub Contribution Graphs
The satisfying dopamine hit of filling squares with green. We expanded this to a **100-pixel grid** representing your project's 100 tasks.

### 2. Dropbox Brand Guidelines
Dropbox's [brand guidelines](https://brand.dropbox.com/) taught us how to use **modular grids** and **dynamic color fills** to create visual identity. Each project generates a unique pixel pattern based on its seed.

### 3. Crypto Aesthetics
We embraced the **dark mode, neon green (#4ade80)** aesthetic that feels native to crypto culture. It's not just design - it signals "this is Web3."

## The Pixel DNA System

When you create a project, we generate a **unique pixel pattern** from:
- Project name hash
- Creator wallet address
- Creation timestamp

This becomes your project's visual fingerprint - regeneratable from on-chain data, but unique to you.

## Color Palette

- **Primary**: Deep Black (#050505) - Professional, focused
- **Accent**: Neon Green (#4ade80) - Crypto/Bounty feel
- **Typography**: Inter + Playfair Display - Modern meets elegant

## User Feedback

Beta testers told us the pixel grid is "oddly satisfying" and "makes me want to complete tasks just to see it fill up." That's exactly what we wanted.

Next up: **Dark/light mode toggle** and **custom color themes**. Let us know what you'd like to see!
    `
  }
];

// --- Methods ---
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const openPost = (post: BlogPost) => {
  selectedPost.value = post;
};

const closePost = () => {
  selectedPost.value = null;
};

const parseMarkdown = (content: string) => {
  return marked.parse(content);
};
</script>

<template>
  <div class="blog-container">
    <div class="blog-header">
      <h1>📝 Garden SOL Blog</h1>
      <p>Stories, insights, and updates from the team</p>
    </div>

    <!-- Blog Posts Grid -->
    <div class="blog-grid">
      <article
        v-for="post in blogPosts"
        :key="post.id"
        class="blog-card"
        @click="openPost(post)"
      >
        <div class="card-header">
          <div class="post-meta">
            <span class="post-date">{{ formatDate(post.date) }}</span>
            <span class="post-author">by {{ post.author }}</span>
          </div>
        </div>

        <h2 class="post-title">{{ post.title }}</h2>
        <p class="post-excerpt">{{ post.excerpt }}</p>

        <div class="post-tags">
          <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <button class="btn-read-more">Read More →</button>
      </article>
    </div>

    <!-- Blog Post Modal -->
    <Transition name="fade">
      <div v-if="selectedPost" class="post-modal-overlay" @click.self="closePost">
        <div class="post-modal">
          <div class="modal-header">
            <div>
              <h1>{{ selectedPost.title }}</h1>
              <div class="post-meta">
                <span>{{ formatDate(selectedPost.date) }}</span>
                <span>•</span>
                <span>by {{ selectedPost.author }}</span>
              </div>
            </div>
            <button class="close-btn" @click="closePost">×</button>
          </div>

          <div class="modal-content">
            <div class="post-tags">
              <span v-for="tag in selectedPost.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="post-body" v-html="parseMarkdown(selectedPost.content)"></div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.blog-container {
  width: 100%;
  height: 100%;
  background: #050505;
  color: white;
  padding: 40px;
  padding-right: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
}

.blog-header {
  margin-bottom: 40px;
  border-bottom: 1px solid #222;
  padding-bottom: 20px;
}

.blog-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  margin-bottom: 8px;
  color: white;
}

.blog-header p {
  color: #888;
  font-size: 1rem;
}

/* Blog Grid */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  max-width: 1400px;
}

.blog-card {
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blog-card:hover {
  border-color: #4ade80;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(74, 222, 128, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.post-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #666;
}

.post-date {
  color: #4ade80;
}

.post-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: white;
  margin: 0;
  line-height: 1.4;
}

.post-excerpt {
  color: #888;
  line-height: 1.6;
  font-size: 0.95rem;
  flex: 1;
}

.post-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  background: #111;
  border: 1px solid #333;
  color: #4ade80;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.btn-read-more {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  align-self: flex-start;
}

.btn-read-more:hover {
  border-color: #4ade80;
  color: #4ade80;
}

/* Modal */
.post-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  overflow-y: auto;
}

.post-modal {
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32px;
  border-bottom: 1px solid #222;
  position: sticky;
  top: 0;
  background: #0a0a0a;
  z-index: 10;
}

.modal-header h1 {
  font-size: 1.8rem;
  margin: 0 0 12px 0;
  color: white;
  line-height: 1.3;
}

.modal-header .post-meta {
  font-size: 0.85rem;
  color: #666;
  display: flex;
  gap: 8px;
}

.close-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 2.5rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #111;
  color: white;
}

.modal-content {
  padding: 32px;
}

.modal-content .post-tags {
  margin-bottom: 24px;
}

.post-body {
  color: #ccc;
  line-height: 1.8;
  font-size: 1rem;
}

.post-body :deep(h1) {
  font-size: 2rem;
  color: white;
  margin: 32px 0 16px 0;
  font-family: 'Playfair Display', serif;
}

.post-body :deep(h2) {
  font-size: 1.5rem;
  color: white;
  margin: 24px 0 12px 0;
}

.post-body :deep(h3) {
  font-size: 1.2rem;
  color: #4ade80;
  margin: 20px 0 10px 0;
}

.post-body :deep(p) {
  margin: 12px 0;
}

.post-body :deep(strong) {
  color: #4ade80;
  font-weight: 600;
}

.post-body :deep(ul),
.post-body :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.post-body :deep(li) {
  margin: 8px 0;
  line-height: 1.6;
}

.post-body :deep(li.check-item) {
  color: #4ade80;
  font-weight: 500;
  list-style: none;
  margin-left: -20px;
}

.post-body :deep(a) {
  color: #4ade80;
  text-decoration: none;
  border-bottom: 1px solid rgba(74, 222, 128, 0.3);
  transition: all 0.2s;
}

.post-body :deep(a:hover) {
  border-bottom-color: #4ade80;
  color: #22c55e;
}

.post-body :deep(blockquote) {
  border-left: 3px solid #4ade80;
  padding-left: 16px;
  margin: 16px 0;
  color: #888;
  font-style: italic;
}

.post-body :deep(hr) {
  border: none;
  border-top: 1px solid #222;
  margin: 24px 0;
}

.post-body :deep(pre) {
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 16px 0;
}

.post-body :deep(pre code) {
  font-family: 'Monaco', 'Consolas', monospace;
  color: #4ade80;
  font-size: 0.9rem;
  background: transparent;
  padding: 0;
  border: none;
}

.post-body :deep(code) {
  font-family: 'Monaco', 'Consolas', monospace;
  color: #4ade80;
  background: #111;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9rem;
  border: 1px solid #222;
}

.post-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.post-body :deep(table th),
.post-body :deep(table td) {
  border: 1px solid #222;
  padding: 10px;
  text-align: left;
}

.post-body :deep(table th) {
  background: #111;
  color: #4ade80;
  font-weight: 600;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 1400px) {
  .blog-container {
    padding: 30px;
    padding-right: 260px;
  }

  .blog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .blog-container {
    padding: 30px;
    padding-right: 110px;
  }
}

@media (max-width: 768px) {
  .blog-container {
    padding: 20px;
    padding-right: 90px;
  }

  .blog-header h1 {
    font-size: 2rem;
  }

  .modal-header h1 {
    font-size: 1.5rem;
  }
}
</style>
