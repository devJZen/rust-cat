<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import HeroOverlay from './components/HeroOverlay.vue';
import PixelDashboard from './components/PixelDashboard.vue';
import CreateProject from './components/CreateProject.vue';
import ProjectDashboard from './components/ProjectDashboard.vue';
import SideNavigation from './components/SideNavigation.vue';
import WalletModal from './components/WalletModal.vue';
import WalletInfo from './components/WalletInfo.vue';
import Blog from './components/Blog.vue';
import Leaderboard from './components/Leaderboard.vue';
import Waitlist from './components/Waitlist.vue';

const router = useRouter();
const route = useRoute();

// --- State ---
const isAppMode = ref(false);       // 화면 모드 (false: Hero, true: App/ZoomOut)
const isWalletConnected = ref(false); // 지갑 연결 여부
const showWalletModal = ref(false);   // 모달 표시 여부
const isNavOpen = ref(false); // 초기에는 접힌 상태
const currentView = ref<'create' | 'dashboard' | 'blog' | 'leaderboard' | 'waitlist'>('dashboard'); // 현재 뷰
const showWalletInfo = ref(false); // 지갑 정보 모달
const dashboardKey = ref(0); // 대시보드 재렌더링용 키
const walletAddress = ref(''); // 연결된 지갑 주소

// --- Event Handlers ---

// 1. Scroll / Wheel Handler
const handleWheel = (e: WheelEvent) => {
  // 지갑이 이미 연결되어 있으면 아무것도 안함
  if (isWalletConnected.value) return;

  // 지갑 모달이 떠있으면 스크롤 무시
  if (showWalletModal.value) return;

  // Case A: Hero 모드 -> 스크롤 다운 -> App 모드 진입
  if (e.deltaY > 0 && !isAppMode.value) {
    isAppMode.value = true;
  }

  // Case B: App 모드에서 지갑 미연결 상태에서만 모달 띄움
  else if (isAppMode.value && !isWalletConnected.value && Math.abs(e.deltaY) > 10) {
    showWalletModal.value = true;
  }
};

// 2. Keyboard Handler
const handleKeydown = (e: KeyboardEvent) => {
  // 지갑이 이미 연결되어 있으면 아무것도 안함
  if (isWalletConnected.value) return;

  // App 모드이고, 지갑 연결 안됐고, 모달이 안 떠있으면 -> 키 입력 시 모달 띄움
  if (isAppMode.value && !isWalletConnected.value && !showWalletModal.value) {
    // ESC 키 등 특정 키 제외 가능
    if (e.key !== 'Escape') {
      showWalletModal.value = true;
    }
  }
};

// 3. Click Interceptor (투명 레이어 클릭 시)
const triggerWalletGate = () => {
  if (isAppMode.value && !isWalletConnected.value) {
    showWalletModal.value = true;
  }
};

// --- Wallet Actions ---
const connectWallet = async () => {
  try {
    // @ts-expect-error - Phantom wallet
    if (!window.solana) {
      alert('Please install Phantom wallet!');
      return;
    }

    // @ts-expect-error - Phantom wallet API
    const resp = await window.solana.connect();
    const publicKey = resp.publicKey.toString();
    console.log('Connected to wallet:', publicKey);

    walletAddress.value = publicKey;
    isWalletConnected.value = true;
    showWalletModal.value = false;
  } catch (err) {
    console.error('Wallet connection failed:', err);
    alert('Failed to connect wallet');
  }
};

// 라우터 변경 감지 및 currentView 업데이트
watch(() => route.path, (newPath) => {
  const viewMap: Record<string, 'create' | 'dashboard' | 'blog' | 'leaderboard' | 'waitlist'> = {
    '/': 'dashboard',
    '/create': 'create',
    '/blog': 'blog',
    '/leaderboard': 'leaderboard',
    '/waitlist': 'waitlist'
  };

  const newView = viewMap[newPath];
  if (newView) {
    currentView.value = newView;
    isAppMode.value = true; // 라우트 접근 시 App 모드 활성화
  }
}, { immediate: true });

// --- Lifecycle ---
onMounted(async () => {
  window.addEventListener('wheel', handleWheel);
  window.addEventListener('keydown', handleKeydown);

  // OAuth 파라미터 확인
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));

  const error = urlParams.get('error') || hashParams.get('error');
  const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
  const accessToken = hashParams.get('access_token');

  // OAuth 에러 처리 (GitHub 인증 거부/실패 등)
  if (error) {
    console.log('OAuth error detected:', error, errorDescription);

    if (error === 'access_denied') {
      console.log('GitHub authentication was cancelled by user');
    }

    // App 모드로 전환 후 웨이팅리스트로 리다이렉트
    isAppMode.value = true;
    router.replace('/waitlist');
    return;
  }

  // OAuth 성공 처리 (access_token이 URL hash에 있는 경우)
  if (accessToken) {
    console.log('OAuth success detected, redirecting to waitlist');

    // App 모드로 전환 후 웨이팅리스트로 즉시 리다이렉트
    isAppMode.value = true;
    router.replace('/waitlist');
    return;
  }

  // 일반적인 페이지 로드: Phantom 지갑 자동 연결 확인 (비동기 처리)
  // @ts-expect-error - Phantom wallet global
  if (window.solana) {
    try {
      // Phantom이 자동으로 연결을 복원할 때까지 대기
      // @ts-expect-error - Phantom wallet API
      const resp = await window.solana.connect({ onlyIfTrusted: true });

      if (resp?.publicKey) {
        const publicKey = resp.publicKey.toString();
        console.log('Wallet auto-connected:', publicKey);
        walletAddress.value = publicKey;
        isWalletConnected.value = true;
        isAppMode.value = true;
      }
    } catch {
      // onlyIfTrusted가 false이면 사용자가 명시적으로 연결해야 함
      console.log('No trusted wallet connection found');
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="main-container">

    <!-- 1. Background App Layer -->
    <div
      class="app-layer"
      :class="{ 'active-mode': isAppMode }"
    >
      <PixelDashboard :isActive="isAppMode" />

      <!-- ★ Interaction Blocker Layer ★ -->
      <!-- 지갑 연결 전에는 이 투명한 막이 대시보드 위를 덮어서 클릭을 가로챔 -->
      <div
        v-if="isAppMode && !isWalletConnected"
        class="interaction-blocker"
        @click.stop="triggerWalletGate"
      ></div>

      <!-- 1. Authenticated View (Wallet Connected) -->
      <!-- 지갑 연결 후 현재 뷰에 따라 표시 -->
      <div v-if="isWalletConnected" class="authenticated-layer">
        <!-- Dashboard, Create Project, Blog, Leaderboard based on currentView -->
        <ProjectDashboard
          v-if="currentView === 'dashboard'"
          :key="dashboardKey"
          @create-project="router.push('/create')"
        />
        <CreateProject
          v-else-if="currentView === 'create'"
          @project-created="router.push('/'); dashboardKey++"
          @show-waitlist="router.push('/waitlist')"
        />
        <Blog v-else-if="currentView === 'blog'" />
        <Leaderboard v-else-if="currentView === 'leaderboard'" />
        <Waitlist v-else-if="currentView === 'waitlist'" />
      </div>
    </div>

    <!-- 2. Hero Layer -->
    <div
      class="hero-layer"
      :class="{ 'zoomed-out': isAppMode }"
    >
      <HeroOverlay @enter="isAppMode = true" />
    </div>

    <!-- 3. Side Navigation -->
    <!-- 지갑 연결 후에만 표시 -->
    <SideNavigation
      class="side-nav-comp"
      :visible="isWalletConnected"
      :isOpen="isNavOpen"
      :walletAddress="walletAddress"
      @toggle="isNavOpen = !isNavOpen"
      @show-dashboard="router.push('/')"
      @show-wallet-info="showWalletInfo = true"
      @show-blog="router.push('/blog')"
      @show-leaderboard="router.push('/leaderboard')"
      @show-waitlist="router.push('/waitlist')"
    />

    <!-- ★ Wallet Modal ★ -->
    <Transition name="fade">
      <WalletModal
        v-if="showWalletModal"
        @connect="connectWallet"
        @close="showWalletModal = false"
      />
    </Transition>

    <!-- ★ Wallet Info Modal ★ -->
    <Transition name="fade">
      <WalletInfo
        v-if="showWalletInfo"
        @close="showWalletInfo = false"
        @disconnect="isWalletConnected = false; isAppMode = false; router.push('/'); showWalletInfo = false; walletAddress = '';"
      />
    </Transition>

  </div>
</template>

<style scoped>
/* 기존 스타일 유지 + 추가 스타일 */

.main-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #050505;
  color: white;
  overflow: hidden; /* 스크롤바 숨김 (휠 이벤트로 제어하므로) */
  font-family: 'Inter', sans-serif;
}

.app-layer {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  transform: scale(1.1);
  filter: blur(8px);
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}

.app-layer.active-mode {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}

/* ★ Interaction Blocker: 투명한 막 ★ */
.interaction-blocker {
  position: absolute;
  inset: 0;
  z-index: 50; /* 대시보드(z-index: auto) 보다 높고, 사이드바/모달보다 낮게 */
  cursor: default; /* 클릭 가능한지 모르게 */
}

.hero-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  background: #050505; /* 뒤가 비치지 않도록 */
}

.hero-layer.zoomed-out {
  opacity: 0;
  transform: scale(0.8) translateY(-50px);
  pointer-events: none;
}

/* SideNav가 Blocker 위에 오면 클릭되어버림.
   지갑 연결 전에는 SideNav도 막고 싶다면 z-index를 40으로 내리거나,
   SideNav 내부에도 클릭 방지 로직을 넣어야 함.
   여기서는 'Back Home' 버튼은 눌러야 하므로 SideNav를 Blocker 위에 둠(z-index 100).
   단, SideNav의 다른 버튼을 누르면 App.vue가 아닌 SideNav 내부에서 처리하거나,
   Blocker가 SideNav 영역까지 덮도록 구조를 바꿔야 함.

   요청하신 '화면 전체' 가로채기를 위해 아래 side-nav-comp 스타일 추가
*/
.side-nav-comp {
  z-index: 60; /* Blocker(50)보다 위 */
}
/* 만약 사이드바 메뉴 클릭시에도 모달을 띄우고 싶다면,
   SideNavigation.vue 내부에서 emit 하기 전 isWalletConnected prop을 체크해야 함.
   하지만 간단하게 구현하기 위해 여기서는 사이드바는 '예외'로 두거나(홈으로 가야하니까),
   App.vue에서 Blocker의 z-index를 SideNav보다 높여버리면 됨.

   -> Blocker z-index: 200 으로 설정하면 'Back Home'도 못 누르게 됨.
   -> 따라서 사용자가 'Back Home'은 할 수 있게 두는 것이 UX상 좋음.
*/

/* Transition Vue Built-in */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 대시보드, 솔라나 지갑 추가 이후 */
.authenticated-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: #050505;
  animation: fadeIn 0.8s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>
