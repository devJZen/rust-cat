<script setup lang="ts">
defineProps<{
  visible: boolean,
  isOpen: boolean
}>();
defineEmits(['toggle', 'go-home']);

const menuItems = [
  { icon: '⊞', label: 'Dashboard' },
  { icon: '⚡️', label: 'Milestones' },
  { icon: '◎', label: 'Wallet' },
  { icon: '⚙', label: 'Settings' },
];
</script>

<template>
  <div class="side-nav-wrapper" :class="{ 'visible': visible }">

    <!-- Sidebar Content -->
    <div class="sidebar" :class="{ 'collapsed': !isOpen }">
      <div class="top-section">
        <div class="user-profile">
          <div class="avatar">JM</div>
          <div class="user-info" v-if="isOpen">
            <div class="name">J. Miller</div>
            <div class="role">Developer</div>
          </div>
        </div>
      </div>

      <ul class="nav-list">
        <li v-for="item in menuItems" :key="item.label" class="nav-item">
          <span class="icon">{{ item.icon }}</span>
          <span class="label" v-if="isOpen">{{ item.label }}</span>
        </li>
      </ul>

      <div class="bottom-section">
        <button class="back-home-btn" @click="$emit('go-home')">
          <span v-if="isOpen">Zoom In (Home)</span>
          <span v-else>⌂</span>
        </button>
      </div>
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
}

.side-nav-wrapper.visible {
  transform: translateX(0);
}

.sidebar {
  background: #0a0a0a;
  border-left: 1px solid #222;
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  transition: width 0.4s ease;
}

.sidebar.collapsed {
  width: 70px;
  padding: 24px 10px;
}

/* Profile */
.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
  overflow: hidden;
}
.avatar {
  width: 40px; height: 40px;
  background: #222;
  color: #4ade80;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}
.user-info { white-space: nowrap; }
.name { font-weight: 600; font-size: 0.95rem; }
.role { font-size: 0.8rem; color: #666; }

/* Menu */
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
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
}
.nav-item:hover {
  background: #111;
  color: #4ade80;
}
.icon { font-size: 1.2rem; min-width: 24px; text-align: center; }

/* Bottom */
.back-home-btn {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px solid #333;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.back-home-btn:hover {
  border-color: #4ade80;
  color: #4ade80;
}
</style>
