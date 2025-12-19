<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface Project {
  id: string;
  name: string;
  pda: string;
  balance: number;
  tasksCompleted: number;
  totalTasks: number;
  createdAt: number;
}

// --- Props & Emits ---
const props = defineProps<{
  project: Project;
}>();

const emit = defineEmits(['close']);

// --- State ---
const loading = ref(true);
const pdaBalance = ref(0);
const onChainData = ref<any>(null);

// --- Computed ---
const progressPercent = computed(() => {
  return Math.round((props.project.tasksCompleted / props.project.totalTasks) * 100);
});

const explorerUrl = computed(() => {
  return `https://explorer.solana.com/address/${props.project.pda}?cluster=devnet`;
});

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
};

const shortAddress = (addr: string) => {
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
};

// --- Methods ---
const fetchPDABalance = async () => {
  loading.value = true;
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const pubkey = new PublicKey(props.project.pda);

    // PDA 잔고 조회
    const balanceLamports = await connection.getBalance(pubkey);
    pdaBalance.value = balanceLamports / LAMPORTS_PER_SOL;

    // 온체인 계정 데이터 조회 (선택사항)
    const accountInfo = await connection.getAccountInfo(pubkey);
    if (accountInfo) {
      onChainData.value = {
        owner: accountInfo.owner.toString(),
        executable: accountInfo.executable,
        lamports: accountInfo.lamports,
      };
    }
  } catch (err) {
    console.error('Failed to fetch PDA balance:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPDABalance();
});
</script>

<template>
  <div class="details-overlay" @click.self="emit('close')">
    <div class="details-modal">
      <!-- Header -->
      <div class="modal-header">
        <div>
          <h2>{{ project.name }}</h2>
          <p class="subtitle">Project Treasury Details</p>
        </div>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-section">
        <div class="spinner"></div>
        <p>Loading on-chain data...</p>
      </div>

      <!-- Content -->
      <div v-else class="modal-content">

        <!-- PDA Section -->
        <div class="info-card pda-card">
          <div class="card-header">
            <h3>🔐 Project Wallet (PDA)</h3>
            <span class="badge">On-Chain</span>
          </div>

          <div class="pda-address">
            <code>{{ project.pda }}</code>
            <button class="btn-copy" @click="copyToClipboard(project.pda)">
              📋
            </button>
          </div>

          <div class="pda-info">
            <div class="info-row">
              <span class="label">Balance:</span>
              <span class="value balance">{{ pdaBalance.toFixed(4) }} SOL</span>
            </div>
            <div class="info-row">
              <span class="label">Network:</span>
              <span class="value">Devnet</span>
            </div>
          </div>

          <a :href="explorerUrl" target="_blank" class="btn-explorer">
            🔍 View on Solana Explorer →
          </a>
        </div>

        <!-- Progress Section -->
        <div class="info-card">
          <h3>📊 Milestone Progress</h3>
          <div class="progress-stats">
            <div class="stat">
              <div class="stat-value">{{ project.tasksCompleted }}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ project.totalTasks - project.tasksCompleted }}</div>
              <div class="stat-label">Remaining</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ progressPercent }}%</div>
              <div class="stat-label">Progress</div>
            </div>
          </div>

          <div class="progress-bar-large">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }">
              <span class="progress-text">{{ progressPercent }}%</span>
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        <div class="info-card">
          <h3>ℹ️ Project Information</h3>
          <div class="metadata-list">
            <div class="meta-row">
              <span class="meta-label">Created:</span>
              <span class="meta-value">{{ formatDate(project.createdAt) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Project ID:</span>
              <span class="meta-value code">{{ shortAddress(project.pda) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Total Tasks:</span>
              <span class="meta-value">{{ project.totalTasks }} milestones</span>
            </div>
          </div>
        </div>

        <!-- On-Chain Account Info -->
        <div v-if="onChainData" class="info-card technical-card">
          <h3>⚙️ Technical Details</h3>
          <div class="technical-info">
            <div class="tech-row">
              <span class="tech-label">Program Owner:</span>
              <code class="tech-value">{{ shortAddress(onChainData.owner) }}</code>
            </div>
            <div class="tech-row">
              <span class="tech-label">Executable:</span>
              <span class="tech-value">{{ onChainData.executable ? 'Yes' : 'No' }}</span>
            </div>
            <div class="tech-row">
              <span class="tech-label">Rent Lamports:</span>
              <span class="tech-value">{{ onChainData.lamports.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="btn-action btn-fund">
            💰 Fund Treasury
          </button>
          <button class="btn-action btn-tasks">
            ✅ Update Tasks
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s ease;
  overflow-y: auto;
  padding: 20px;
}

.details-modal {
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

/* Header */
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

.modal-header h2 {
  font-size: 1.8rem;
  margin: 0 0 4px 0;
  color: white;
}

.subtitle {
  color: #888;
  font-size: 0.9rem;
  margin: 0;
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
  line-height: 1;
}

.close-btn:hover {
  background: #111;
  color: white;
}

/* Loading */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  gap: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #222;
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.modal-content {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Info Cards */
.info-card {
  background: #111;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 24px;
}

.info-card h3 {
  font-size: 1.1rem;
  margin: 0 0 16px 0;
  color: white;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
}

.badge {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

/* PDA Card */
.pda-card {
  background: rgba(74, 222, 128, 0.03);
  border-color: rgba(74, 222, 128, 0.2);
}

.pda-address {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.pda-address code {
  flex: 1;
  font-family: monospace;
  font-size: 0.85rem;
  color: #4ade80;
  word-break: break-all;
}

.btn-copy {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-copy:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.pda-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  color: #888;
  font-size: 0.9rem;
}

.info-row .value {
  color: white;
  font-weight: 500;
}

.info-row .balance {
  color: #4ade80;
  font-family: monospace;
  font-size: 1.1rem;
}

.btn-explorer {
  display: block;
  width: 100%;
  text-align: center;
  padding: 12px;
  background: transparent;
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #4ade80;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-explorer:hover {
  background: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
}

/* Progress Stats */
.progress-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat {
  text-align: center;
  padding: 16px;
  background: #0a0a0a;
  border-radius: 8px;
  border: 1px solid #222;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #4ade80;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: #888;
}

.progress-bar-large {
  width: 100%;
  height: 32px;
  background: #0a0a0a;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #222;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease;
}

.progress-text {
  color: #050505;
  font-weight: 700;
  font-size: 0.9rem;
}

/* Metadata */
.metadata-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #0a0a0a;
  border-radius: 6px;
}

.meta-label {
  color: #888;
  font-size: 0.9rem;
}

.meta-value {
  color: white;
  font-weight: 500;
}

.meta-value.code {
  font-family: monospace;
  color: #4ade80;
}

/* Technical Card */
.technical-card {
  background: #0a0a0a;
  border-color: #1a1a1a;
}

.technical-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tech-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #111;
  border-radius: 6px;
}

.tech-label {
  color: #666;
  font-size: 0.85rem;
}

.tech-value {
  color: #888;
  font-size: 0.85rem;
  font-family: monospace;
}

/* Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 8px;
}

.btn-action {
  padding: 14px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-fund {
  background: #4ade80;
  color: #050505;
}

.btn-fund:hover {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

.btn-tasks {
  background: transparent;
  border: 1px solid #333;
  color: #888;
}

.btn-tasks:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
@media (max-width: 600px) {
  .progress-stats {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .modal-header {
    padding: 24px;
  }

  .modal-content {
    padding: 24px;
  }
}
</style>
