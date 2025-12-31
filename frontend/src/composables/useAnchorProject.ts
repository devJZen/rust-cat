// src/composables/useAnchorProject.ts
import { ref } from 'vue';
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Mock 모드 (프로그램이 배포되지 않았을 때)
const MOCK_MODE = false; // 실제 배포된 프로그램 사용

// 가상의 IDL (Smart Contract 인터페이스 정의)
// 실제 프로젝트에서는 target/types/your_program.ts 에서 가져와야 함
const IDL = {
  "address": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "version": "0.1.0",
  "name": "trawelt_project",
  "metadata": {
    "name": "trawelt_project",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "initializeProject",
      "accounts": [
        { "name": "projectAccount", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "admins", "type": { "vec": "publicKey" } },
        { "name": "members", "type": { "vec": "publicKey" } }
      ]
    }
  ],
  "accounts": [],
  "types": []
};

export function useAnchorProject() {
  const loading = ref(false);
  const txHash = ref('');
  const error = ref('');

  const createProjectOnChain = async (
    name: string,
    adminAddresses: string[],
    memberAddresses: string[]
  ) => {
    loading.value = true;
    error.value = '';
    txHash.value = '';

    try {
      // Mock 모드 (프로그램이 배포되지 않았을 때)
      if (MOCK_MODE) {
        // 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 가짜 트랜잭션 해시 생성
        const mockTxHash = '5' + 'A'.repeat(87); // 임시 해시
        txHash.value = mockTxHash;

        console.log("🎭 Mock Mode: Project Created!");
        console.log("Project Name:", name);
        console.log("Admins:", adminAddresses);
        console.log("Members:", memberAddresses);

        return mockTxHash;
      }

      // === 실제 온체인 모드 ===
      // 1. Provider 설정 (Phantom 등 브라우저 지갑 사용)
      // @ts-expect-error - Phantom wallet global
      const phantomWallet = window.solana;
      if (!phantomWallet || !phantomWallet.isPhantom) {
        throw new Error("Phantom wallet not found");
      }

      // Phantom wallet을 Anchor가 이해할 수 있는 형식으로 래핑
      const wallet = {
        publicKey: phantomWallet.publicKey,
        signTransaction: phantomWallet.signTransaction.bind(phantomWallet),
        signAllTransactions: phantomWallet.signAllTransactions.bind(phantomWallet),
      };

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const provider = new anchor.AnchorProvider(
        connection,
        wallet as anchor.Wallet,
        { commitment: "confirmed" }
      );
      anchor.setProvider(provider);

      // 2. Program 로드
      const program = new anchor.Program(IDL as unknown as anchor.Idl, provider);

      // 3. Project PDA (Project Wallet) 주소 유도
      const programId = new PublicKey(IDL.address);
      const [projectPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("project"), Buffer.from(name), provider.wallet.publicKey.toBuffer()],
        programId
      );

      // 4. 주소 변환 (String -> PublicKey)
      const admins = adminAddresses.map(addr => new PublicKey(addr));
      const members = memberAddresses.map(addr => new PublicKey(addr));

      // 5. 트랜잭션 전송
      const tx = await program.methods
        .initializeProject!(name, admins, members)
        .accounts({
          projectAccount: projectPda,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      txHash.value = tx;
      console.log("Project Created! PDA:", projectPda.toString());
      console.log("Transaction:", tx);

      return projectPda.toString();

    } catch (err) {
      console.error("Error creating project:", err);
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fundTreasury = async (
    projectPda: string,
    amount: number // in SOL
  ): Promise<string> => {
    loading.value = true;
    error.value = '';

    try {
      // @ts-expect-error - Phantom wallet global
      if (!window.solana || !window.solana.isConnected) {
        throw new Error("Wallet not connected");
      }

      // @ts-expect-error - Phantom wallet API
      const phantomWallet = window.solana;
      const wallet = {
        publicKey: phantomWallet.publicKey,
        signTransaction: phantomWallet.signTransaction.bind(phantomWallet),
        signAllTransactions: phantomWallet.signAllTransactions.bind(phantomWallet),
      };

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const provider = new anchor.AnchorProvider(
        connection,
        wallet as anchor.Wallet,
        { commitment: "confirmed" }
      );

      const program = new anchor.Program(IDL as unknown as anchor.Idl, provider);

      const projectPubkey = new PublicKey(projectPda);
      const lamports = new anchor.BN(amount * 1000000000); // SOL to lamports

      const tx = await program.methods
        // @ts-expect-error - IDL types
        .fundTreasury(lamports)
        .accounts({
          project: projectPubkey,
          funder: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Treasury funded! Transaction:", tx);
      txHash.value = tx;
      return tx;

    } catch (err) {
      console.error("Error funding treasury:", err);
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const withdrawFunds = async (
    projectPda: string,
    amount: number, // in SOL
    recipientAddress: string
  ): Promise<string> => {
    loading.value = true;
    error.value = '';

    try {
      // @ts-expect-error - Phantom wallet global
      if (!window.solana || !window.solana.isConnected) {
        throw new Error("Wallet not connected");
      }

      // @ts-expect-error - Phantom wallet API
      const phantomWallet = window.solana;
      const wallet = {
        publicKey: phantomWallet.publicKey,
        signTransaction: phantomWallet.signTransaction.bind(phantomWallet),
        signAllTransactions: phantomWallet.signAllTransactions.bind(phantomWallet),
      };

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const provider = new anchor.AnchorProvider(
        connection,
        wallet as anchor.Wallet,
        { commitment: "confirmed" }
      );

      const program = new anchor.Program(IDL as unknown as anchor.Idl, provider);

      const projectPubkey = new PublicKey(projectPda);
      const recipient = new PublicKey(recipientAddress);
      const lamports = new anchor.BN(amount * 1000000000); // SOL to lamports

      const tx = await program.methods
        // @ts-expect-error - IDL types
        .withdrawFunds(lamports)
        .accounts({
          project: projectPubkey,
          authority: provider.wallet.publicKey,
          recipient: recipient,
        })
        .rpc();

      console.log("Funds withdrawn! Transaction:", tx);
      txHash.value = tx;
      return tx;

    } catch (err) {
      console.error("Error withdrawing funds:", err);
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    createProjectOnChain,
    fundTreasury,
    withdrawFunds,
    loading,
    txHash,
    error
  };
}
