<script setup lang="ts">
import { ref, computed } from 'vue';
import ProjectDetails from './ProjectDetails.vue';

interface LeaderboardProject {
  id: string;
  name: string;
  creator: string;
  pda: string;
  balance: number;
  tasksCompleted: number;
  totalTasks: number;
  createdAt: number;
  members: number;
  category: string;
  country: string;
  countryFlag: string;
}

// --- State ---
const searchQuery = ref('');
const selectedCountry = ref('all');
const selectedCategory = ref('all');
const sortBy = ref<'balance' | 'progress' | 'recent'>('balance');
const selectedProject = ref<LeaderboardProject | null>(null);
const showDetailsModal = ref(false);

// --- Mock Leaderboard Data ---
const allProjects = ref<LeaderboardProject[]>([
  {
    id: '1',
    name: 'DeFi Protocol V2',
    creator: 'Alice...7x9K',
    pda: '7xKj2NpQvF8YdR3mWnE9aL4zPqT1bS5cU6wH8vM9nB2k',
    balance: 125.5,
    tasksCompleted: 78,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 30,
    members: 12,
    category: 'DeFi',
    country: 'United States',
    countryFlag: '🇺🇸'
  },
  {
    id: '2',
    name: 'NFT Marketplace',
    creator: 'Bob...3m2P',
    pda: '3m2PqR4tY6nE8wF1sX9zL7vK5cH0jU4bG2nM6pT8aQ1',
    balance: 89.3,
    tasksCompleted: 65,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 20,
    members: 8,
    category: 'NFT',
    country: 'South Korea',
    countryFlag: '🇰🇷'
  },
  {
    id: '3',
    name: 'DAO Governance Tool',
    creator: 'Charlie...9k5L',
    pda: '9k5LmN3pR7qT2wE6yF8sX4zV1cH0jU9bG5nM2pT7aQ4',
    balance: 67.8,
    tasksCompleted: 92,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 45,
    members: 15,
    category: 'DAO',
    country: 'Singapore',
    countryFlag: '🇸🇬'
  },
  {
    id: '4',
    name: 'GameFi Battle Arena',
    creator: 'Diana...2p8M',
    pda: '2p8MqR5tY3nE7wF4sX6zL1vK9cH2jU5bG8nM3pT9aQ7',
    balance: 156.2,
    tasksCompleted: 45,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 15,
    members: 20,
    category: 'Gaming',
    country: 'Japan',
    countryFlag: '🇯🇵'
  },
  {
    id: '5',
    name: 'Social Token Platform',
    creator: 'Eve...7k3N',
    pda: '7k3NmP6pR9qT5wE2yF1sX8zV4cH7jU3bG6nM9pT2aQ5',
    balance: 42.1,
    tasksCompleted: 88,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 60,
    members: 6,
    category: 'Social',
    country: 'United Kingdom',
    countryFlag: '🇬🇧'
  },
  {
    id: '6',
    name: 'Cross-Chain Bridge',
    creator: 'Frank...5m9P',
    pda: '5m9PqR2tY8nE4wF7sX3zL6vK1cH5jU8bG4nM7pT1aQ3',
    balance: 203.7,
    tasksCompleted: 34,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 10,
    members: 10,
    category: 'Infrastructure',
    country: 'Germany',
    countryFlag: '🇩🇪'
  },
  {
    id: '7',
    name: 'Staking Rewards Optimizer',
    creator: 'Grace...8p4L',
    pda: '8p4LmN7pR3qT9wE5yF2sX1zV8cH4jU6bG3nM5pT8aQ2',
    balance: 91.5,
    tasksCompleted: 71,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 25,
    members: 9,
    category: 'DeFi',
    country: 'South Korea',
    countryFlag: '🇰🇷'
  },
  {
    id: '8',
    name: 'Metaverse Real Estate',
    creator: 'Henry...6k2M',
    pda: '6k2MmP4pR8qT3wE9yF5sX2zV7cH1jU4bG9nM6pT3aQ8',
    balance: 178.9,
    tasksCompleted: 56,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 18,
    members: 14,
    category: 'Gaming',
    country: 'United States',
    countryFlag: '🇺🇸'
  },
  {
    id: '9',
    name: 'Yield Farming Aggregator',
    creator: 'Ivan...4n7Q',
    pda: '4n7QmP9pR5qT1wE3yF6sX2zV8cH4jU7bG1nM3pT9aQ5',
    balance: 134.6,
    tasksCompleted: 82,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 12,
    members: 11,
    category: 'DeFi',
    country: 'Switzerland',
    countryFlag: '🇨🇭'
  },
  {
    id: '10',
    name: 'AI-Powered Trading Bot',
    creator: 'Julia...2k8P',
    pda: '2k8PmN5pR7qT3wE9yF1sX6zV4cH2jU8bG7nM4pT1aQ3',
    balance: 198.3,
    tasksCompleted: 67,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 8,
    members: 16,
    category: 'DeFi',
    country: 'Japan',
    countryFlag: '🇯🇵'
  },
  {
    id: '11',
    name: 'Community NFT Collection',
    creator: 'Kevin...9m3L',
    pda: '9m3LmP6pR2qT8wE4yF7sX1zV5cH9jU3bG4nM8pT6aQ2',
    balance: 76.2,
    tasksCompleted: 94,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 35,
    members: 7,
    category: 'NFT',
    country: 'Canada',
    countryFlag: '🇨🇦'
  },
  {
    id: '12',
    name: 'Web3 Education Platform',
    creator: 'Laura...5p1M',
    pda: '5p1MmN8pR4qT6wE2yF9sX3zV7cH1jU5bG2nM6pT4aQ8',
    balance: 53.7,
    tasksCompleted: 79,
    totalTasks: 100,
    createdAt: Date.now() - 86400000 * 22,
    members: 13,
    category: 'Social',
    country: 'Singapore',
    countryFlag: '🇸🇬'
  }
]);

const categories = ['all', 'DeFi', 'NFT', 'DAO', 'Gaming', 'Social', 'Infrastructure'];

const countries = [
  { name: 'all', flag: '🌍', label: 'All Countries' },
  { name: 'United States', flag: '🇺🇸', label: 'United States' },
  { name: 'South Korea', flag: '🇰🇷', label: 'South Korea' },
  { name: 'Japan', flag: '🇯🇵', label: 'Japan' },
  { name: 'Singapore', flag: '🇸🇬', label: 'Singapore' },
  { name: 'United Kingdom', flag: '🇬🇧', label: 'United Kingdom' },
  { name: 'Germany', flag: '🇩🇪', label: 'Germany' },
  { name: 'Switzerland', flag: '🇨🇭', label: 'Switzerland' },
  { name: 'Canada', flag: '🇨🇦', label: 'Canada' }
];

// --- Computed ---
const filteredProjects = computed(() => {
  let result = allProjects.value;

  // Filter by country
  if (selectedCountry.value !== 'all') {
    result = result.filter(p => p.country === selectedCountry.value);
  }

  // Filter by category
  if (selectedCategory.value !== 'all') {
    result = result.filter(p => p.category === selectedCategory.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.creator.toLowerCase().includes(query) ||
      p.pda.toLowerCase().includes(query) ||
      p.country.toLowerCase().includes(query)
    );
  }

  // Sort
  result = [...result].sort((a, b) => {
    if (sortBy.value === 'balance') {
      return b.balance - a.balance;
    } else if (sortBy.value === 'progress') {
      const aProgress = a.tasksCompleted / a.totalTasks;
      const bProgress = b.tasksCompleted / b.totalTasks;
      return bProgress - aProgress;
    } else { // recent
      return b.createdAt - a.createdAt;
    }
  });

  return result;
});

// --- Methods ---
const formatBalance = (balance: number) => {
  return balance.toFixed(2) + ' SOL';
};

const getProgressPercent = (completed: number, total: number) => {
  return Math.round((completed / total) * 100);
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const viewProjectDetails = (project: LeaderboardProject) => {
  selectedProject.value = project;
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedProject.value = null;
};

const getRankEmoji = (index: number) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
};
</script>

<template>
  <div class="leaderboard-container">
    <div class="leaderboard-header">
      <h1>🏆 Project Leaderboard</h1>
      <p>Discover and explore active Web3 projects on Garden SOL</p>
    </div>

    <!-- Filters & Search -->
    <div class="controls-section">
      <!-- Search Bar -->
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search projects, creators, countries, or PDA addresses..."
          class="search-input"
        />
      </div>

      <!-- Country Filter -->
      <div class="filter-group">
        <label>Country:</label>
        <div class="category-tabs">
          <button
            v-for="country in countries"
            :key="country.name"
            :class="['category-tab', { active: selectedCountry === country.name }]"
            @click="selectedCountry = country.name"
          >
            <span class="flag-icon">{{ country.flag }}</span>
            <span class="country-name">{{ country.name === 'all' ? 'All' : country.label }}</span>
          </button>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="filter-group">
        <label>Category:</label>
        <div class="category-tabs">
          <button
            v-for="cat in categories"
            :key="cat"
            :class="['category-tab', { active: selectedCategory === cat }]"
            @click="selectedCategory = cat"
          >
            {{ cat === 'all' ? 'All' : cat }}
          </button>
        </div>
      </div>

      <!-- Sort Options -->
      <div class="sort-group">
        <label>Sort by:</label>
        <select v-model="sortBy" class="sort-select">
          <option value="balance">💰 Treasury Balance</option>
          <option value="progress">📊 Progress</option>
          <option value="recent">🕒 Most Recent</option>
        </select>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">{{ filteredProjects.length }}</div>
        <div class="stat-label">Active Projects</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">
          {{ filteredProjects.reduce((sum, p) => sum + p.balance, 0).toFixed(2) }}
        </div>
        <div class="stat-label">Total SOL Locked</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">
          {{ Math.round(filteredProjects.reduce((sum, p) => sum + (p.tasksCompleted / p.totalTasks), 0) / filteredProjects.length * 100) }}%
        </div>
        <div class="stat-label">Average Progress</div>
      </div>
    </div>

    <!-- Leaderboard Table -->
    <div class="leaderboard-table">
      <div class="table-header">
        <div class="col-rank">Rank</div>
        <div class="col-project">Project</div>
        <div class="col-country">Country</div>
        <div class="col-creator">Creator</div>
        <div class="col-treasury">Treasury</div>
        <div class="col-progress">Progress</div>
        <div class="col-members">Members</div>
        <div class="col-action"></div>
      </div>

      <div
        v-for="(project, index) in filteredProjects"
        :key="project.id"
        class="table-row"
      >
        <div class="col-rank">
          <span class="rank-badge">{{ getRankEmoji(index) }}</span>
        </div>

        <div class="col-project">
          <div class="project-info">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-category">{{ project.category }}</div>
          </div>
        </div>

        <div class="col-country">
          <div class="country-info">
            <span class="country-flag">{{ project.countryFlag }}</span>
            <span class="country-text">{{ project.country }}</span>
          </div>
        </div>

        <div class="col-creator">
          <code class="creator-address">{{ project.creator }}</code>
        </div>

        <div class="col-treasury">
          <div class="treasury-amount">{{ formatBalance(project.balance) }}</div>
        </div>

        <div class="col-progress">
          <div class="progress-info">
            <span class="progress-text">{{ getProgressPercent(project.tasksCompleted, project.totalTasks) }}%</span>
            <div class="progress-bar-mini">
              <div
                class="progress-fill-mini"
                :style="{ width: getProgressPercent(project.tasksCompleted, project.totalTasks) + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div class="col-members">
          <span class="members-count">{{ project.members }} members</span>
        </div>

        <div class="col-action">
          <button class="btn-view-small" @click="viewProjectDetails(project)">
            View →
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredProjects.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No projects found matching your criteria</p>
      </div>
    </div>

    <!-- Project Details Modal -->
    <Transition name="fade">
      <ProjectDetails
        v-if="showDetailsModal && selectedProject"
        :project="selectedProject"
        @close="closeDetailsModal"
      />
    </Transition>
  </div>
</template>

<style scoped>
.leaderboard-container {
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

.leaderboard-header {
  margin-bottom: 32px;
  border-bottom: 1px solid #222;
  padding-bottom: 20px;
}

.leaderboard-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  margin-bottom: 8px;
  color: white;
}

.leaderboard-header p {
  color: #888;
  font-size: 1rem;
}

/* Controls */
.controls-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

.search-bar {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
}

.search-input {
  width: 100%;
  background: #0a0a0a;
  border: 1px solid #333;
  color: white;
  padding: 14px 16px 14px 48px;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #4ade80;
}

.filter-group,
.sort-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-group label,
.sort-group label {
  color: #888;
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 80px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tab {
  background: #0a0a0a;
  border: 1px solid #333;
  color: #888;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-tab:hover {
  border-color: #4ade80;
  color: #4ade80;
}

.category-tab.active {
  background: #4ade80;
  border-color: #4ade80;
  color: #050505;
  font-weight: 600;
}

.flag-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.country-name {
  white-space: nowrap;
}

.sort-select {
  background: #0a0a0a;
  border: 1px solid #333;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: border-color 0.2s;
}

.sort-select:focus {
  outline: none;
  border-color: #4ade80;
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #4ade80;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.85rem;
  color: #888;
}

/* Leaderboard Table */
.leaderboard-table {
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 12px;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 80px 2fr 1.2fr 1.2fr 1fr 1.3fr 0.8fr 100px;
  gap: 12px;
  padding: 16px 20px;
  align-items: center;
}

.table-header {
  background: #111;
  border-bottom: 1px solid #222;
  font-size: 0.8rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-row {
  border-bottom: 1px solid #1a1a1a;
  transition: all 0.2s;
}

.table-row:hover {
  background: #111;
}

.table-row:last-child {
  border-bottom: none;
}

/* Columns */
.col-rank {
  text-align: center;
}

.rank-badge {
  font-size: 1.5rem;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-name {
  font-weight: 600;
  color: white;
  font-size: 0.95rem;
}

.project-category {
  font-size: 0.75rem;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.country-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.country-flag {
  font-size: 1.2rem;
}

.country-text {
  font-size: 0.85rem;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.creator-address {
  font-family: monospace;
  font-size: 0.85rem;
  color: #888;
  background: #111;
  padding: 4px 8px;
  border-radius: 4px;
}

.treasury-amount {
  font-family: monospace;
  font-size: 0.95rem;
  color: #4ade80;
  font-weight: 600;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-text {
  font-size: 0.85rem;
  color: #ccc;
  font-weight: 500;
}

.progress-bar-mini {
  width: 100%;
  height: 6px;
  background: #111;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill-mini {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.3s ease;
}

.members-count {
  font-size: 0.85rem;
  color: #888;
}

.btn-view-small {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-view-small:hover {
  border-color: #4ade80;
  color: #4ade80;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state p {
  color: #666;
  font-size: 1rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 1400px) {
  .leaderboard-container {
    padding: 30px;
    padding-right: 260px;
  }
}

@media (max-width: 1024px) {
  .leaderboard-container {
    padding: 30px;
    padding-right: 110px;
  }

  .stats-overview {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: 60px 1fr 80px 100px;
    gap: 12px;
  }

  .col-creator,
  .col-members,
  .col-progress,
  .col-country {
    display: none;
  }

  .col-treasury {
    text-align: right;
  }
}

@media (max-width: 768px) {
  .leaderboard-container {
    padding: 20px;
    padding-right: 90px;
  }

  .leaderboard-header h1 {
    font-size: 2rem;
  }

  .category-tabs {
    width: 100%;
  }

  .category-tab {
    flex: 1;
    min-width: 60px;
  }
}
</style>
