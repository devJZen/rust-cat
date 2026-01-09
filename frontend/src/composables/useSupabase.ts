// src/composables/useSupabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE 흐름 사용 (더 안전한 OAuth)
    flowType: 'pkce',
    // 자동으로 세션 감지 (기본값: true)
    detectSessionInUrl: true,
    // 세션 지속성 설정
    persistSession: true,
    // 자동 새로고침 활성화
    autoRefreshToken: true
  }
})

export interface Project {
  id?: string;
  name: string;
  type: 'project' | 'betting' | 'savings' | 'fundraising';
  creator_wallet: string;
  admins: string[];
  members: string[];
  pda?: string;
  balance?: number;
  deadline?: string; // ISO date string
  payment_tx?: string; // 0.1 SOL payment transaction hash
  created_at?: string;
  integrations?: {
    github: boolean;
    jira: boolean;
  };
}

export interface UserProfile {
  id?: string;
  wallet_address: string;
  github_connected: boolean;
  github_handle?: string;
  github_user_id?: string;
  github_email?: string;
  github_avatar_url?: string;
  github_oauth_provider_token?: string;
  jira_connected: boolean;
  jira_email?: string;
  jira_domain?: string;
  created_at?: string;
  updated_at?: string;
}

export function useSupabase() {
  // 웨이팅리스트 등록 함수
  const addToWaitlist = async (email: string) => {
    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ email }])
    return { data, error }
  }

  // 깃허브 로그인 함수
  const loginWithGithub = async (returnToModal = false) => {
    try {
      // redirectTo를 현재 페이지로 설정 (인증 후 현재 페이지로 돌아옴)
      const origin = window.location.origin;
      let redirectTo = window.location.href;

      // 모달로 돌아가야 하는 경우 /create 경로에 파라미터 추가
      if (returnToModal) {
        redirectTo = `${origin}/create?github_modal=open`;
      }

      console.log('Initiating GitHub OAuth redirect to:', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectTo
        }
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error initiating GitHub OAuth:', err);
      throw err;
    }
  }

  // 프로젝트 생성
  const createProject = async (project: Project) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single()
    return { data, error }
  }

  // 프로젝트 목록 조회 (내 지갑 주소로)
  const getMyProjects = async (walletAddress: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`creator_wallet.eq.${walletAddress},admins.cs.{${walletAddress}},members.cs.{${walletAddress}}`)
      .order('created_at', { ascending: false })
    return { data, error }
  }

  // 모든 프로젝트 조회 (리더보드용)
  const getAllProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('balance', { ascending: false })
    return { data, error }
  }

  // 프로젝트 삭제
  const deleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    return { error }
  }

  // ===== User Profile 관리 =====

  // 사용자 프로필 조회
  const getUserProfile = async (walletAddress: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()
    return { data, error }
  }

  // 사용자 프로필 생성 또는 업데이트
  const upsertUserProfile = async (profile: UserProfile) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile, {
        onConflict: 'wallet_address',
        ignoreDuplicates: false
      })
      .select()
      .single()
    return { data, error }
  }

  // GitHub 연동 정보 업데이트
  const updateGithubConnection = async (
    walletAddress: string,
    githubData: {
      github_connected: boolean;
      github_handle?: string;
      github_user_id?: string;
      github_email?: string;
      github_avatar_url?: string;
    }
  ) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        wallet_address: walletAddress,
        ...githubData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      })
      .select()
      .single()
    return { data, error }
  }

  // Jira 연동 정보 업데이트
  const updateJiraConnection = async (
    walletAddress: string,
    jiraData: {
      jira_connected: boolean;
      jira_email?: string;
      jira_domain?: string;
    }
  ) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        wallet_address: walletAddress,
        ...jiraData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      })
      .select()
      .single()
    return { data, error }
  }

  return {
    supabase,
    addToWaitlist,
    loginWithGithub,
    createProject,
    getMyProjects,
    getAllProjects,
    deleteProject,
    getUserProfile,
    upsertUserProfile,
    updateGithubConnection,
    updateJiraConnection
  }
}
