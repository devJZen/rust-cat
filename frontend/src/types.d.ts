// Type declarations for packages without official types

declare module 'bs58' {
  export function encode(buffer: Uint8Array): string;
  export function decode(string: string): Uint8Array;
}

declare module 'tweetnacl' {
  export namespace sign {
    export namespace detached {
      export function verify(
        message: Uint8Array,
        signature: Uint8Array,
        publicKey: Uint8Array
      ): boolean;
    }
  }
}

declare module 'solana-wallets-vue' {
  import { Ref } from 'vue';
  import { PublicKey } from '@solana/web3.js';

  export function useWallet(): {
    publicKey: Ref<PublicKey | null>;
    signMessage: Ref<((message: Uint8Array) => Promise<Uint8Array>) | null>;
    connected: Ref<boolean>;
    connecting: Ref<boolean>;
    disconnecting: Ref<boolean>;
    wallet: Ref<any>;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
  };
}
