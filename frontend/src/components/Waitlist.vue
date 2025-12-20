<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSupabase } from '../composables/useSupabase';

// --- State ---
const email = ref('');
const loading = ref(false);
const success = ref(false);
const error = ref('');
const isAuthenticated = ref(false);
const userName = ref('');
const userEmail = ref('');

// --- Composables ---
const { addToWaitlist, loginWithGithub, supabase } = useSupabase();

// --- Handlers ---
const handleSubmit = async () => {
  if (!email.value) {
    error.value = 'Please enter your email';
    return;
  }

  if (!isValidEmail(email.value)) {
    error.value = 'Please enter a valid email address';
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = false;

  try {
    const { error: submitError } = await addToWaitlist(email.value);

    if (submitError) {
      // 중복 이메일 체크
      if (submitError.code === '23505') {
        error.value = 'This email is already on the waitlist!';
      } else {
        error.value = submitError.message;
      }
      return;
    }

    success.value = true;
    email.value = '';
  } catch (err) {
    console.error('Failed to join waitlist:', err);
    error.value = 'Something went wrong. Please try again.';
  } finally {
    loading.value = false;
  }
};

const isValidEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// GitHub 로그인
const handleGithubLogin = async () => {
  try {
    await loginWithGithub();
    // OAuth 리디렉션이 발생하므로 여기는 실행되지 않음
  } catch (err) {
    console.error('GitHub login failed:', err);
    error.value = 'Failed to login with GitHub';
  }
};

// 로그아웃
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    isAuthenticated.value = false;
    userName.value = '';
    userEmail.value = '';
    email.value = '';
  } catch (err) {
    console.error('Logout failed:', err);
  }
};

// 세션 확인
onMounted(async () => {
  // 현재 세션 확인
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    isAuthenticated.value = true;
    userName.value = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User';
    userEmail.value = session.user.email || '';
    email.value = session.user.email || '';
  }

  // 인증 상태 변화 감지
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      isAuthenticated.value = true;
      userName.value = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User';
      userEmail.value = session.user.email || '';
      email.value = session.user.email || '';
    } else if (event === 'SIGNED_OUT') {
      isAuthenticated.value = false;
      userName.value = '';
      userEmail.value = '';
      email.value = '';
    }
  });
});
</script>

<template>
  <div class="waitlist-container">
    <div class="waitlist-content">
      <!-- Header -->
      <div class="waitlist-header">
        <div class="logo-section">
          <h1>🌱 Garden SOL</h1>
          <p class="tagline">Multi-Purpose On-Chain Treasury Platform</p>
        </div>

        <div class="description-section">
          <h2>Join the Waitlist</h2>
          <p class="description">
            Be the first to know when we launch. Get early access to create work projects,
            betting pools, group savings, and fundraising campaigns on Solana.
          </p>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">💼</div>
          <h3>Work Projects</h3>
          <p>Manage team milestones with on-chain bounties and GitHub/Jira integration</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🎲</div>
          <h3>Betting Pools</h3>
          <p>Friendly bets with friends - lunch, sports, predictions, all on-chain</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🏦</div>
          <h3>Group Savings</h3>
          <p>Savings clubs, rotating credit, team funds - transparent and secure</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">💝</div>
          <h3>Fundraising</h3>
          <p>Charity, gifts, community projects - track every contribution transparently</p>
        </div>
      </div>

      <!-- Waitlist Form -->
      <div class="form-section">
        <div class="form-container">
          <!-- Authenticated User Info -->
          <div v-if="isAuthenticated && !success" class="auth-info">
            <div class="user-badge">
              <div class="user-avatar">{{ userName.charAt(0).toUpperCase() }}</div>
              <div class="user-details">
                <div class="user-name">{{ userName }}</div>
                <div class="user-email">{{ userEmail }}</div>
              </div>
              <button class="btn-logout" @click="handleLogout">Sign Out</button>
            </div>
          </div>

          <div v-if="success" class="success-message">
            <div class="success-icon">✓</div>
            <h3>You're on the list!</h3>
            <p>We'll notify you when Garden SOL launches. Check your email for confirmation.</p>
          </div>

          <div v-else class="form-content">
            <h3>Get Early Access</h3>
            <p class="form-subtitle">Sign in with GitHub or enter your email to join the waitlist</p>

            <!-- GitHub Login Button -->
            <div v-if="!isAuthenticated" class="github-login-section">
              <button @click="handleGithubLogin" class="btn-github">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z"/>
                </svg>
                Continue with GitHub
              </button>
              <div class="divider">
                <span>or</span>
              </div>
            </div>

            <form @submit.prevent="handleSubmit" class="email-form">
              <div class="input-group">
                <input
                  v-model="email"
                  type="email"
                  placeholder="your.email@example.com"
                  class="email-input"
                  :disabled="loading"
                />
                <button
                  type="submit"
                  class="submit-button"
                  :disabled="loading"
                >
                  <span v-if="loading">Joining...</span>
                  <span v-else>Join Waitlist →</span>
                </button>
              </div>

              <div v-if="error" class="error-message">
                {{ error }}
              </div>
            </form>

            <p class="privacy-note">
              We respect your privacy. No spam, just launch updates.
            </p>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-section">
        <div class="stat-item">
          <div class="stat-value">🔒</div>
          <div class="stat-label">100% On-Chain</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">⚡</div>
          <div class="stat-label">Powered by Solana</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">🌐</div>
          <div class="stat-label">Open to Everyone</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.waitlist-container {
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

.waitlist-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.waitlist-header {
  text-align: center;
  margin-bottom: 60px;
}

.logo-section {
  margin-bottom: 40px;
}

.logo-section h1 {
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-size: 1.1rem;
  color: #888;
  font-weight: 500;
}

.description-section h2 {
  font-size: 2rem;
  margin-bottom: 16px;
  color: white;
}

.description {
  font-size: 1.1rem;
  color: #aaa;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.7;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 60px;
}

.feature-card {
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s;
}

.feature-card:hover {
  border-color: #4ade80;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(74, 222, 128, 0.15);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 1.1rem;
  margin-bottom: 12px;
  color: white;
}

.feature-card p {
  font-size: 0.9rem;
  color: #888;
  line-height: 1.6;
}

/* Form Section */
.form-section {
  margin-bottom: 60px;
}

.form-container {
  background: #0a0a0a;
  border: 2px solid #4ade80;
  border-radius: 16px;
  padding: 48px;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 0 40px rgba(74, 222, 128, 0.1);
}

.form-content h3 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  color: white;
  text-align: center;
}

.form-subtitle {
  text-align: center;
  color: #888;
  margin-bottom: 32px;
  font-size: 1rem;
}

.email-form {
  margin-bottom: 16px;
}

.input-group {
  display: flex;
  gap: 12px;
}

.email-input {
  flex: 1;
  background: #111;
  border: 1px solid #333;
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.email-input:focus {
  outline: none;
  border-color: #4ade80;
}

.email-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-button {
  background: #4ade80;
  color: #050505;
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.submit-button:hover:not(:disabled) {
  background: #22c55e;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 12px;
  text-align: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  padding: 12px;
  border-radius: 6px;
}

.success-message {
  text-align: center;
  padding: 20px;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: #4ade80;
  color: #050505;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  margin: 0 auto 24px;
  animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.success-message h3 {
  font-size: 1.8rem;
  color: #4ade80;
  margin-bottom: 12px;
}

.success-message p {
  color: #aaa;
  font-size: 1rem;
  line-height: 1.6;
}

.privacy-note {
  text-align: center;
  color: #666;
  font-size: 0.85rem;
}

/* Auth Info */
.auth-info {
  margin-bottom: 24px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid #4ade80;
  padding: 16px;
  border-radius: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  background: #4ade80;
  color: #050505;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.user-email {
  font-size: 0.85rem;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-logout {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-logout:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

/* GitHub Login */
.github-login-section {
  margin-bottom: 24px;
}

.btn-github {
  width: 100%;
  background: #24292e;
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-github:hover {
  background: #2f363d;
  box-shadow: 0 4px 12px rgba(36, 41, 46, 0.4);
}

.btn-github svg {
  flex-shrink: 0;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 24px 0;
  color: #666;
  font-size: 0.85rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #333;
}

.divider span {
  padding: 0 16px;
}

/* Stats */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  padding-top: 40px;
  border-top: 1px solid #222;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 3rem;
  margin-bottom: 12px;
}

.stat-label {
  color: #888;
  font-size: 0.95rem;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 1400px) {
  .waitlist-container {
    padding: 30px;
    padding-right: 260px;
  }
}

@media (max-width: 1024px) {
  .waitlist-container {
    padding: 30px;
    padding-right: 110px;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .logo-section h1 {
    font-size: 2.5rem;
  }
}

@media (max-width: 768px) {
  .waitlist-container {
    padding: 20px;
    padding-right: 90px;
  }

  .logo-section h1 {
    font-size: 2rem;
  }

  .description-section h2 {
    font-size: 1.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .form-container {
    padding: 32px 24px;
  }

  .input-group {
    flex-direction: column;
  }

  .stats-section {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .user-badge {
    flex-direction: column;
    text-align: center;
  }

  .user-details {
    text-align: center;
  }

  .btn-logout {
    width: 100%;
  }
}
</style>
