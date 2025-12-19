<script setup lang="ts">
import { ref, onMounted } from 'vue';

defineProps<{
  visible: boolean,
  isOpen: boolean
}>();
const emit = defineEmits(['toggle', 'show-dashboard', 'show-wallet-info', 'show-blog', 'show-leaderboard']);

// --- State ---
const walletAddress = ref('');
const avatarText = ref('--');

// --- Methods ---
const fetchWalletAddress = async () => {
  try {
    // @ts-expect-error - Phantom wallet global
    if (window.solana && window.solana.publicKey) {
      // @ts-expect-error - Phantom wallet API
      walletAddress.value = window.solana.publicKey.toString();
      // 첫 2자리만 사용 (펌프펀 스타일)
      avatarText.value = walletAddress.value.slice(0, 2).toUpperCase();
    }
  } catch (err) {
    console.error('Failed to get wallet address:', err);
  }
};

const menuItems = [
  { icon: '⊞', label: 'Dashboard', action: 'dashboard' },
  { icon: '⚡️', label: 'Milestones', action: 'milestones' },
  { icon: '🏆', label: 'Leaderboard', action: 'leaderboard' },
  { icon: '◎', label: 'Wallet', action: 'wallet' },
  { icon: '📝', label: 'Blog', action: 'blog' },
  { icon: '⚙', label: 'Settings', action: 'settings' },
];

const handleMenuClick = (action: string) => {
  if (action === 'dashboard') {
    emit('show-dashboard');
  } else if (action === 'wallet') {
    emit('show-wallet-info');
  } else if (action === 'blog') {
    emit('show-blog');
  } else if (action === 'leaderboard') {
    emit('show-leaderboard');
  }
  // TODO: Add handlers for milestones and settings
};

onMounted(() => {
  fetchWalletAddress();
});
</script>

<template>
  <div class="side-nav-wrapper" :class="{ 'visible': visible }">

    <!-- Overlay (펼쳐진 상태에서 바깥쪽 클릭시 닫기) -->
    <div
      v-if="isOpen"
      class="sidebar-overlay"
      @click="emit('toggle')"
    ></div>

    <!-- Sidebar Content -->
    <div
      class="sidebar"
      :class="{ 'collapsed': !isOpen }"
      @click="!isOpen && emit('toggle')"
    >
      <div class="top-section" @click.stop="isOpen ? emit('toggle') : emit('show-wallet-info')">
        <div class="user-profile">
          <div class="avatar" :class="{ 'clickable': !isOpen }">{{ avatarText }}</div>
          <div class="user-info" v-if="isOpen">
            <div class="name">{{ walletAddress.slice(0, 16) }}...</div>
            <div class="role">{{ walletAddress.slice(-8) }}</div>
          </div>
        </div>
      </div>

      <ul class="nav-list">
        <li
          v-for="item in menuItems"
          :key="item.label"
          class="nav-item"
          @click.stop="handleMenuClick(item.action)"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label" v-if="isOpen">{{ item.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.side-nav-wrapper {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 100;
  display: flex;
  transform: translateX(100%);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.side-nav-wrapper.visible {
  transform: translateX(0);
  pointer-events: auto;
}

/* Overlay - 펼쳐진 상태에서만 보임 */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 99;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sidebar {
  background: #0a0a0a;
  border-left: 1px solid #222;
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  transition: all 0.4s ease;
  overflow-x: hidden;
  overflow-y: auto;
  z-index: 100;
  position: relative;
}

.sidebar.collapsed {
  width: 70px;
  padding: 24px 12px;
  cursor: pointer;
  align-items: center;
}

.sidebar.collapsed:hover {
  background: #111;
  border-left-color: #4ade80;
}

/* 펼쳐진 상태에서도 hover 효과 */
.sidebar:not(.collapsed) {
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
}

/* Profile */
.top-section {
  width: 100%;
  cursor: pointer;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
  overflow: hidden;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #222;
  color: #4ade80;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  transition: all 0.2s;
}

.avatar.clickable:hover {
  background: #4ade80;
  color: #050505;
}

.user-info {
  white-space: nowrap;
  overflow: hidden;
  font-family: monospace;
}

.name {
  font-weight: 600;
  font-size: 0.85rem;
  color: #4ade80;
  letter-spacing: 0.02em;
}

.role {
  font-size: 0.75rem;
  color: #888;
  margin-top: 2px;
}

/* Menu */
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  width: 100%;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  color: #888;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  margin-bottom: 4px;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 12px 8px;
}

.nav-item:hover {
  background: #111;
  color: #4ade80;
}

.icon {
  font-size: 1.2rem;
  min-width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Scrollbar for sidebar */
.sidebar::-webkit-scrollbar {
  width: 4px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #222;
  border-radius: 2px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #333;
}
</style>
