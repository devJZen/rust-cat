<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{ isActive: boolean }>();

// 30일짜리 스프린트 또는 30개의 태스크 가정
const totalBlocks = 48; // 8x6 grid
const blocks = ref(Array.from({ length: totalBlocks }, (_, i) => ({
  id: i,
  status: 'locked', // locked | processing | done
  bounty: Math.floor(Math.random() * 50) + 10 + ' USDT',
  delay: Math.random() * 1
})));

// 활성화되면 순차적으로 블록이 켜지는 애니메이션 시뮬레이션
watch(() => props.isActive, (newVal) => {
  if (newVal) {
    blocks.value.forEach((block, idx) => {
      // 랜덤하게 완료된 상태 시뮬레이션
      if (Math.random() > 0.4) {
        setTimeout(() => {
          block.status = 'done';
        }, idx * 50 + 500);
      } else if (Math.random() > 0.7) {
        block.status = 'processing';
      }
    });
  }
});
</script>

<template>
  <div class="dashboard-container">
    <div class="status-bar">
      <div class="sprint-info">
        <h2>Sprint #24: Global Payment Gateway</h2>
        <span class="meta">Deadline: D-4 • Total Bounty: 2,400 USDT</span>
      </div>
      <div class="connection-status">
        <div class="status-item"><div class="dot green"></div>Github: Connected</div>
        <div class="status-item"><div class="dot green"></div>Jira: Connected</div>
      </div>
    </div>

    <!-- 이미지 복원 그리드 -->
    <div class="grid-wrapper">
      <div
        class="pixel-block"
        v-for="block in blocks"
        :key="block.id"
        :class="block.status"
        :style="{ transitionDelay: `${block.delay}s` }"
      >
        <div class="block-content">
          <!-- 완료되면 이미지가 보임 (CSS background) -->
          <span v-if="block.status === 'locked'" class="lock-icon">🔒</span>
          <span v-if="block.status === 'processing'" class="loading-icon">⚡️</span>
          <div v-if="block.status === 'done'" class="bounty-tag">+{{ block.bounty }}</div>
        </div>
      </div>

      <!-- 배경 이미지 (완료된 픽셀 뒤로 투과되어 보임) -->
      <div class="background-image-reveal"></div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  padding: 80px 100px 40px 40px; /* 오른쪽 Nav 공간 확보 */
  display: flex;
  flex-direction: column;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
  border-bottom: 1px solid #333;
  padding-bottom: 20px;
}

.sprint-info h2 {
  font-size: 1.8rem;
  margin: 0 0 8px 0;
  font-weight: 500;
  color: #fff;
}
.meta {
  color: #4ade80;
  font-family: monospace;
}

.connection-status {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
  color: #888;
}
.status-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.dot.green { background: #4ade80; box-shadow: 0 0 5px #4ade80; }

/* Grid System */
.grid-wrapper {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  grid-auto-rows: 120px;
  gap: 4px;
  position: relative;
  overflow-y: auto;
}

/* 실제 픽셀 블록 */
.pixel-block {
  background-color: #111;
  border: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.5s ease;
}

.block-content {
  z-index: 2;
  font-size: 1.2rem;
  color: #444;
}

/* Status Styles */
.pixel-block.processing {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}
.pixel-block.processing .loading-icon {
  color: #4ade80;
  animation: pulse 1s infinite;
}

.pixel-block.done {
  background-color: transparent; /* 투명해져서 뒤의 이미지 보임 */
  border-color: rgba(74, 222, 128, 0.3);
}
.pixel-block.done .bounty-tag {
  font-size: 0.8rem;
  color: #fff;
  background: rgba(0,0,0,0.6);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

/* 배경 이미지 (완료된 픽셀을 통해 보일 이미지) */
/* 팀원들이 올린 사진이나 프로젝트 결과물 */
.background-image-reveal {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  z-index: 0;
  opacity: 0.6;
  filter: grayscale(80%); /* 약간 어둡고 흑백 느낌 */
  pointer-events: none;
}

/* done 상태인 블록이 투명해지면서 뒤의 이미지가 보임 */
.pixel-block:not(.done) {
  background-color: #0a0a0a; /* 가림막 */
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>
