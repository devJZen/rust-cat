// src/composables/useAnchorProject.ts
import { ref } from 'vue';
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// 가상의 IDL (Smart Contract 인터페이스 정의)
// 실제 프로젝트에서는 target/types/your_program.ts 에서 가져와야 함
const IDL = {
  "version": "0.1.0",
  "name": "trawelt_project",
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
  ]
};

const PROGRAM_ID = new PublicKey("YOUR_PROGRAM_ID_HERE"); // 배포한 SC 주소

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
      // 1. Provider 설정 (Phantom 등 브라우저 지갑 사용)
      // @ts-ignore
      const wallet = window.solana;
      if (!wallet || !wallet.isPhantom) throw new Error("Phantom wallet not found");

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const provider = new anchor.AnchorProvider(connection, wallet, {});
      anchor.setProvider(provider);

      // 2. Program 로드
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);

      // 3. Project PDA (Project Wallet) 주소 유도
      // 이름과 생성자 주소를 시드로 사용하여 고유한 지갑 주소 생성
      const [projectPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("project"), Buffer.from(name), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      // 4. 주소 변환 (String -> PublicKey)
      const admins = adminAddresses.map(addr => new PublicKey(addr));
      const members = memberAddresses.map(addr => new PublicKey(addr));

      // 5. 트랜잭션 전송 (Anchor 최신 문법)
      const tx = await program.methods
        .initializeProject(name, admins, members)
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

    } catch (err: any) {
      console.error(err);
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return { createProjectOnChain, loading, txHash, error };
}
