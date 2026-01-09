<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSupabase } from '../composables/useSupabase';
import { useAnchorProject } from '../composables/useAnchorProject';
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
const githubUserHandle = ref(''); // GitHub username (@handle)
const githubAvatarUrl = ref(''); // GitHub avatar
const paymentTxHash = ref(''); // 결제 트랜잭션 해시
const showGithubModal = ref(false); // GitHub 연동 모달
const isLocalhost = ref(false); // 로컬 환경 여부
const justAuthenticated = ref(false); // OAuth 완료 직후 여부
const githubLoginError = ref(''); // GitHub 로그인 에러

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
  return true;
});

// Work Project 선택 가능 여부
const canSelectWorkProject = computed(() => isGithubConnected.value);

// 지갑 주소 가져오기
onMounted(async () => {
  // 0. 로컬 환경 감지
  isLocalhost.value = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

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
  // 먼저 Auth 상태 변경 리스너를 설정하여 OAuth 콜백을 한 번만 처리
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);

    if (event === 'SIGNED_IN' && session?.user) {
      isGithubConnected.value = true;
      const metadata = session.user.user_metadata;
      githubUserHandle.value = metadata?.user_name || metadata?.preferred_username || '';
      githubUserName.value = metadata?.full_name || metadata?.name || 'User';
      githubUserEmail.value = session.user.email || '';
      githubAvatarUrl.value = metadata?.avatar_url || '';

      console.log('GitHub user signed in:', {
        handle: githubUserHandle.value,
        name: githubUserName.value,
        email: githubUserEmail.value
      });

      // DB에 GitHub 연동 정보 저장
      if (connectedWallet.value) {
        try {
          const { data, error } = await updateGithubConnection(connectedWallet.value, {
            github_connected: true,
            github_handle: githubUserHandle.value,
            github_user_id: session.user.id,
            github_email: githubUserEmail.value,
            github_avatar_url: githubAvatarUrl.value
          });

          if (error) {
            console.error('Failed to save GitHub connection to DB:', error);
          } else {
            console.log('✅ GitHub connection saved to DB:', data);
          }
        } catch (err) {
          console.error('Error saving GitHub connection:', err);
        }
      }
    } else if (event === 'SIGNED_OUT') {
      isGithubConnected.value = false;
      githubUserHandle.value = '';
      githubUserName.value = '';
      githubUserEmail.value = '';
      githubAvatarUrl.value = '';

      // DB에서 GitHub 연동 해제
      if (connectedWallet.value) {
        try {
          await updateGithubConnection(connectedWallet.value, {
            github_connected: false
          });
          console.log('✅ GitHub disconnection saved to DB');
        } catch (err) {
          console.error('Error saving GitHub disconnection:', err);
        }
      }
    }
  });

  // 약간의 지연을 두고 세션 확인 (onAuthStateChange가 OAuth 콜백을 먼저 처리하도록)
  await new Promise(resolve => setTimeout(resolve, 100));

  const { data } = await supabase.auth.getSession();

  if (data.session?.user) {
    // 이미 로그인된 상태라면 바로 'Connected'로 표시
    isGithubConnected.value = true;
    const metadata = data.session.user.user_metadata;
    githubUserHandle.value = metadata?.user_name || metadata?.preferred_username || '';
    githubUserName.value = metadata?.full_name || metadata?.name || 'User';
    githubUserEmail.value = data.session.user.email || '';
    githubAvatarUrl.value = metadata?.avatar_url || '';

    console.log('GitHub user loaded from session:', {
      handle: githubUserHandle.value,
      name: githubUserName.value,
      email: githubUserEmail.value
    });
  } else {
    // 로그인 안 된 상태면 초기화
    isGithubConnected.value = false;
    githubUserHandle.value = '';
    githubUserName.value = '';
    githubUserEmail.value = '';
    githubAvatarUrl.value = '';
  }

  // GitHub 모달 파라미터 확인 (OAuth 리다이렉트 후)
  // 세션 로드 후에 체크해야 사용자 정보가 모달에 표시됨
  const urlParams = new URLSearchParams(window.location.search);

  // OAuth 에러 확인
  const oauthError = urlParams.get('error');
  const oauthErrorDesc = urlParams.get('error_description');

  if (oauthError) {
    // OAuth 에러 발생 시
    console.error('OAuth Error:', oauthError, oauthErrorDesc);
    githubLoginError.value = oauthErrorDesc
      ? decodeURIComponent(oauthErrorDesc.replace(/\+/g, ' '))
      : 'GitHub authentication failed';
    showGithubModal.value = true;

    // URL에서 에러 파라미터 제거
    urlParams.delete('error');
    urlParams.delete('error_description');
    urlParams.delete('error_code');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
  } else if (urlParams.get('github_modal') === 'open') {
    // OAuth 완료 직후임을 표시
    justAuthenticated.value = true;
    showGithubModal.value = true;

    console.log('OAuth callback detected - reopening modal with user info');

    // 3초 후 "방금 인증됨" 플래그 제거
    setTimeout(() => {
      justAuthenticated.value = false;
    }, 3000);

    // URL 정리 (파라미터 제거)
    urlParams.delete('github_modal');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
});

// --- Emits ---
const emit = defineEmits(['project-created', 'show-waitlist']);

// --- Composables ---
const { createProject, loginWithGithub, supabase, updateGithubConnection, getUserProfile } = useSupabase();
const { createProjectOnChain, fundTreasury } = useAnchorProject();

// --- Handlers ---
const addField = (arr: string[]) => arr.push('');
const removeField = (arr: string[], idx: number) => {
  if (arr.length > 1) arr.splice(idx, 1);
};

// 프로젝트 타입 선택 핸들러
const selectProjectType = (typeId: string) => {
  if (loading.value || success.value) return;

  // Work Project 선택 시도
  if (typeId === 'project') {
    if (!isGithubConnected.value) {
      // GitHub 미연동 → 모달 띄우기
      showGithubModal.value = true;
      return;
    }
  }

  // 타입 선택
  projectType.value = typeId;
};

// GitHub 연결 토글 (클릭 한 번으로 연결/해제)
const toggleGithubConnection = async (fromModal = false) => {
  // 에러 초기화
  githubLoginError.value = '';

  if (isGithubConnected.value) {
    // 이미 연결되어 있으면 → 연결 해제
    try {
      await supabase.auth.signOut();
      isGithubConnected.value = false;
      githubUserHandle.value = '';
      githubUserName.value = '';
      githubUserEmail.value = '';
      githubAvatarUrl.value = '';
    } catch (err) {
      console.error('Logout failed:', err);
      githubLoginError.value = 'Failed to disconnect GitHub account';
    }
  } else {
    // GitHub OAuth 로그인 (로컬/프로덕션 모두 동작)
    try {
      await loginWithGithub(fromModal); // 모달에서 호출되면 true 전달
    } catch (err) {
      console.error('GitHub login failed:', err);
      githubLoginError.value = 'GitHub authentication failed. Please contact support if the issue persists.';
    }
  }
};

// 0.1 SOL 결제 함수 (보안 강화)
const pay01SOL = async (projectName: string): Promise<string> => {
  try {
    // 1. 지갑 연결 확인
    // @ts-expect-error - Phantom wallet global
    if (!window.solana || !window.solana.isConnected) {
      throw new Error('Wallet not connected');
    }

    // @ts-expect-error - Phantom wallet API
    const provider = window.solana;
    const fromPubkey = new PublicKey(connectedWallet.value);
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // 2. 잔액 확인 (NEW)
    const balance = await connection.getBalance(fromPubkey);
    const requiredLamports = 0.1 * LAMPORTS_PER_SOL + 5000; // + 예상 수수료

    if (balance < requiredLamports) {
      const balanceSOL = (balance / LAMPORTS_PER_SOL).toFixed(4);
      throw new Error(
        `Insufficient balance: ${balanceSOL} SOL. Need at least 0.1005 SOL. Get devnet SOL from https://faucet.solana.com`
      );
    }

    // 3. Project PDA 주소 derive
    const PROGRAM_ID = new PublicKey('FqyzG8CkTU9Z5twgWr8FmbYmyEbcbM97w3qiV4xnF7YW');
    const [projectPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        Buffer.from(projectName),
        fromPubkey.toBuffer()
      ],
      PROGRAM_ID
    );

    console.log('Derived Project PDA:', projectPda.toBase58());

    // 4. 트랜잭션 생성: User Wallet → Project PDA (Escrow)
    const toPubkey = projectPda;
    const lamports = 0.1 * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports
      })
    );

    // 4. 최근 블록해시 가져오기 (lastValidBlockHeight 추가)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // 5. Phantom으로 서명 및 전송
    const signed = await provider.signAndSendTransaction(transaction);
    const signature = signed.signature;

    if (!signature) {
      throw new Error('Transaction signing failed: no signature returned');
    }

    console.log('Payment transaction sent:', signature);

    // 6. 트랜잭션 확인 대기 (timeout 추가)
    await Promise.race([
      connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction confirmation timeout after 60s')), 60000)
      )
    ]);

    console.log('Payment confirmed:', signature);
    return signature;

  } catch (err) {
    console.error('Payment failed:', err);

    // 7. 향상된 에러 처리
    if (err instanceof Error) {
      if (err.message.includes('User rejected') || err.message.includes('cancelled')) {
        throw new Error('Payment cancelled by user');
      }
      if (err.message.includes('timeout')) {
        throw new Error('Transaction confirmation timeout. Please check Solana Explorer to verify.');
      }
      if (err.message.includes('Insufficient')) {
        throw err; // 잔액 부족 메시지 그대로 전달
      }
      throw new Error(`Payment failed: ${err.message}`);
    }

    throw new Error('Payment failed with unknown error');
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
    // 1️⃣ 프로젝트 PDA 생성 (Anchor instruction 호출)
    console.log('Creating project on-chain...');
    const githubEnabled = isGithubConnected.value && projectType.value === 'project';
    const jiraEnabled = false; // 아직 Jira 통합 없음

    const result = await createProjectOnChain(
      projectName.value,
      validAdmins,
      validMembers,
      githubEnabled,
      jiraEnabled
    );

    const pdaAddress = result.pda;
    paymentTxHash.value = result.txHash;
    console.log('✅ Project PDA created!', pdaAddress);

    // 2️⃣ Treasury에 0.1 SOL 입금 (fund_treasury instruction)
    console.log('Funding treasury with 0.1 SOL...');
    const fundTxHash = await fundTreasury(pdaAddress, 0.1);
    console.log('✅ Treasury funded!', fundTxHash);

    // 3️⃣ Supabase에 프로젝트 저장
    const { data, error: createError } = await createProject({
      name: projectName.value,
      type: projectType.value as 'project' | 'betting' | 'savings' | 'fundraising',
      creator_wallet: connectedWallet.value,
      admins: validAdmins,
      members: validMembers,
      pda: pdaAddress,
      deadline: projectDeadline.value || undefined,
      payment_tx: fundTxHash, // Treasury funding 트랜잭션 해시 저장
      // integrations는 나중에 구현 (현재는 waitlist로 리디렉션)
      balance: 0.1 // 초기 treasury 잔액
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
              :class="[
                'type-card',
                { active: projectType === type.id },
                { 'needs-github': type.id === 'project' && !isGithubConnected }
              ]"
              @click="selectProjectType(type.id)"
              type="button"
              :disabled="loading || success"
            >
              <span class="type-icon">{{ type.icon }}</span>
              <span class="type-label">{{ type.label }}</span>
              <span class="type-description">{{ type.description }}</span>
              <span v-if="type.id === 'project' && !isGithubConnected" class="github-required-badge">
                🔒 Connect GitHub First
              </span>
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

        <!-- 3. Connected Integrations Info (Work Project만) -->
        <div v-if="projectType === 'project' && isGithubConnected" class="integrations-info">
          <label>Connected Integrations</label>
          <div class="integration-card">
            <div class="integration-left">
              <img v-if="githubAvatarUrl" :src="githubAvatarUrl" alt="GitHub Avatar" class="github-avatar-small" />
              <div class="integration-details">
                <span class="integration-name">GitHub</span>
                <span class="integration-user">@{{ githubUserHandle }}</span>
              </div>
            </div>
            <button class="btn-change" @click="showGithubModal = true" :disabled="loading || success">
              Change
            </button>
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
          <button class="btn-deploy" @click="handleCreate" :disabled="!canCreate">
            <span v-if="loading">Creating Project...</span>
            <span v-else-if="success">Project Created ✓</span>
            <span v-else>Create Treasury & Start</span>
          </button>
        </div>
      </div>
    </div>

    <!-- GitHub 연동 모달 -->
    <Transition name="modal-fade">
      <div v-if="showGithubModal" class="modal-overlay" @click.self="showGithubModal = false; githubLoginError = ''">
        <div class="modal-content github-modal">
          <div class="modal-header">
            <h2>Connect GitHub</h2>
            <button class="modal-close" @click="showGithubModal = false; githubLoginError = ''">×</button>
          </div>

          <div class="modal-body">
            <p class="modal-description">
              Work Projects require GitHub integration to track commits, pull requests, and issues automatically.
            </p>

            <!-- GitHub 로그인 에러 카드 -->
            <div v-if="githubLoginError" class="error-alert-card">
              <div class="alert-icon">⚠️</div>
              <div class="alert-content">
                <h3>Authentication Failed</h3>
                <p>{{ githubLoginError }}</p>
                <p class="alert-action">Please contact the administrator if the issue persists.</p>
              </div>
              <button class="alert-close" @click="githubLoginError = ''">×</button>
            </div>

            <!-- 로컬 환경 안내 -->
            <div v-if="isLocalhost && !isGithubConnected" class="local-dev-notice">
              <div class="notice-icon">🔧</div>
              <div class="notice-content">
                <h3>Local Development Mode</h3>
                <p>GitHub OAuth is disabled in local environment to prevent redirect issues.</p>
                <p class="notice-action">Join the waitlist to get notified when authentication is live.</p>
              </div>
            </div>

            <div v-if="!isGithubConnected" class="github-connect-area">
              <div v-if="!isLocalhost" class="github-feature-list">
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Automatic commit tracking</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Pull request milestones</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Issue-based task management</span>
                </div>
              </div>

              <button class="btn-github-login" @click="toggleGithubConnection(true)">
                <span v-if="isLocalhost">📧</span>
                <span v-else class="github-logo">GH</span>
                <span v-if="isLocalhost">Join Waitlist</span>
                <span v-else>Login with GitHub</span>
              </button>
            </div>

            <div v-else class="github-connected-area">
              <!-- 인증 완료 알림 -->
              <div v-if="justAuthenticated" class="auth-success-banner">
                <div class="success-icon">✓</div>
                <div class="success-content">
                  <h3>GitHub Connected Successfully!</h3>
                  <p>You can now create Work Projects</p>
                </div>
              </div>

              <div class="connected-profile">
                <img v-if="githubAvatarUrl" :src="githubAvatarUrl" alt="GitHub Avatar" class="profile-avatar" />
                <div class="profile-info">
                  <span class="profile-handle">@{{ githubUserHandle }}</span>
                  <span class="profile-name">{{ githubUserName }}</span>
                  <span class="profile-email">{{ githubUserEmail }}</span>
                </div>
              </div>

              <div class="modal-actions">
                <button class="btn-modal-secondary" @click="toggleGithubConnection(false)">
                  Disconnect
                </button>
                <button class="btn-modal-primary" @click="showGithubModal = false; projectType = 'project'; githubLoginError = ''">
                  Continue with Work Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
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

.type-card.needs-github {
  opacity: 0.6;
  border-color: #666;
  position: relative;
}

.type-card.needs-github:hover {
  border-color: #888;
  background: rgba(255, 255, 255, 0.02);
}

.github-required-badge {
  font-size: 0.7rem;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
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
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  border-radius: 6px;
}

.toggle-row.connected .icon {
  color: #4ade80;
}

.toggle-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.github-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid #4ade80;
}

.github-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.github-label {
  font-size: 0.9rem;
  color: #ccc;
}

.github-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.github-handle {
  font-size: 0.95rem;
  font-weight: 700;
  color: #4ade80;
  font-family: monospace;
}

.github-name {
  font-size: 0.8rem;
  font-weight: 400;
  color: #aaa;
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

/* Integration Info Styles */
.integrations-info {
  margin-bottom: 32px;
}

.integration-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #111;
  border: 1px solid #4ade80;
  padding: 12px;
  border-radius: 8px;
  gap: 12px;
}

.integration-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.github-avatar-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #4ade80;
  flex-shrink: 0;
}

.integration-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.integration-name {
  font-size: 0.85rem;
  color: #888;
  font-weight: 500;
}

.integration-user {
  font-size: 0.95rem;
  color: #4ade80;
  font-weight: 600;
  font-family: monospace;
}

.btn-change {
  background: transparent;
  border: 1px solid #666;
  color: #888;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-change:hover:not(:disabled) {
  border-color: #4ade80;
  color: #4ade80;
}

.btn-change:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #222;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.modal-close {
  background: transparent;
  border: none;
  color: #888;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #222;
  color: white;
}

.modal-body {
  padding: 24px;
}

.modal-description {
  color: #888;
  line-height: 1.6;
  margin-bottom: 24px;
  font-size: 0.95rem;
}

/* Error Alert Card */
.error-alert-card {
  display: flex;
  gap: 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
  border: 2px solid rgba(239, 68, 68, 0.4);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  position: relative;
  animation: alertSlideIn 0.3s ease;
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-alert-card .alert-icon {
  font-size: 2rem;
  flex-shrink: 0;
  line-height: 1;
}

.error-alert-card .alert-content {
  flex: 1;
}

.error-alert-card .alert-content h3 {
  margin: 0 0 8px 0;
  color: #ef4444;
  font-size: 1rem;
  font-weight: 600;
}

.error-alert-card .alert-content p {
  margin: 0 0 8px 0;
  color: #fca5a5;
  font-size: 0.9rem;
  line-height: 1.5;
}

.error-alert-card .alert-content p:last-child {
  margin-bottom: 0;
}

.error-alert-card .alert-action {
  color: #dc2626 !important;
  font-weight: 500;
  font-size: 0.85rem !important;
  margin-top: 8px !important;
}

.error-alert-card .alert-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  line-height: 1;
}

.error-alert-card .alert-close:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.1);
}

.local-dev-notice {
  display: flex;
  gap: 16px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 146, 60, 0.1));
  border: 1px solid rgba(251, 191, 36, 0.3);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.notice-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.notice-content h3 {
  margin: 0 0 8px 0;
  color: #fbbf24;
  font-size: 1rem;
  font-weight: 600;
}

.notice-content p {
  margin: 0 0 8px 0;
  color: #888;
  font-size: 0.9rem;
  line-height: 1.5;
}

.notice-content p:last-child {
  margin-bottom: 0;
}

.notice-action {
  color: #aaa !important;
  font-weight: 500;
}

.github-connect-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.github-feature-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #111;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #222;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ccc;
  font-size: 0.9rem;
}

.feature-icon {
  color: #4ade80;
  font-weight: bold;
  font-size: 1.1rem;
}

.btn-github-login {
  background: #4ade80;
  color: #050505;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s;
}

.btn-github-login:hover {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

.github-logo {
  font-weight: bold;
  font-family: monospace;
  font-size: 1.2rem;
}

.github-connected-area {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 인증 완료 배너 */
.auth-success-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(34, 197, 94, 0.1));
  border: 2px solid #4ade80;
  padding: 20px;
  border-radius: 12px;
  animation: successSlideIn 0.4s ease;
}

@keyframes successSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-success-banner .success-icon {
  width: 48px;
  height: 48px;
  background: #4ade80;
  color: #050505;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  flex-shrink: 0;
  animation: checkmark 0.6s ease;
}

@keyframes checkmark {
  0% {
    transform: scale(0) rotate(-45deg);
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.auth-success-banner .success-content {
  flex: 1;
}

.auth-success-banner .success-content h3 {
  margin: 0 0 4px 0;
  color: #4ade80;
  font-size: 1.1rem;
  font-weight: 600;
}

.auth-success-banner .success-content p {
  margin: 0;
  color: #aaa;
  font-size: 0.9rem;
}

.connected-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #111;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #4ade80;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #4ade80;
  flex-shrink: 0;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.profile-handle {
  font-size: 1.1rem;
  font-weight: 700;
  color: #4ade80;
  font-family: monospace;
}

.profile-name {
  font-size: 0.95rem;
  color: #ccc;
  font-weight: 500;
}

.profile-email {
  font-size: 0.85rem;
  color: #666;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-modal-primary {
  flex: 1;
  background: #4ade80;
  color: #050505;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal-primary:hover {
  background: #22c55e;
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.3);
}

.btn-modal-secondary {
  background: transparent;
  color: #888;
  border: 1px solid #444;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modal-secondary:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}
</style>
