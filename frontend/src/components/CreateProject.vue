<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAnchorProject } from '../composables/useAnchorProject';

// --- State ---
const projectName = ref('');
const connectedWallet = ref(''); // 연결된 지갑 주소
const members = ref<string[]>(['']);
const integrations = ref({
  github: false,
  jira: false
});

// 배경 생성 관련 State
const bgSeed = ref(Date.now());
const generateBackground = () => { bgSeed.value = Date.now(); };

// 지갑 주소 가져오기
onMounted(async () => {
  try {
    // @ts-expect-error - Phantom wallet global
    if (window.solana && window.solana.isConnected) {
      // @ts-expect-error - Phantom wallet API
      const publicKey = window.solana.publicKey;
      if (publicKey) {
        connectedWallet.value = publicKey.toString();
      }
    }
  } catch (err) {
    console.error('Failed to get wallet address:', err);
  }
});

// --- Emits ---
const emit = defineEmits(['project-created']);

// --- Composables ---
const { createProjectOnChain, loading, txHash, error } = useAnchorProject();

// --- Handlers ---
const addField = (arr: string[]) => arr.push('');
const removeField = (arr: string[], idx: number) => {
  if (arr.length > 1) arr.splice(idx, 1);
};

const handleCreate = async () => {
  if (!projectName.value) return alert("Please enter a project name");
  if (!connectedWallet.value) return alert("Please connect your wallet first");

  // Admin은 현재 연결된 지갑
  const validAdmins = [connectedWallet.value];
  // 유효한 멤버만 필터링
  const validMembers = members.value.filter(m => m.length > 30);

  try {
    // 온체인 호출
    await createProjectOnChain(projectName.value, validAdmins, validMembers);

    // 성공 후 3초 뒤 대시보드로 이동
    if (txHash.value) {
      setTimeout(() => {
        emit('project-created');
      }, 3000);
    }
  } catch (err) {
    console.error('Failed to create project:', err);
  }
};
</script>

<template>
  <div class="create-dashboard">
    <div class="dashboard-header">
      <h1>Initialize Project</h1>
      <p>Configure your workspace and deploy your on-chain treasury.</p>
    </div>

    <div class="content-grid">
      <!-- Left Column: Form -->
      <div class="form-section">

        <!-- 1. Basic Info -->
        <div class="input-group">
          <label>Project Name</label>
          <input
            v-model="projectName"
            type="text"
            placeholder="e.g. Protocol V2 Launch"
            class="input-field"
          />
        </div>

        <!-- 2. Role Management -->
        <div class="role-group">
          <div class="role-header">
            <label>Project Admin (Your Wallet)</label>
          </div>
          <div class="input-row">
            <input
              :value="connectedWallet || 'Connecting...'"
              type="text"
              readonly
              class="input-field input-readonly"
              placeholder="Your connected wallet address"
            />
          </div>
        </div>

        <div class="role-group">
          <div class="role-header">
            <label>Team Members (Wallet Address)</label>
            <button class="btn-mini" @click="addField(members)">+</button>
          </div>
          <div class="dynamic-inputs">
            <div v-for="(member, idx) in members" :key="'member-'+idx" class="input-row">
              <input v-model="members[idx]" type="text" placeholder="Solana Address..." class="input-field" />
              <button v-if="members.length > 1" @click="removeField(members, idx)" class="btn-remove">×</button>
            </div>
          </div>
        </div>

        <!-- 3. Integrations -->
        <div class="integrations-group">
          <label>Data Source Integration</label>
          <div class="toggle-row" :class="{ active: integrations.github }" @click="integrations.github = !integrations.github">
            <span class="icon">GH</span>
            <span>GitHub Repository</span>
            <div class="toggle-switch"></div>
          </div>
          <div class="toggle-row" :class="{ active: integrations.jira }" @click="integrations.jira = !integrations.jira">
            <span class="icon">JR</span>
            <span>Jira Board</span>
            <div class="toggle-switch"></div>
          </div>
        </div>
      </div>

      <!-- Right Column: Visual & Action -->
      <div class="visual-section">
        <label>Project Identity (Pixel DNA)</label>
        <p class="sub-label">This generated pattern will serve as your project's NFT background.</p>

        <div class="pixel-canvas" @click="generateBackground">
          <!-- Random Grid Generator based on seed -->
          <div
            v-for="i in 100"
            :key="i"
            class="pixel-dot"
            :style="{
              opacity: Math.random() > 0.6 ? 1 : 0.2,
              backgroundColor: Math.random() > 0.9 ? '#4ade80' : '#1f2937',
              animationDelay: `${Math.random()}s`
            }"
          ></div>
        </div>
        <button class="btn-regen" @click="generateBackground">Randomize DNA ⟳</button>

        <div class="action-area">
          <div v-if="txHash" class="success-msg">
            <span class="check">✔</span> Project Initialized!<br>
            <a :href="`https://explorer.solana.com/tx/${txHash}?cluster=devnet`" target="_blank" class="tx-link">View Transaction</a>
          </div>

          <div v-else-if="error" class="error-msg">
            {{ error }}
          </div>

          <button class="btn-deploy" @click="handleCreate" :disabled="loading">
            <span v-if="loading">Processing On-Chain...</span>
            <span v-else>Mint Project Wallet & Start</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-dashboard {
  width: 100%;
  height: 100%;
  background: #050505;
  color: white;
  padding: 40px;
  padding-right: 280px; /* SideNavigation 240px + 여유 40px */
  overflow-y: auto;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
}

.dashboard-header {
  margin-bottom: 40px;
  border-bottom: 1px solid #222;
  padding-bottom: 20px;
}
.dashboard-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  margin-bottom: 8px;
  color: white;
}
.dashboard-header p { color: #888; }

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 반응형: 중간 화면 */
@media (max-width: 1400px) {
  .content-grid {
    gap: 30px;
  }

  .create-dashboard {
    padding: 30px;
    padding-right: 260px; /* 240px + 20px */
  }
}

/* 반응형: 작은 화면 (태블릿) */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .create-dashboard {
    padding: 30px;
    padding-right: 110px; /* Collapsed 70px + 40px */
  }

  .dashboard-header h1 {
    font-size: 2rem;
  }
}

/* 반응형: 모바일 */
@media (max-width: 768px) {
  .create-dashboard {
    padding: 20px;
    padding-right: 90px; /* Collapsed 70px + 20px */
  }

  .dashboard-header h1 {
    font-size: 1.8rem;
  }

  .content-grid {
    gap: 20px;
  }
}

/* Form Styles */
label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 0.9rem; color: #ccc; }
.sub-label { font-size: 0.8rem; color: #666; margin-bottom: 12px; }

.input-group, .role-group, .integrations-group { margin-bottom: 32px; }

.input-field {
  width: 100%;
  background: #111;
  border: 1px solid #333;
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: monospace;
  transition: border-color 0.2s;
  font-size: 0.9rem;
  box-sizing: border-box;
  min-width: 0; /* flexbox overflow 방지 */
}
.input-field:focus { outline: none; border-color: #4ade80; }

/* Readonly 입력 필드 (초록색 스타일) */
.input-field.input-readonly {
  background: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
  color: #4ade80;
  cursor: not-allowed;
  font-weight: 500;
}
.input-field.input-readonly:focus {
  border-color: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.1);
}

.role-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.btn-mini { background: #222; border: none; color: #4ade80; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
.btn-mini:hover { background: #333; }

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  min-width: 0; /* flexbox overflow 방지 */
}
.btn-remove {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

/* Toggle Styles */
.toggle-row {
  display: flex; align-items: center; gap: 12px;
  background: #111; border: 1px solid #333; padding: 12px;
  border-radius: 6px; cursor: pointer; margin-bottom: 8px; transition: all 0.2s;
}
.toggle-row.active { border-color: #4ade80; background: rgba(74, 222, 128, 0.05); }
.toggle-row .icon { font-weight: bold; font-family: monospace; color: #888; }
.toggle-row.active .icon { color: #4ade80; }
.toggle-switch {
  margin-left: auto; width: 36px; height: 20px; background: #333; border-radius: 10px; position: relative;
}
.toggle-row.active .toggle-switch { background: #4ade80; }
.toggle-switch::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: left 0.2s;
}
.toggle-row.active .toggle-switch::after { left: 18px; }

/* Visual Section */
.visual-section {
  min-width: 0; /* flexbox overflow 방지 */
}

.pixel-canvas {
  width: 100%;
  height: 200px;
  background: #111;
  border: 1px solid #333;
  border-radius: 8px;
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(10, 1fr);
  overflow: hidden;
  margin-bottom: 12px;
  cursor: crosshair;
}

@media (max-width: 768px) {
  .pixel-canvas {
    height: 150px;
    grid-template-columns: repeat(15, 1fr);
    grid-template-rows: repeat(8, 1fr);
  }
}
.pixel-dot { width: 100%; height: 100%; transition: background-color 0.3s; }
.pixel-dot:hover { background-color: #4ade80 !important; opacity: 1 !important; }

.btn-regen {
  background: transparent; border: 1px solid #444; color: #888; padding: 8px 16px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-bottom: 40px;
}
.btn-regen:hover { color: white; border-color: white; }

.action-area { text-align: right; }
.btn-deploy {
  background: #4ade80; color: #050505; border: none; padding: 16px 32px; font-weight: 600; font-size: 1rem; border-radius: 8px; cursor: pointer; width: 100%;
  transition: all 0.2s;
}
.btn-deploy:hover:not(:disabled) { background: #22c55e; box-shadow: 0 0 20px rgba(74, 222, 128, 0.3); }
.btn-deploy:disabled { opacity: 0.5; cursor: not-allowed; }

.success-msg { color: #4ade80; margin-bottom: 16px; text-align: center; border: 1px solid #4ade80; padding: 12px; border-radius: 6px; }
.error-msg { color: #ef4444; margin-bottom: 16px; font-size: 0.9rem; }
.tx-link { color: #4ade80; text-decoration: underline; font-size: 0.9rem; }
</style>
