<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import HeroOverlay from './components/HeroOverlay.vue';
import PixelDashboard from './components/PixelDashboard.vue';
//import CreateProject from './components/CreateProject.vue';   // 새로 만든 생성용
import SideNavigation from './components/SideNavigation.vue';
import WalletModal from './components/WalletModal.vue'; // Import Modal

// --- State ---
const isAppMode = ref(false);       // 화면 모드 (false: Hero, true: App/ZoomOut)
const isWalletConnected = ref(false); // 지갑 연결 여부
const showWalletModal = ref(false);   // 모달 표시 여부
const isNavOpen = ref(true);

// --- Event Handlers ---

// 1. Scroll / Wheel Handler
const handleWheel = (e: WheelEvent) => {
  // 지갑 모달이 떠있으면 스크롤 무시
  if (showWalletModal.value) return;

  // Case A: Hero 모드 -> 스크롤 다운 -> App 모드 진입
  if (e.deltaY > 0 && !isAppMode.value) {
    isAppMode.value = true;
  }

  // Case B: App 모드에서...
  else if (isAppMode.value) {
    // 지갑 미연결 상태에서 추가 스크롤 시도 -> 모달 띄움
    if (!isWalletConnected.value && Math.abs(e.deltaY) > 10) {
      showWalletModal.value = true;
    }
    // 지갑 연결 상태에서 최상단 스크롤 업 -> Hero 복귀
    else if (isWalletConnected.value && e.deltaY < 0 && window.scrollY === 0) {
      // (선택 사항: 실제 앱 사용성을 위해 제거 가능)
      // isAppMode.value = false;
    }
  }
};

// 2. Keyboard Handler
const handleKeydown = (e: KeyboardEvent) => {
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
const connectWallet = () => {
  // 실제 지갑 연동 로직이 들어갈 곳 (여기선 시뮬레이션)
  setTimeout(() => {
    isWalletConnected.value = true;
    showWalletModal.value = false;
  }, 500);
};

// --- Lifecycle ---
onMounted(() => {
  window.addEventListener('wheel', handleWheel);
  window.addEventListener('keydown', handleKeydown);
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
    </div>

    <!-- 2. Hero Layer -->
    <div
      class="hero-layer"
      :class="{ 'zoomed-out': isAppMode }"
    >
      <HeroOverlay @enter="isAppMode = true" />
    </div>

    <!-- 3. Side Navigation -->
    <!-- 사이드바도 지갑 연결 전에는 클릭 시 모달이 뜨게 하려면 interaction-blocker가 z-index로 덮어야 함 -->
    <!-- 여기서는 UI 구조상 사이드바가 blocker보다 위에 있으면 클릭 가능하므로 z-index 조정 -->
    <SideNavigation
      class="side-nav-comp"
      :visible="isAppMode"
      :isOpen="isNavOpen"
      @toggle="isNavOpen = !isNavOpen"
      @go-home="isAppMode = false"
    />

    <!-- ★ Wallet Modal ★ -->
    <Transition name="fade">
      <WalletModal
        v-if="showWalletModal"
        @connect="connectWallet"
        @close="showWalletModal = false"
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
