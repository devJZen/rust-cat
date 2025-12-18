<script setup lang="ts">
defineEmits(['enter']);
</script>

<template>
  <div class="hero-content">
    <div class="brand-area">
      <div class="green-dot"></div>
      <span class="brand-name">BlockSprint</span>
    </div>

    <h1 class="headline">
      Turn your <span class="highlight">commits</span><br>
      into <span class="highlight">crypto bounties.</span>
    </h1>

    <p class="description">
      Connect GitHub & Jira. Complete milestones.<br>
      Each task fills a pixel on the chain. Visualize your team's velocity.
    </p>

    <div class="integration-icons">
      <span class="pill">Github</span>
      <span class="line"></span>
      <span class="pill">Jira</span>
      <span class="line"></span>
      <span class="pill active">On-Chain</span>
    </div>

    <div class="scroll-cue" @click="$emit('enter')">
      <span>Scroll to Launch App</span>
      <div class="arrow-down">↓</div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;600&display=swap');

.hero-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 20px;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 40px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #9ca3af;
}

.green-dot {
  width: 8px;
  height: 8px;
  background-color: #4ade80; /* Trawelt Green */
  border-radius: 50%;
  box-shadow: 0 0 10px #4ade80;
}

.headline {
  font-family: 'Playfair Display', serif; /* Serif font for elegance */
  font-size: clamp(3rem, 6vw, 5rem);
  line-height: 1.1;
  font-weight: 400;
  margin-bottom: 30px;
  color: #fff;
}

.highlight {
  color: #4ade80; /* Green Accent */
  font-style: italic;
}

.description {
  font-size: 1.1rem;
  color: #d1d5db;
  line-height: 1.6;
  max-width: 600px;
  margin-bottom: 50px;
}

.integration-icons {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 80px;
}

.pill {
  border: 1px solid #333;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #666;
}

.pill.active {
  background: rgba(74, 222, 128, 0.1);
  border-color: #4ade80;
  color: #4ade80;
}

.line {
  width: 20px;
  height: 1px;
  background: #333;
}

.scroll-cue {
  position: absolute;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #666;
  cursor: pointer;
  animation: bounce 2s infinite;
}

.arrow-down {
  font-size: 1.2rem;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-5px);}
  60% {transform: translateY(-3px);}
}
</style>
