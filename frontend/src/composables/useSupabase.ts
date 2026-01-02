// src/composables/useSupabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    // redirectTo를 현재 페이지로 설정 (인증 후 현재 페이지로 돌아옴)
    let redirectTo = window.location.href;

    // 모달로 돌아가야 하는 경우 파라미터 추가
    if (returnToModal) {
      const url = new URL(window.location.href);
      url.searchParams.set('github_modal', 'open');
      redirectTo = url.toString();
    }

    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectTo
      }
    })
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

  return {
    supabase,
    addToWaitlist,
    loginWithGithub,
    createProject,
    getMyProjects,
    getAllProjects,
    deleteProject
  }
}
