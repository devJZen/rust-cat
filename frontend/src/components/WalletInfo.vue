<script setup lang="ts">
import { ref, onMounted } from 'vue';

// --- Props & Emits ---
const emit = defineEmits(['close', 'disconnect']);

// --- State ---
const walletAddress = ref('');
const balance = ref(0);
const loading = ref(true);

// --- Methods ---
const fetchWalletInfo = async () => {
  loading.value = true;
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
    }
  } catch (err) {
    console.error('Failed to fetch wallet info:', err);
  } finally {
    loading.value = false;
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
}
</style>
