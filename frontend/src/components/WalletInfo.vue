<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSupabase, type UserProfile } from '../composables/useSupabase';

// --- Props & Emits ---
const emit = defineEmits(['close', 'disconnect']);

// --- Composables ---
const { getUserProfile } = useSupabase();

// --- State ---
const walletAddress = ref('');
const balance = ref(0);
const loading = ref(true);
const userProfile = ref<UserProfile | null>(null);
const loadingProfile = ref(true);

// --- Methods ---
const fetchWalletInfo = async () => {
  loading.value = true;
  loadingProfile.value = true;
  try {
    // @ts-expect-error - Phantom wallet global
    if (window.solana && window.solana.publicKey) {
      // @ts-expect-error - Phantom wallet API
      walletAddress.value = window.solana.publicKey.toString();

      // Fetch balance from Solana
      const { Connection, clusterApiUrl, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

      // @ts-expect-error - Phantom wallet API
      const balanceLamports = await connection.getBalance(window.solana.publicKey);
      balance.value = balanceLamports / LAMPORTS_PER_SOL;

      // Fetch user profile from DB
      const { data, error } = await getUserProfile(walletAddress.value);
      if (!error && data) {
        userProfile.value = data;
        console.log('✅ User profile loaded:', data);
      } else {
        console.log('No user profile found for this wallet');
        userProfile.value = null;
      }
    }
  } catch (err) {
    console.error('Failed to fetch wallet info:', err);
  } finally {
    loading.value = false;
    loadingProfile.value = false;
  }
};

const copyAddress = () => {
  navigator.clipboard.writeText(walletAddress.value);
  alert('Address copied to clipboard!');
};

const formatBalance = (bal: number) => {
  return bal.toFixed(4) + ' SOL';
};

const shortAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

const handleDisconnect = async () => {
  try {
    // @ts-expect-error - Phantom wallet API
    if (window.solana && window.solana.disconnect) {
      // @ts-expect-error - Phantom wallet API
      await window.solana.disconnect();
      console.log('Wallet disconnected successfully');
    }
    emit('disconnect');
    emit('close');
  } catch (err) {
    console.error('Failed to disconnect wallet:', err);
    // 에러가 나도 상태는 초기화
    emit('disconnect');
    emit('close');
  }
};

onMounted(() => {
  fetchWalletInfo();
});
</script>

<template>
  <div class="wallet-info-overlay" @click.self="$emit('close')">
    <div class="wallet-info-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2>Wallet Information</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-content">
        <div class="spinner"></div>
        <p>Loading wallet information...</p>
      </div>

      <!-- Wallet Content -->
      <div v-else class="wallet-content">
        <!-- Address Section -->
        <div class="info-section">
          <div class="section-label">Wallet Address</div>
          <div class="address-display">
            <code class="address-full">{{ walletAddress }}</code>
            <button class="btn-copy" @click="copyAddress">📋 Copy</button>
          </div>
          <div class="address-short">{{ shortAddress(walletAddress) }}</div>
        </div>

        <!-- Balance Section -->
        <div class="info-section balance-section">
          <div class="section-label">Balance</div>
          <div class="balance-display">
            <div class="balance-amount">{{ formatBalance(balance) }}</div>
            <div class="balance-note">on Devnet</div>
          </div>
        </div>

        <!-- Integrations Section -->
        <div class="info-section integrations-section">
          <div class="section-label">Connected Integrations</div>

          <div v-if="loadingProfile" class="integration-loading">
            <div class="small-spinner"></div>
            <span>Loading integrations...</span>
          </div>

          <div v-else-if="!userProfile" class="no-integrations">
            <span class="no-integration-icon">🔗</span>
            <p>No integrations connected yet</p>
          </div>

          <div v-else class="integrations-list">
            <!-- GitHub Integration -->
            <div class="integration-item" :class="{ connected: userProfile.github_connected }">
              <div class="integration-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div class="integration-info">
                <span class="integration-name">GitHub</span>
                <span v-if="userProfile.github_connected" class="integration-handle">
                  @{{ userProfile.github_handle }}
                </span>
                <span v-else class="integration-status-text">Not connected</span>
              </div>
              <div v-if="userProfile.github_connected" class="integration-badge connected-badge">
                ✓ Connected
              </div>
              <div v-else class="integration-badge disconnected-badge">
                Not connected
              </div>
            </div>

            <!-- Jira Integration -->
            <div class="integration-item" :class="{ connected: userProfile.jira_connected }">
              <div class="integration-icon jira-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0Z"/>
                </svg>
              </div>
              <div class="integration-info">
                <span class="integration-name">Jira</span>
                <span v-if="userProfile.jira_connected" class="integration-handle">
                  {{ userProfile.jira_domain }}
                </span>
                <span v-else class="integration-status-text">Not connected</span>
              </div>
              <div v-if="userProfile.jira_connected" class="integration-badge connected-badge">
                ✓ Connected
              </div>
              <div v-else class="integration-badge disconnected-badge">
                Coming Soon
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-buttons">
          <a
            :href="`https://explorer.solana.com/address/${walletAddress}?cluster=devnet`"
            target="_blank"
            class="btn-action btn-explorer"
          >
            🔍 View on Explorer
          </a>
          <button class="btn-action btn-disconnect" @click="handleDisconnect">
            🔌 Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-info-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wallet-info-modal {
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #222;
}

.modal-header h2 {
  font-size: 1.5rem;
  margin: 0;
  color: white;
}

.close-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 2rem;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #111;
  color: white;
}

/* Loading */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
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

.loading-content p {
  color: #666;
  font-size: 0.9rem;
}

/* Content */
.wallet-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section {
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 20px;
}

.section-label {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Address */
.address-display {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.address-full {
  flex: 1;
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85rem;
  color: #4ade80;
  word-break: break-all;
  display: block;
}

.btn-copy {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-copy:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.address-short {
  font-size: 0.8rem;
  color: #666;
  font-family: monospace;
}

/* Balance */
.balance-section {
  background: rgba(74, 222, 128, 0.05);
  border-color: rgba(74, 222, 128, 0.2);
}

.balance-display {
  text-align: center;
}

.balance-amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: #4ade80;
  font-family: monospace;
  margin-bottom: 8px;
}

.balance-note {
  font-size: 0.85rem;
  color: #888;
}

/* Actions */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.btn-action {
  padding: 14px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-explorer {
  background: transparent;
  border: 1px solid #333;
  color: #888;
}

.btn-explorer:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.btn-disconnect {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
}

.btn-disconnect:hover {
  background: #ef4444;
  color: white;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

/* Integrations Section */
.integrations-section {
  background: #111;
  border-color: #333;
}

.integration-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #666;
  font-size: 0.9rem;
}

.small-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #222;
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.no-integrations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  text-align: center;
}

.no-integration-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-integrations p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.integrations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.integration-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 8px;
  transition: all 0.2s;
}

.integration-item.connected {
  border-color: rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.03);
}

.integration-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  border-radius: 8px;
  border: 1px solid #333;
  color: #888;
  flex-shrink: 0;
}

.integration-item.connected .integration-icon {
  border-color: rgba(74, 222, 128, 0.4);
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.integration-icon.jira-icon {
  color: #0052cc;
}

.integration-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.integration-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
}

.integration-handle {
  font-size: 0.85rem;
  color: #4ade80;
  font-family: monospace;
}

.integration-status-text {
  font-size: 0.8rem;
  color: #666;
}

.integration-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.connected-badge {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.disconnected-badge {
  background: rgba(136, 136, 136, 0.1);
  color: #666;
  border: 1px solid #333;
}

/* Responsive */
@media (max-width: 600px) {
  .action-buttons {
    grid-template-columns: 1fr;
  }

  .address-display {
    flex-direction: column;
  }

  .btn-copy {
    width: 100%;
  }

  .integration-item {
    flex-wrap: wrap;
  }

  .integration-badge {
    width: 100%;
    text-align: center;
  }
}
</style>
