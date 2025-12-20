<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSupabase } from '../composables/useSupabase';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// --- State ---
const projectType = ref('project'); // project, betting, savings, fundraising
const projectName = ref('');
const projectDeadline = ref(''); // 마감기한
const connectedWallet = ref(''); // 연결된 지갑 주소
const members = ref<string[]>(['']);
const loading = ref(false);
const error = ref('');
const success = ref(false);
const isGithubConnected = ref(false);
const githubUserName = ref('');
const githubUserEmail = ref('');
const paymentTxHash = ref(''); // 결제 트랜잭션 해시

// 프로젝트 타입 옵션
const projectTypes = [
  {
    id: 'project',
    icon: '💼',
    label: 'Work Project',
    description: 'Manage team projects with milestones and bounties',
    placeholder: 'e.g. Protocol V2 Launch'
  },
  {
    id: 'betting',
    icon: '🎲',
    label: 'Betting Pool',
    description: 'Friendly bets with friends (lunch, sports, predictions)',
    placeholder: 'e.g. World Cup Finals Bet'
  },
  {
    id: 'savings',
    icon: '🏦',
    label: 'Group Savings',
    description: 'Savings club, rotating credit, team funds',
    placeholder: 'e.g. Team Dinner Fund'
  },
  {
    id: 'fundraising',
    icon: '💝',
    label: 'Fundraising',
    description: 'Charity, gifts, community projects',
    placeholder: 'e.g. Community Library Fund'
  }
];

// 배경 생성 관련 State
const bgSeed = ref(Date.now());
const generateBackground = () => { bgSeed.value = Date.now(); };

// Computed
const selectedType = computed(() => projectTypes.find(t => t.id === projectType.value));
const namePlaceholder = computed(() => selectedType.value?.placeholder || 'Enter name...');

// Work Project 타입인 경우 GitHub 연동 필수
const isGithubRequired = computed(() => projectType.value === 'project');
const canCreate = computed(() => {
  if (loading.value || success.value) return false;
  if (isGithubRequired.value && !isGithubConnected.value) return false;
  return true;
});

// 지갑 주소 가져오기
onMounted(async () => {
  // 1. Phantom 지갑 연결 확인
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

  // 2. [수정됨] Supabase 세션 확인 (이미 로그인된 경우 자동 연동)
  const { data } = await supabase.auth.getSession();

  if (data.session?.user) {
    // 이미 로그인된 상태라면 바로 'Connected'로 표시
    isGithubConnected.value = true;
    githubUserName.value = data.session.user.user_metadata?.full_name ||
                          data.session.user.user_metadata?.name || 'User';
    githubUserEmail.value = data.session.user.email || '';
  } else {
    // 로그인 안 된 상태면 초기화
    isGithubConnected.value = false;
    githubUserName.value = '';
    githubUserEmail.value = '';
  }

  // 3. Auth 상태 변경 리스너 (로그인/로그아웃 실시간 감지)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      isGithubConnected.value = true;
      githubUserName.value = session.user.user_metadata?.full_name ||
                            session.user.user_metadata?.name || 'User';
      githubUserEmail.value = session.user.email || '';
    } else if (event === 'SIGNED_OUT') {
      isGithubConnected.value = false;
      githubUserName.value = '';
      githubUserEmail.value = '';
    }
  });
});

// --- Emits ---
const emit = defineEmits(['project-created', 'show-waitlist']);

// --- Composables ---
const { createProject, loginWithGithub, supabase } = useSupabase();

// --- Handlers ---
const addField = (arr: string[]) => arr.push('');
const removeField = (arr: string[], idx: number) => {
  if (arr.length > 1) arr.splice(idx, 1);
};

// GitHub 연결 토글 (클릭 한 번으로 연결/해제)
const toggleGithubConnection = async () => {
  if (isGithubConnected.value) {
    // 이미 연결되어 있으면 → 연결 해제
    try {
      await supabase.auth.signOut();
      isGithubConnected.value = false;
      githubUserName.value = '';
      githubUserEmail.value = '';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  } else {
    // 연결되어 있지 않으면 → GitHub OAuth 로그인
    try {
      await loginWithGithub();
    } catch (err) {
      console.error('GitHub login failed:', err);
      error.value = 'Failed to login with GitHub';
    }
  }
};

// 0.1 SOL 결제 함수
const pay01SOL = async (): Promise<string> => {
  try {
    // @ts-expect-error - Phantom wallet global
    if (!window.solana || !window.solana.isConnected) {
      throw new Error('Wallet not connected');
    }

    // @ts-expect-error - Phantom wallet API
    const provider = window.solana;
    const fromPubkey = new PublicKey(connectedWallet.value);

    // 임시 수신 주소 (나중에 프로젝트 treasury 주소로 변경)
    // 현재는 creator 본인 지갑으로 전송 (테스트용)
    const toPubkey = fromPubkey;

    // Solana devnet 연결
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // 0.1 SOL = 100,000,000 lamports
    const lamports = 0.1 * LAMPORTS_PER_SOL;

    // 트랜잭션 생성
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports
      })
    );

    // 최근 블록해시 가져오기
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // Phantom으로 서명 및 전송
    const signed = await provider.signAndSendTransaction(transaction);
    console.log('Payment transaction:', signed.signature);

    // 트랜잭션 확인 대기
    await connection.confirmTransaction(signed.signature);

    return signed.signature;
  } catch (err) {
    console.error('Payment failed:', err);
    throw new Error(err instanceof Error ? err.message : 'Payment failed');
  }
};

// PDA 생성 함수 (임시 - 나중에 온체인으로 대체)
const generatePDA = () => {
  // 임시로 랜덤한 Solana 주소 형식 생성
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const handleCreate = async () => {
  if (!projectName.value) return alert("Please enter a project name");
  if (!connectedWallet.value) return alert("Please connect your wallet first");

  // Work Project 타입인 경우 GitHub 연동 필수
  if (projectType.value === 'project' && !isGithubConnected.value) {
    return alert("Please connect your GitHub account to create a Work Project");
  }

  loading.value = true;
  error.value = '';
  success.value = false;

  // Admin은 현재 연결된 지갑
  const validAdmins = [connectedWallet.value];
  // 유효한 멤버만 필터링
  const validMembers = members.value.filter(m => m.length > 30);

  try {
    // 1️⃣ 먼저 0.1 SOL 결제
    console.log('Processing 0.1 SOL payment...');
    const txHash = await pay01SOL();
    paymentTxHash.value = txHash;
    console.log('Payment successful! Transaction:', txHash);

    // 2️⃣ PDA 지갑 주소 생성
    const pdaAddress = generatePDA();
    console.log('Generated PDA address:', pdaAddress);

    // 3️⃣ Supabase에 프로젝트 저장
    const { data, error: createError } = await createProject({
      name: projectName.value,
      type: projectType.value as 'project' | 'betting' | 'savings' | 'fundraising',
      creator_wallet: connectedWallet.value,
      admins: validAdmins,
      members: validMembers,
      pda: pdaAddress,
      deadline: projectDeadline.value || undefined,
      payment_tx: txHash, // 결제 트랜잭션 해시 저장
      // integrations는 나중에 구현 (현재는 waitlist로 리디렉션)
      balance: 0
    });

    if (createError) {
      throw createError;
    }

    console.log('Project created successfully:', data);
    console.log('PDA Wallet:', pdaAddress);
    console.log('Payment Transaction:', paymentTxHash.value);
    success.value = true;

    // 성공 후 2초 뒤 대시보드로 자동 이동
    setTimeout(() => {
      emit('project-created');
    }, 2000);

  } catch (err) {
    console.error('Failed to create project:', err);
    error.value = err instanceof Error ? err.message : 'Failed to create project';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="create-dashboard">
    <div class="dashboard-header">
      <h1>Create Treasury</h1>
      <p>Choose your purpose and deploy an on-chain wallet.</p>
    </div>

    <div class="content-grid">
      <!-- Left Column: Form -->
      <div class="form-section">

        <!-- 0. Type Selection -->
        <div class="input-group type-selection">
          <label>What are you creating?</label>
          <div class="type-grid">
            <button
              v-for="type in projectTypes"
              :key="type.id"
              :class="['type-card', { active: projectType === type.id }]"
              @click="projectType = type.id"
              type="button"
              :disabled="loading || success"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <span class="type-label">{{ type.label }}</span>
              <span class="type-description">{{ type.description }}</span>
            </button>
          </div>
        </div>

        <!-- 1. Basic Info -->
        <div class="input-group">
          <label>{{ selectedType?.label }} Name</label>
          <input
            v-model="projectName"
            type="text"
            :placeholder="namePlaceholder"
            class="input-field"
            :disabled="loading || success"
          />
        </div>

        <!-- 2. Deadline -->
        <div class="input-group">
          <label>Deadline (Optional)</label>
          <input
            v-model="projectDeadline"
            type="date"
            class="input-field date-input"
            :disabled="loading || success"
            :min="new Date().toISOString().split('T')[0]"
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
            <label>{{ projectType === 'betting' ? 'Participants' : projectType === 'savings' ? 'Members' : 'Team Members' }} (Wallet Address)</label>
            <button class="btn-mini" @click="addField(members)" :disabled="loading || success">+</button>
          </div>
          <div class="dynamic-inputs">
            <div v-for="(_, idx) in members" :key="'member-'+idx" class="input-row">
              <input v-model="members[idx]" type="text" placeholder="Solana Address..." class="input-field" :disabled="loading || success" />
              <button v-if="members.length > 1" @click="removeField(members, idx)" class="btn-remove" :disabled="loading || success">×</button>
            </div>
          </div>
        </div>

        <!-- 3. Integrations (Work Project만) -->
        <div v-if="projectType === 'project'" class="integrations-group">
          <label>Data Source Integration</label>
          <p class="integration-subtitle">Connect your GitHub to track commits and issues automatically</p>

          <!-- GitHub Integration -->
          <div
            class="toggle-row clickable-toggle"
            :class="{ disabled: loading || success, connected: isGithubConnected }"
            @click="!(loading || success) && toggleGithubConnection()"
          >
            <span class="icon">GH</span>
            <span v-if="!isGithubConnected">GitHub Repository</span>
            <div v-else class="github-user-info">
              <span class="github-name">{{ githubUserName }}</span>
              <span class="github-email">{{ githubUserEmail }}</span>
            </div>
            <span v-if="!isGithubConnected" class="btn-connect-label">
              Login with GitHub ↗
            </span>
            <span v-else class="btn-disconnect-label">
              Connected ✓
            </span>
          </div>

          <!-- Jira Integration (Coming Soon) -->
          <div
            class="toggle-row clickable"
            :class="{ disabled: loading || success }"
            @click="!(loading || success) && emit('show-waitlist')"
          >
            <span class="icon">JR</span>
            <span>Jira Board</span>
            <span class="coming-soon">Coming Soon</span>
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
          <div v-if="success" class="success-msg">
            <span class="check">✔</span> Project Created Successfully!<br>
            <span v-if="paymentTxHash" class="payment-info">
              Payment: 0.1 SOL<br>
              <a
                :href="`https://explorer.solana.com/tx/${paymentTxHash}?cluster=devnet`"
                target="_blank"
                class="tx-link"
              >
                View Transaction ↗
              </a>
            </span>
            <span class="redirect-msg">Redirecting to dashboard...</span>
          </div>

          <div v-else-if="error" class="error-msg">
            {{ error }}
          </div>

          <!-- GitHub 연동 필요 경고 -->
          <div v-if="isGithubRequired && !isGithubConnected && !loading && !success" class="warning-msg">
            ⚠️ GitHub connection required for Work Projects
          </div>

          <button class="btn-deploy" @click="handleCreate" :disabled="!canCreate">
            <span v-if="loading">Creating Project...</span>
            <span v-else-if="success">Project Created ✓</span>
            <span v-else-if="isGithubRequired && !isGithubConnected">Login with GitHub Required ↑</span>
            <span v-else>Create Treasury & Start</span>
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

/* Type Selection */
.type-selection {
  margin-bottom: 40px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.type-card {
  background: #111;
  border: 2px solid #333;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-card:hover {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.type-card.active {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.type-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.type-icon {
  font-size: 2rem;
  display: block;
}

.type-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: white;
  display: block;
}

.type-description {
  font-size: 0.75rem;
  color: #888;
  line-height: 1.4;
  display: block;
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
.input-field:disabled { opacity: 0.5; cursor: not-allowed; }

/* Date Input 스타일 */
.date-input {
  color-scheme: dark;
  position: relative;
  color: white !important;
  font-weight: 500;
}

.date-input::-webkit-datetime-edit {
  color: white;
  padding: 0;
}

.date-input::-webkit-datetime-edit-fields-wrapper {
  color: white;
}

.date-input::-webkit-datetime-edit-text {
  color: #666;
  padding: 0 4px;
}

.date-input::-webkit-datetime-edit-month-field,
.date-input::-webkit-datetime-edit-day-field,
.date-input::-webkit-datetime-edit-year-field {
  color: white;
  background: transparent;
  padding: 2px;
}

.date-input::-webkit-datetime-edit-month-field:focus,
.date-input::-webkit-datetime-edit-day-field:focus,
.date-input::-webkit-datetime-edit-year-field:focus {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  outline: none;
}

.date-input::-webkit-calendar-picker-indicator {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%234ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
  background-size: 20px;
  background-repeat: no-repeat;
  background-position: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  opacity: 0.8;
  transition: all 0.2s;
  filter: none;
}

.date-input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
  transform: scale(1.1);
}

.date-input:focus {
  border-color: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.1);
}

/* Firefox */
.date-input::-moz-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}

/* 날짜가 선택되지 않았을 때 */
.date-input:not(:focus):invalid {
  color: #666;
}

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
.btn-mini:disabled { opacity: 0.5; cursor: not-allowed; }

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
.btn-remove:disabled { opacity: 0.5; cursor: not-allowed; }

/* Integrations */
.integration-subtitle {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 16px;
  line-height: 1.5;
}

/* Toggle Styles */
.toggle-row {
  display: flex; align-items: center; gap: 12px;
  background: #111; border: 1px solid #333; padding: 12px;
  border-radius: 6px; margin-bottom: 8px; transition: all 0.2s;
}

.toggle-row.clickable {
  cursor: pointer;
}

.toggle-row.clickable-toggle {
  cursor: pointer;
}

.toggle-row.clickable:hover:not(.disabled) {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.toggle-row.clickable-toggle:hover:not(.disabled) {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.toggle-row.connected {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.toggle-row .icon {
  font-weight: bold;
  font-family: monospace;
  color: #888;
  flex-shrink: 0;
}

.toggle-row.connected .icon {
  color: #4ade80;
}

.github-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.github-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
}

.github-email {
  font-size: 0.75rem;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-connect-label {
  margin-left: auto;
  background: #4ade80;
  color: #050505;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.2s;
}

.toggle-row.clickable-toggle:hover:not(.disabled) .btn-connect-label {
  background: #22c55e;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
}

.btn-disconnect-label {
  margin-left: auto;
  background: transparent;
  color: #4ade80;
  border: 1px solid #4ade80;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  flex-shrink: 0;
  transition: all 0.2s;
}

.toggle-row.clickable-toggle:hover:not(.disabled) .btn-disconnect-label {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.coming-soon {
  margin-left: auto;
  font-size: 0.75rem;
  color: #666;
  background: #1a1a1a;
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid #333;
  font-weight: 500;
}

.toggle-row.clickable:hover:not(.disabled) .coming-soon {
  color: #4ade80;
  border-color: #4ade80;
}

.toggle-row.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

  .type-grid {
    grid-template-columns: 1fr;
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

.success-msg { color: #4ade80; margin-bottom: 16px; text-align: center; border: 1px solid #4ade80; padding: 12px; border-radius: 6px; line-height: 1.8; }
.payment-info { display: block; font-size: 0.85rem; color: #888; margin-top: 8px; margin-bottom: 8px; }
.tx-link { color: #4ade80; text-decoration: none; font-weight: 600; transition: all 0.2s; }
.tx-link:hover { color: #22c55e; text-decoration: underline; }
.redirect-msg { font-size: 0.85rem; color: #888; margin-top: 8px; display: inline-block; }
.error-msg { color: #ef4444; margin-bottom: 16px; font-size: 0.9rem; text-align: center; border: 1px solid #ef4444; padding: 12px; border-radius: 6px; }
.warning-msg { color: #fbbf24; margin-bottom: 16px; font-size: 0.9rem; text-align: center; border: 1px solid #fbbf24; padding: 12px; border-radius: 6px; background: rgba(251, 191, 36, 0.05); }
</style>
