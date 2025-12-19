<script setup lang="ts">
defineEmits(['connect', 'close']);
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>Connect Wallet</h2>
      <p>
        To track milestones and receive bounties,<br>
        you need to verify your identity on-chain.
      </p>

      <button class="btn-connect" @click="$emit('connect')">
        Connect Phantom
        <span class="arrow">→</span>
      </button>

      <button class="btn-close" @click="$emit('close')">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, 0.85); /* Deep Black opacity */
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.modal-card {
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  margin-bottom: 12px;
  margin-top: 0;
  color: white;
}

p {
  color: #9ca3af;
  margin-bottom: 30px;
  line-height: 1.5;
  font-size: 0.95rem;
}

.btn-connect {
  width: 100%;
  background: #4ade80;
  color: #050505;
  border: none;
  padding: 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.btn-connect:hover {
  background: #22c55e;
  box-shadow: 0 0 15px rgba(74, 222, 128, 0.4);
}

.btn-close {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-close:hover { color: white; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
