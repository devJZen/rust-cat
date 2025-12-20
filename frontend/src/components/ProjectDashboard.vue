<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ProjectDetails from './ProjectDetails.vue';
import { useSupabase, type Project as SupabaseProject } from '../composables/useSupabase';

interface Project {
  id: string;
  name: string;
  type: 'project' | 'betting' | 'savings' | 'fundraising';
  pda?: string; // Project wallet address
  balance: number; // SOL balance
  deadline?: string;
  payment_tx?: string; // 0.1 SOL payment transaction hash
  creator_wallet: string;
  created_at?: string;
  createdAt?: number; // for compatibility
  tasksCompleted?: number;
  totalTasks?: number;
}

// --- State ---
const projects = ref<Project[]>([]);
const loading = ref(true);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedProject = ref<any>(null); // ProjectDetails의 다른 인터페이스 사용
const showDetailsModal = ref(false);
const showDeleteConfirm = ref(false);
const projectToDelete = ref<Project | null>(null);
const connectedWallet = ref('');

// --- Emits ---
const emit = defineEmits(['create-project']);

// --- Composables ---
const { getMyProjects, deleteProject: deleteProjectSupabase } = useSupabase();

// --- Methods ---
const viewProjectDetails = (project: Project) => {
  // ProjectDetails 컴포넌트의 인터페이스에 맞게 변환
  const detailsProject = {
    id: project.id,
    name: project.name,
    pda: project.pda || 'Not deployed',
    balance: project.balance,
    tasksCompleted: project.tasksCompleted || 0,
    totalTasks: project.totalTasks || 100,
    createdAt: project.created_at ? new Date(project.created_at).getTime() : Date.now(),
    payment_tx: project.payment_tx // 결제 트랜잭션 해시 전달
  };
  selectedProject.value = detailsProject;
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedProject.value = null;
};

const confirmDelete = (project: Project) => {
  projectToDelete.value = project;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  projectToDelete.value = null;
};

const deleteProject = async () => {
  if (!projectToDelete.value) return;

  const projectName = projectToDelete.value.name;
  const projectId = projectToDelete.value.id;

  try {
    console.log('Deleting project:', projectId);

    // Supabase에서 삭제
    const { error } = await deleteProjectSupabase(projectId);

    if (error) {
      console.error('Failed to delete project:', error);
      alert(`Failed to delete project: ${error.message}\n\nPlease check:\n1. Supabase connection (.env file)\n2. RLS policies (run supabase-update-policies.sql)`);
      return;
    }

    // 로컬 상태에서도 제거
    projects.value = projects.value.filter(p => p.id !== projectId);

    console.log('✓ Project deleted successfully:', projectName);

    // 성공 메시지 (선택사항)
    // alert(`Project "${projectName}" deleted successfully`);
  } catch (err) {
    console.error('Failed to delete project:', err);
    alert('Failed to delete project. Please check console for details.');
  } finally {
    showDeleteConfirm.value = false;
    projectToDelete.value = null;
  }
};

// --- Methods ---
const fetchProjects = async () => {
  if (!connectedWallet.value) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    // Supabase에서 내 프로젝트 가져오기
    const { data, error } = await getMyProjects(connectedWallet.value);

    if (error) {
      console.error('Failed to fetch projects:', error);
      projects.value = [];
      return;
    }

    // Supabase 데이터를 Project 형식으로 변환
    projects.value = (data || []).map((p: SupabaseProject) => ({
      id: p.id || '',
      name: p.name,
      type: p.type,
      pda: p.pda || 'Not yet deployed',
      balance: p.balance || 0,
      deadline: p.deadline,
      payment_tx: p.payment_tx, // 결제 트랜잭션 해시
      creator_wallet: p.creator_wallet,
      created_at: p.created_at,
      tasksCompleted: 0, // TODO: 나중에 task tracking 추가
      totalTasks: 100
    }));

    console.log('Fetched projects:', projects.value);
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    projects.value = [];
  } finally {
    loading.value = false;
  }
};

const formatBalance = (balance: number) => {
  return balance.toFixed(2) + ' SOL';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getProgressPercent = (completed: number, total: number) => {
  return Math.round((completed / total) * 100);
};

const getTypeIcon = (type: string) => {
  const icons = {
    project: '💼',
    betting: '🎲',
    savings: '🏦',
    fundraising: '💝'
  };
  return icons[type as keyof typeof icons] || '💼';
};

onMounted(async () => {
  try {
    // @ts-expect-error - Phantom wallet global
    if (window.solana && window.solana.isConnected) {
      // @ts-expect-error - Phantom wallet API
      const publicKey = window.solana.publicKey;
      if (publicKey) {
        connectedWallet.value = publicKey.toString();
        await fetchProjects();
      }
    }
  } catch (err) {
    console.error('Failed to get wallet address:', err);
  }
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
          <div class="header-content">
            <h3>
              <span class="type-icon-badge">{{ getTypeIcon(project.type) }}</span>
              {{ project.name }}
            </h3>
            <span class="project-id">{{ (project.pda || 'Not deployed').slice(0, 8) }}...</span>
          </div>
          <button class="btn-delete-small" @click.stop="confirmDelete(project)" title="Delete project">
            🗑️
          </button>
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
            <span class="progress-text">{{ project.tasksCompleted || 0 }}/{{ project.totalTasks || 100 }} tasks</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getProgressPercent(project.tasksCompleted || 0, project.totalTasks || 100) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <span class="created-date">Created {{ formatDate(project.created_at) }}</span>
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

    <!-- Delete Confirmation Modal -->
    <Transition name="fade">
      <div v-if="showDeleteConfirm" class="delete-modal-overlay" @click.self="cancelDelete">
        <div class="delete-modal">
          <div class="modal-icon">⚠️</div>
          <h2>Delete Project?</h2>
          <p class="warning-text">
            Are you sure you want to delete <strong>{{ projectToDelete?.name }}</strong>?
          </p>
          <p class="info-text">
            This will remove the project from your dashboard. The on-chain PDA wallet will remain on the blockchain, but you'll lose access to manage it through this interface.
          </p>

          <div class="modal-actions">
            <button class="btn-cancel" @click="cancelDelete">
              Cancel
            </button>
            <button class="btn-confirm-delete" @click="deleteProject">
              Delete Project
            </button>
          </div>
        </div>
      </div>
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
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-content {
  flex: 1;
}

.card-header h3 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon-badge {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.project-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #666;
  background: #111;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-delete-small {
  background: transparent;
  border: 1px solid #333;
  color: #666;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete-small:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
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

/* Delete Confirmation Modal */
.delete-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 20px;
}

.delete-modal {
  background: #0a0a0a;
  border: 1px solid #ef4444;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  animation: slideUp 0.3s ease;
}

.modal-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.delete-modal h2 {
  font-size: 1.8rem;
  color: white;
  margin: 0 0 16px 0;
}

.warning-text {
  color: #ef4444;
  font-size: 1rem;
  margin-bottom: 16px;
  line-height: 1.6;
}

.warning-text strong {
  color: white;
  font-weight: 600;
}

.info-text {
  color: #888;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 32px;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.btn-cancel,
.btn-confirm-delete {
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #333;
  color: #888;
}

.btn-cancel:hover {
  border-color: #4ade80;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.btn-confirm-delete {
  background: #ef4444;
  color: white;
}

.btn-confirm-delete:hover {
  background: #dc2626;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile: Single column layout for modal actions */
@media (max-width: 600px) {
  .modal-actions {
    grid-template-columns: 1fr;
  }

  .delete-modal {
    padding: 24px;
  }

  .delete-modal h2 {
    font-size: 1.5rem;
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
