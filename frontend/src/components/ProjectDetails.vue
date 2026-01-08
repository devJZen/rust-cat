<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useAnchorProject } from '../composables/useAnchorProject';

interface Project {
  id: string;
  name: string;
  pda: string;
  balance: number;
  tasksCompleted: number;
  totalTasks: number;
  createdAt: number;
  payment_tx?: string; // 0.1 SOL 결제 트랜잭션 해시
  creator_wallet?: string;
  admins?: string[];
  github_repo?: string;
}

interface Milestone {
  id: number;
  name: string;
  branch: string;
  completed: boolean;
}

// --- Props & Emits ---
const props = defineProps<{
  project: Project;
}>();

const emit = defineEmits(['close']);

// --- Composables ---
const { fundTreasury } = useAnchorProject();

// --- State ---
const loading = ref(true);
const pdaBalance = ref(0);
const onChainData = ref<any>(null);

// Fund Treasury Modal
const showFundModal = ref(false);
const fundAmount = ref('');
const fundingInProgress = ref(false);
const fundError = ref('');

// Funding History
interface FundingTransaction {
  signature: string;
  amount: number;
  sender: string;
  timestamp: number;
}

const fundingHistory = ref<FundingTransaction[]>([]);
const loadingHistory = ref(false);

// GitHub & Milestones
const connectedWallet = ref('');
const isAdmin = ref(false);
const githubRepo = ref('');
const editingRepo = ref(false);
const savingRepo = ref(false);
const milestones = ref<Milestone[]>([]);
const selectedMilestone = ref<Milestone | null>(null);
const showMilestoneModal = ref(false);
const copiedCommand = ref(false);

// --- Computed ---
const progressPercent = computed(() => {
  return Math.round((props.project.tasksCompleted / props.project.totalTasks) * 100);
});

const explorerUrl = computed(() => {
  return `https://explorer.solana.com/address/${props.project.pda}?cluster=devnet`;
});

const paymentExplorerUrl = computed(() => {
  if (!props.project.payment_tx) return '';
  return `https://explorer.solana.com/tx/${props.project.payment_tx}?cluster=devnet`;
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

const formatTimestamp = (timestamp: number) => {
  const now = Date.now() / 1000; // Convert to seconds
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
};

const copyGitCommand = async (text: string) => {
  await navigator.clipboard.writeText(text);
  copiedCommand.value = true;
  setTimeout(() => {
    copiedCommand.value = false;
  }, 2000);
};

const shortAddress = (addr: string) => {
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
};

// --- Methods ---
const fetchPDABalance = async () => {
  loading.value = true;
  try {
    // PDA 주소 검증
    if (!props.project.pda || props.project.pda.length < 32) {
      console.warn('Invalid or missing PDA address');
      pdaBalance.value = 0;
      return;
    }

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(props.project.pda);
    } catch (err) {
      console.error('Invalid PDA address format:', props.project.pda);
      pdaBalance.value = 0;
      return;
    }

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

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
    pdaBalance.value = 0;
  } finally {
    loading.value = false;
  }
};

const fetchFundingHistory = async () => {
  loadingHistory.value = true;
  try {
    // PDA 주소 검증
    if (!props.project.pda || props.project.pda.length < 32) {
      console.warn('Invalid or missing PDA address');
      fundingHistory.value = [];
      return;
    }

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    let pubkey: PublicKey;

    try {
      pubkey = new PublicKey(props.project.pda);
    } catch (err) {
      console.error('Invalid PDA address:', props.project.pda, err);
      fundingHistory.value = [];
      return;
    }

    // PDA로 들어온 트랜잭션 가져오기 (최근 10개)
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 10 });

    const transactions: FundingTransaction[] = [];

    for (const sig of signatures) {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });

        if (!tx || !tx.meta) continue;

        // PDA의 인덱스 찾기 (accountKeys에서)
        const pdaIndex = tx.transaction.message.staticAccountKeys?.findIndex(
          key => key.toString() === props.project.pda
        );

        if (pdaIndex === undefined || pdaIndex === -1) continue;

        // PDA의 잔액 변화 확인
        const preBalance = tx.meta.preBalances[pdaIndex] || 0;
        const postBalance = tx.meta.postBalances[pdaIndex] || 0;
        const amount = (postBalance - preBalance) / LAMPORTS_PER_SOL;

        // 금액이 양수이면 입금
        if (amount > 0) {
          // 첫 번째 서명자가 보낸 사람 (fee payer)
          const senderPubkey = tx.transaction.message.staticAccountKeys?.[0];
          const sender = senderPubkey?.toString() || 'Unknown';

          transactions.push({
            signature: sig.signature,
            amount: amount,
            sender: sender,
            timestamp: sig.blockTime || 0
          });
        }
      } catch (err) {
        console.error('Failed to parse transaction:', sig.signature, err);
      }
    }

    fundingHistory.value = transactions;
  } catch (err) {
    console.error('Failed to fetch funding history:', err);
    fundingHistory.value = [];
  } finally {
    loadingHistory.value = false;
  }
};

const handleFundTreasury = async () => {
  const amount = parseFloat(fundAmount.value);

  // 입력 검증
  if (!fundAmount.value || isNaN(amount) || amount <= 0) {
    fundError.value = 'Please enter a valid amount greater than 0';
    return;
  }

  if (amount > 10) {
    fundError.value = 'Maximum 10 SOL per transaction';
    return;
  }

  fundingInProgress.value = true;
  fundError.value = '';

  try {
    console.log(`Funding ${amount} SOL to ${props.project.pda}...`);

    const txHash = await fundTreasury(props.project.pda, amount);

    console.log('✅ Treasury funded! TX:', txHash);

    // 잔액 새로고침
    await fetchPDABalance();

    // 입금 내역 새로고침
    await fetchFundingHistory();

    // 성공 메시지
    alert(`Successfully funded ${amount} SOL!\n\nTransaction: ${txHash.slice(0, 16)}...`);

    // 모달 닫기
    showFundModal.value = false;
    fundAmount.value = '';

  } catch (err) {
    console.error('Fund treasury error:', err);
    fundError.value = err instanceof Error ? err.message : 'Failed to fund treasury';
  } finally {
    fundingInProgress.value = false;
  }
};

// Initialize milestones
const initializeMilestones = () => {
  const totalMilestones = props.project.totalTasks || 100;
  milestones.value = Array.from({ length: totalMilestones }, (_, i) => ({
    id: i,
    name: `Milestone ${String(i).padStart(3, '0')}`,
    branch: `milestone-${String(i).padStart(3, '0')}`,
    completed: i === 0 || i < props.project.tasksCompleted // milestone-000 is always completed (init)
  }));
};

const openMilestone = (milestone: Milestone) => {
  selectedMilestone.value = milestone;
  showMilestoneModal.value = true;
};

const getGitCommands = (milestone: Milestone) => {
  const repo = githubRepo.value || 'your-repo-url';
  return `# Create and switch to milestone branch
git checkout -b ${milestone.branch}

# Make your changes, then commit
git add .
git commit -m "${milestone.name}: Initial implementation"

# Push to remote
git push origin ${milestone.branch}

# Create pull request
gh pr create --title "${milestone.name}" --body "Implementation for ${milestone.name}"`;
};

const saveGithubRepo = () => {
  savingRepo.value = true;
  // TODO: Save to Supabase
  setTimeout(() => {
    savingRepo.value = false;
    editingRepo.value = false;
    alert('GitHub repository saved!');
  }, 1000);
};

onMounted(async () => {
  fetchPDABalance();
  fetchFundingHistory();
  initializeMilestones();

  // Get connected wallet
  try {
    // @ts-expect-error - Phantom wallet global
    if (window.solana && window.solana.isConnected) {
      // @ts-expect-error - Phantom wallet API
      const publicKey = window.solana.publicKey;
      if (publicKey) {
        connectedWallet.value = publicKey.toString();

        // Check if user is admin
        if (props.project.admins) {
          isAdmin.value = props.project.admins.includes(connectedWallet.value);
        }
      }
    }
  } catch (err) {
    console.error('Failed to get wallet:', err);
  }

  // Load GitHub repo
  githubRepo.value = props.project.github_repo || '';
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

      <!-- Content - 3 Column Layout -->
      <div v-else class="modal-content">
        <div class="three-column-layout">

          <!-- LEFT COLUMN: Metadata -->
          <div class="column column-left">
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

            <!-- Technical Details -->
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

            <!-- Funding History Ticker -->
            <div class="info-card funding-history-card">
              <div class="card-header">
                <h3>💸 Funding History</h3>
                <span v-if="loadingHistory" class="loading-badge">Loading...</span>
              </div>

              <div v-if="fundingHistory.length === 0 && !loadingHistory" class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No funding transactions yet</p>
                <small>Be the first to fund this project!</small>
              </div>

              <div v-else class="funding-ticker">
                <div
                  v-for="tx in fundingHistory"
                  :key="tx.signature"
                  class="ticker-item"
                >
                  <div class="ticker-header">
                    <span class="ticker-amount">+{{ tx.amount.toFixed(4) }} SOL</span>
                    <span class="ticker-time">{{ formatTimestamp(tx.timestamp) }}</span>
                  </div>
                  <div class="ticker-details">
                    <span class="ticker-label">From:</span>
                    <code class="ticker-address">{{ shortAddress(tx.sender) }}</code>
                  </div>
                  <a
                    :href="`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`"
                    target="_blank"
                    class="ticker-link"
                  >
                    🔍 View TX
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- CENTER COLUMN: Milestone Progress -->
          <div class="column column-center">
            <div class="info-card progress-card">
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

              <!-- GitHub Repository (Admin Only) -->
              <div v-if="isAdmin" class="github-repo-section">
                <div class="github-header">
                  <h4>🔗 GitHub Repository</h4>
                  <button
                    v-if="!editingRepo"
                    class="btn-edit"
                    @click="editingRepo = true"
                  >
                    Edit
                  </button>
                </div>
                <div v-if="editingRepo" class="github-edit">
                  <input
                    v-model="githubRepo"
                    type="text"
                    placeholder="https://github.com/username/repository"
                    class="github-input"
                  />
                  <div class="github-actions">
                    <button
                      class="btn-save"
                      @click="saveGithubRepo"
                      :disabled="savingRepo"
                    >
                      {{ savingRepo ? 'Saving...' : 'Save' }}
                    </button>
                    <button
                      class="btn-cancel-edit"
                      @click="editingRepo = false; githubRepo = project.github_repo || ''"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div v-else class="github-display">
                  <code v-if="githubRepo">{{ githubRepo }}</code>
                  <span v-else class="empty-repo">No repository set</span>
                </div>
              </div>

              <!-- Milestone Grid -->
              <div class="milestone-grid-section">
                <h4>🎯 Milestones (Click to View Commands)</h4>
                <div class="milestone-grid">
                  <div
                    v-for="milestone in milestones"
                    :key="milestone.id"
                    class="milestone-item"
                    :class="{ completed: milestone.completed, init: milestone.id === 0 }"
                    @click="openMilestone(milestone)"
                  >
                    <div class="milestone-number">{{ String(milestone.id).padStart(3, '0') }}</div>
                    <div v-if="milestone.completed" class="milestone-check">✓</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button class="btn-action btn-fund" @click="showFundModal = true">
                💰 Fund Treasury
              </button>
              <button class="btn-action btn-tasks">
                ✅ Update Tasks
              </button>
            </div>
          </div>

          <!-- RIGHT COLUMN: Blockchain Info -->
          <div class="column column-right">
            <!-- PDA Section -->
            <div class="info-card pda-card">
              <div class="card-header">
                <h3>🔐 Project Wallet</h3>
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
                🔍 View on Explorer →
              </a>
            </div>

            <!-- Payment Transaction Section -->
            <div v-if="project.payment_tx" class="info-card payment-card">
              <div class="card-header">
                <h3>💳 Payment</h3>
                <span class="badge badge-success">Confirmed</span>
              </div>

              <div class="payment-info">
                <div class="info-row">
                  <span class="label">Amount:</span>
                  <span class="value balance">0.1 SOL</span>
                </div>
                <div class="info-row">
                  <span class="label">TX:</span>
                  <code class="tx-hash">{{ shortAddress(project.payment_tx) }}</code>
                </div>
              </div>

              <a :href="paymentExplorerUrl" target="_blank" class="btn-explorer btn-explorer-payment">
                🔍 View TX →
              </a>
            </div>
          </div>

        </div>
      </div>

      <!-- Fund Treasury Modal -->
      <div v-if="showFundModal" class="fund-modal-overlay" @click.self="showFundModal = false">
        <div class="fund-modal">
          <div class="fund-modal-header">
            <h3>💰 Fund Treasury</h3>
            <button class="close-btn" @click="showFundModal = false">×</button>
          </div>

          <div class="fund-modal-content">
            <p class="fund-description">
              Send SOL to the project treasury. Funds can be withdrawn by project admins.
            </p>

            <div class="fund-input-group">
              <label>Amount (SOL)</label>
              <input
                v-model="fundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                placeholder="0.1"
                class="fund-input"
                :disabled="fundingInProgress"
              />
              <span class="fund-hint">Min: 0.01 SOL | Max: 10 SOL</span>
            </div>

            <div v-if="fundError" class="fund-error">
              ⚠️ {{ fundError }}
            </div>

            <div class="fund-info">
              <div class="info-row">
                <span>Current Balance:</span>
                <span class="value">{{ pdaBalance.toFixed(4) }} SOL</span>
              </div>
              <div class="info-row">
                <span>Network:</span>
                <span class="value">Devnet</span>
              </div>
            </div>

            <div class="fund-actions">
              <button
                class="btn-cancel"
                @click="showFundModal = false"
                :disabled="fundingInProgress"
              >
                Cancel
              </button>
              <button
                class="btn-confirm"
                @click="handleFundTreasury"
                :disabled="fundingInProgress || !fundAmount"
              >
                <span v-if="fundingInProgress">Funding...</span>
                <span v-else>Fund Treasury</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Milestone Commands Modal -->
      <div v-if="showMilestoneModal && selectedMilestone" class="fund-modal-overlay" @click.self="showMilestoneModal = false">
        <div class="milestone-modal">
          <div class="fund-modal-header">
            <div>
              <h3>{{ selectedMilestone.name }}</h3>
              <p class="milestone-subtitle">Branch: <code>{{ selectedMilestone.branch }}</code></p>
            </div>
            <button class="close-btn" @click="showMilestoneModal = false">×</button>
          </div>

          <div class="fund-modal-content">
            <div class="milestone-status">
              <div class="status-badge" :class="{ completed: selectedMilestone.completed }">
                {{ selectedMilestone.completed ? '✓ Completed' : '⏳ Pending' }}
              </div>
            </div>

            <p class="milestone-description">
              Use these git commands to create and work on this milestone branch.
            </p>

            <div class="git-commands-section">
              <div class="commands-header">
                <span>Git Commands</span>
                <button
                  class="btn-copy-command"
                  @click="copyGitCommand(getGitCommands(selectedMilestone))"
                >
                  {{ copiedCommand ? '✓ Copied!' : '📋 Copy All' }}
                </button>
              </div>
              <pre class="git-commands"><code>{{ getGitCommands(selectedMilestone) }}</code></pre>
            </div>

            <div class="milestone-info">
              <div class="info-item">
                <span class="info-icon">🔖</span>
                <span class="info-text">Branch name: <code>{{ selectedMilestone.branch }}</code></span>
              </div>
              <div class="info-item">
                <span class="info-icon">📁</span>
                <span class="info-text">Repository: <code>{{ githubRepo || 'Not set' }}</code></span>
              </div>
            </div>

            <div class="milestone-actions">
              <button
                class="btn-close-milestone"
                @click="showMilestoneModal = false"
              >
                Close
              </button>
            </div>
          </div>
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
  max-width: 1400px;
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
}

/* Three Column Layout */
.three-column-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 24px;
  align-items: start;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.column-left {
  /* Metadata column */
}

.column-center {
  /* Milestone progress - largest column */
}

.column-right {
  /* Blockchain info */
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

/* Payment Card */
.payment-card {
  background: rgba(74, 222, 128, 0.02);
  border-color: rgba(74, 222, 128, 0.15);
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.tx-hash {
  font-family: monospace;
  font-size: 0.85rem;
  color: #4ade80;
  background: #0a0a0a;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #222;
}

.badge-success {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.4);
}

.btn-explorer-payment {
  border-color: rgba(74, 222, 128, 0.25);
}

.btn-explorer-payment:hover {
  background: rgba(74, 222, 128, 0.08);
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

/* Progress Card */
.progress-card {
  background: rgba(74, 222, 128, 0.02);
  border-color: rgba(74, 222, 128, 0.15);
}

/* Progress Stats */
.progress-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
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

/* Pixel Grid Preview */
.pixel-grid-preview {
  margin-top: 24px;
  padding: 20px;
  background: #0a0a0a;
  border-radius: 12px;
  border: 1px solid #222;
}

.pixel-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  max-width: 100%;
  margin: 0 auto;
}

.pixel {
  aspect-ratio: 1;
  background: #1a1a1a;
  border-radius: 4px;
  border: 1px solid #222;
  transition: all 0.3s ease;
}

.pixel.active {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
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
@media (max-width: 1200px) {
  .three-column-layout {
    grid-template-columns: 1fr;
  }

  .column-center {
    order: 1;
  }

  .column-left {
    order: 2;
  }

  .column-right {
    order: 3;
  }

  .details-modal {
    max-width: 900px;
  }
}

@media (max-width: 600px) {
  .progress-stats {
    grid-template-columns: 1fr;
  }

  .modal-header {
    padding: 24px;
  }

  .modal-content {
    padding: 24px;
  }

  .pixel-grid {
    gap: 4px;
  }

  .details-modal {
    max-width: 100%;
  }
}

/* Fund Treasury Modal */
.fund-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  animation: fadeIn 0.2s ease;
}

.fund-modal {
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

.fund-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #222;
}

.fund-modal-header h3 {
  font-size: 1.4rem;
  margin: 0;
  color: white;
}

.fund-modal-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fund-description {
  color: #888;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.fund-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fund-input-group label {
  color: #aaa;
  font-size: 0.9rem;
  font-weight: 500;
}

.fund-input {
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 14px 16px;
  color: white;
  font-size: 1.1rem;
  font-family: monospace;
  transition: all 0.2s;
}

.fund-input:focus {
  outline: none;
  border-color: #4ade80;
  background: #0a0a0a;
}

.fund-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fund-hint {
  color: #666;
  font-size: 0.75rem;
}

.fund-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.fund-info {
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fund-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #888;
  font-size: 0.9rem;
}

.fund-info .value {
  color: #4ade80;
  font-weight: 500;
  font-family: monospace;
}

.fund-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel {
  padding: 14px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  border: 1px solid #333;
  color: #888;
}

.btn-cancel:hover:not(:disabled) {
  border-color: #555;
  color: white;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-confirm {
  padding: 14px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  background: #4ade80;
  color: #050505;
  border: none;
}

.btn-confirm:hover:not(:disabled) {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Funding History Ticker */
.funding-history-card {
  background: #0a0a0a;
  border-color: rgba(74, 222, 128, 0.2);
}

.loading-badge {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 4px 0;
  color: #888;
  font-size: 0.9rem;
}

.empty-state small {
  color: #666;
  font-size: 0.75rem;
}

.funding-ticker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

/* Custom scrollbar */
.funding-ticker::-webkit-scrollbar {
  width: 6px;
}

.funding-ticker::-webkit-scrollbar-track {
  background: #111;
  border-radius: 3px;
}

.funding-ticker::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.funding-ticker::-webkit-scrollbar-thumb:hover {
  background: #4ade80;
}

.ticker-item {
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
  animation: slideInLeft 0.3s ease;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.ticker-item:hover {
  border-color: rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.02);
}

.ticker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ticker-amount {
  color: #4ade80;
  font-weight: 700;
  font-size: 1rem;
  font-family: monospace;
}

.ticker-time {
  color: #666;
  font-size: 0.75rem;
}

.ticker-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ticker-label {
  color: #888;
  font-size: 0.8rem;
}

.ticker-address {
  font-family: monospace;
  font-size: 0.75rem;
  color: #aaa;
  background: #0a0a0a;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #222;
}

.ticker-link {
  display: inline-block;
  color: #4ade80;
  text-decoration: none;
  font-size: 0.75rem;
  padding: 4px 8px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 4px;
  transition: all 0.2s;
}

.ticker-link:hover {
  background: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
}

/* GitHub Repository Section */
.github-repo-section {
  margin-top: 24px;
  padding: 20px;
  background: rgba(74, 222, 128, 0.03);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 12px;
}

.github-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.github-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #aaa;
}

.btn-edit {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.github-display {
  padding: 12px;
  background: #0a0a0a;
  border-radius: 6px;
  border: 1px solid #222;
}

.github-display code {
  font-family: monospace;
  font-size: 0.85rem;
  color: #4ade80;
  word-break: break-all;
}

.empty-repo {
  color: #666;
  font-size: 0.85rem;
  font-style: italic;
}

.github-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.github-input {
  padding: 12px;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-family: monospace;
  transition: all 0.2s;
}

.github-input:focus {
  outline: none;
  border-color: #4ade80;
}

.github-actions {
  display: flex;
  gap: 10px;
}

.btn-save {
  flex: 1;
  padding: 10px;
  background: #4ade80;
  color: #050505;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #22c55e;
  box-shadow: 0 0 15px rgba(74, 222, 128, 0.3);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel-edit {
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-edit:hover {
  border-color: #555;
  color: white;
}

/* Milestone Grid Section */
.milestone-grid-section {
  margin-top: 24px;
  padding: 20px;
  background: #0a0a0a;
  border-radius: 12px;
  border: 1px solid #222;
}

.milestone-grid-section h4 {
  margin: 0 0 16px 0;
  font-size: 0.95rem;
  color: #aaa;
}

.milestone-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
  max-width: 100%;
}

.milestone-item {
  aspect-ratio: 1;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.milestone-item:hover {
  border-color: #4ade80;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
}

.milestone-item.completed {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2));
  border-color: rgba(74, 222, 128, 0.5);
}

.milestone-item.completed:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.3));
}

.milestone-item.init {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
}

.milestone-item.init:hover {
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
}

.milestone-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: #888;
  font-family: monospace;
}

.milestone-item.completed .milestone-number {
  color: #4ade80;
}

.milestone-item.init .milestone-number {
  color: #050505;
  font-weight: 700;
}

.milestone-check {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 0.6rem;
  color: #4ade80;
}

.milestone-item.init .milestone-check {
  color: #050505;
}

/* Milestone Modal */
.milestone-modal {
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  animation: slideUp 0.3s ease;
  overflow: hidden;
}

.milestone-subtitle {
  margin: 4px 0 0 0;
  color: #888;
  font-size: 0.85rem;
  font-weight: 400;
}

.milestone-subtitle code {
  color: #4ade80;
  font-family: monospace;
  background: #111;
  padding: 2px 6px;
  border-radius: 3px;
}

.milestone-status {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.status-badge.completed {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.3);
}

.milestone-description {
  color: #888;
  font-size: 0.9rem;
  margin: 0 0 20px 0;
  line-height: 1.5;
  text-align: center;
}

.git-commands-section {
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.commands-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #222;
}

.commands-header span {
  color: #aaa;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-copy-command {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-command:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.git-commands {
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 16px;
  margin: 0;
  overflow-x: auto;
}

.git-commands code {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #4ade80;
  white-space: pre;
}

.milestone-info {
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-icon {
  font-size: 1.2rem;
}

.info-text {
  color: #888;
  font-size: 0.85rem;
}

.info-text code {
  color: #4ade80;
  background: #0a0a0a;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.8rem;
}

.milestone-actions {
  display: flex;
  justify-content: center;
}

.btn-close-milestone {
  padding: 12px 32px;
  background: transparent;
  border: 1px solid #333;
  color: #888;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close-milestone:hover {
  border-color: #555;
  color: white;
  background: #111;
}

/* Responsive for milestone grid */
@media (max-width: 768px) {
  .milestone-grid {
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .milestone-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }
}
</style>
