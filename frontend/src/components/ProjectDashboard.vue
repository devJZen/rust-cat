<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ProjectDetails from './ProjectDetails.vue';

interface Project {
  id: string;
  name: string;
  pda: string; // Project wallet address
  balance: number; // SOL balance
  tasksCompleted: number;
  totalTasks: number;
  createdAt: number;
}

// --- State ---
const projects = ref<Project[]>([]);
const loading = ref(true);
const selectedProject = ref<Project | null>(null);
const showDetailsModal = ref(false);

// --- Emits ---
const emit = defineEmits(['create-project']);

// --- Methods ---
const viewProjectDetails = (project: Project) => {
  selectedProject.value = project;
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedProject.value = null;
};

// --- Methods ---
const fetchProjects = async () => {
  loading.value = true;
  try {
    // TODO: 실제로는 Solana에서 프로젝트 목록을 가져와야 함
    // 지금은 더미 데이터
    await new Promise(resolve => setTimeout(resolve, 500));

    projects.value = [
      {
        id: '1',
        name: 'Protocol V2 Launch',
        pda: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
        balance: 2.45,
        tasksCompleted: 42,
        totalTasks: 100,
        createdAt: Date.now() - 86400000 * 7
      }
    ];
  } catch (err) {
    console.error('Failed to fetch projects:', err);
  } finally {
    loading.value = false;
  }
};

const formatBalance = (balance: number) => {
  return balance.toFixed(2) + ' SOL';
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getProgressPercent = (completed: number, total: number) => {
  return Math.round((completed / total) * 100);
};

onMounted(() => {
  fetchProjects();
});
</script>

<template>
  <div class="project-dashboard">
    <div class="dashboard-header">
      <h1>Your Projects</h1>
      <p>Manage your on-chain project treasuries and milestones</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading projects...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h2>No Projects Yet</h2>
      <p>Create your first project to start tracking milestones and managing crypto bounties</p>
      <button class="btn-create" @click="emit('create-project')">
        <span class="plus-icon">+</span>
        Create Your First Project
      </button>
    </div>

    <!-- Projects Grid -->
    <div v-else class="projects-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
      >
        <!-- Card Header -->
        <div class="card-header">
          <h3>{{ project.name }}</h3>
          <span class="project-id">{{ project.pda.slice(0, 8) }}...</span>
        </div>

        <!-- Balance -->
        <div class="balance-section">
          <div class="balance-label">Treasury Balance</div>
          <div class="balance-amount">{{ formatBalance(project.balance) }}</div>
        </div>

        <!-- Progress -->
        <div class="progress-section">
          <div class="progress-header">
            <span>Progress</span>
            <span class="progress-text">{{ project.tasksCompleted }}/{{ project.totalTasks }} tasks</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getProgressPercent(project.tasksCompleted, project.totalTasks) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <span class="created-date">Created {{ formatDate(project.createdAt) }}</span>
          <button class="btn-view" @click="viewProjectDetails(project)">View Details →</button>
        </div>
      </div>

      <!-- Create New Card -->
      <div class="project-card create-card" @click="emit('create-project')">
        <div class="create-content">
          <div class="plus-icon-large">+</div>
          <h3>New Project</h3>
          <p>Create a new project treasury</p>
        </div>
      </div>
    </div>

    <!-- Project Details Modal -->
    <Transition name="fade">
      <ProjectDetails
        v-if="showDetailsModal && selectedProject"
        :project="selectedProject"
        @close="closeDetailsModal"
      />
    </Transition>
  </div>
</template>

<style scoped>
.project-dashboard {
  width: 100%;
  height: 100%;
  background: #050505;
  color: white;
  padding: 40px;
  padding-right: 280px;
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

.dashboard-header p {
  color: #888;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #222;
  border-top-color: #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  font-size: 0.9rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 1.8rem;
  margin-bottom: 12px;
  color: white;
}

.empty-state p {
  color: #888;
  max-width: 400px;
  margin-bottom: 32px;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #4ade80;
  color: #050505;
  border: none;
  padding: 16px 32px;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create:hover {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

.plus-icon {
  font-size: 1.5rem;
  font-weight: bold;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1400px;
}

.project-card {
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.project-card:hover {
  border-color: #4ade80;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(74, 222, 128, 0.1);
}

/* Card Header */
.card-header h3 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: white;
}

.project-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #666;
  background: #111;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Balance Section */
.balance-section {
  background: rgba(74, 222, 128, 0.05);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 8px;
  padding: 16px;
}

.balance-label {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 1.8rem;
  font-weight: 700;
  color: #4ade80;
  font-family: monospace;
}

/* Progress Section */
.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.progress-header span:first-child {
  color: #ccc;
}

.progress-text {
  color: #888;
  font-family: monospace;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #111;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.3s ease;
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #222;
  margin-top: auto;
}

.created-date {
  font-size: 0.8rem;
  color: #666;
}

.btn-view {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-view:hover {
  border-color: #4ade80;
  color: #4ade80;
}

/* Create New Card */
.create-card {
  border-style: dashed;
  border-color: #333;
  cursor: pointer;
  min-height: 300px;
  justify-content: center;
  align-items: center;
}

.create-card:hover {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.02);
}

.create-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.plus-icon-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #111;
  color: #4ade80;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  transition: all 0.2s;
}

.create-card:hover .plus-icon-large {
  background: #4ade80;
  color: #050505;
  transform: rotate(90deg);
}

.create-content h3 {
  margin: 0;
  font-size: 1.2rem;
}

.create-content p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 1400px) {
  .project-dashboard {
    padding: 30px;
    padding-right: 260px;
  }
}

@media (max-width: 1024px) {
  .project-dashboard {
    padding: 30px;
    padding-right: 110px;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .project-dashboard {
    padding: 20px;
    padding-right: 90px;
  }

  .dashboard-header h1 {
    font-size: 2rem;
  }
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
