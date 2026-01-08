/**
 * Wallet Signature Verification Composable
 *
 * Provides cryptographic proof of wallet ownership for sensitive operations.
 * Prevents direct API attacks by requiring signed messages.
 *
 * Defense against: IMPLEMENTATION-SUMMARY.md Line 590, 599
 * - Application-level wallet verification weakness
 * - Direct Supabase API bypass attacks
 */

import { useWallet } from 'solana-wallets-vue';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { ref } from 'vue';

export interface SignedAction {
  signature: string;
  message: string;
  timestamp: number;
  publicKey: string;
}

export function useWalletVerification() {
  const { publicKey, signMessage } = useWallet();
  const isVerifying = ref(false);
  const error = ref<string | null>(null);

  /**
   * Sign an action to prove wallet ownership
   *
   * @param action - Action identifier (e.g., 'delete-project', 'withdraw-funds')
   * @param resourceId - Resource being acted upon (project ID, etc.)
   * @param additionalData - Optional extra data to include in signature
   * @returns Signed proof object
   */
  const signAction = async (
    action: string,
    resourceId: string,
    additionalData?: Record<string, any>
  ): Promise<SignedAction> => {
    error.value = null;
    isVerifying.value = true;

    try {
      // Validate wallet connection
      if (!publicKey.value) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      if (!signMessage.value) {
        throw new Error('Wallet does not support message signing');
      }

      // Create timestamp for replay attack prevention
      const timestamp = Date.now();

      // Build message to sign
      const messageData = {
        action,
        resourceId,
        timestamp,
        publicKey: publicKey.value.toString(),
        ...(additionalData || {})
      };

      const message = JSON.stringify(messageData);
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from wallet
      let signature: Uint8Array;
      try {
        signature = await signMessage.value(messageBytes);
      } catch (err: any) {
        if (err.message?.includes('User rejected')) {
          throw new Error('Signature request cancelled by user');
        }
        throw new Error(`Failed to sign message: ${err.message || 'Unknown error'}`);
      }

      const signatureBase58 = bs58.encode(signature);

      console.log('[WalletVerification] Action signed:', {
        action,
        resourceId,
        publicKey: publicKey.value.toString().slice(0, 8) + '...',
        timestamp
      });

      return {
        signature: signatureBase58,
        message,
        timestamp,
        publicKey: publicKey.value.toString()
      };

    } catch (err: any) {
      error.value = err.message;
      console.error('[WalletVerification] Sign error:', err);
      throw err;
    } finally {
      isVerifying.value = false;
    }
  };

  /**
   * Verify a wallet signature (client-side validation)
   *
   * Note: This is a preliminary check. Server-side verification
   * in Supabase Edge Function is REQUIRED for security.
   *
   * @param message - Original message that was signed
   * @param signature - Base58 encoded signature
   * @param walletAddress - Expected signer's public key
   * @returns true if signature is valid
   */
  const verifySignature = (
    message: string,
    signature: string,
    walletAddress: string
  ): boolean => {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      console.log('[WalletVerification] Client-side verification:', isValid);
      return isValid;

    } catch (err) {
      console.error('[WalletVerification] Verification error:', err);
      return false;
    }
  };

  /**
   * Verify message timestamp to prevent replay attacks
   *
   * @param timestamp - Timestamp from signed message
   * @param maxAgeMs - Maximum age in milliseconds (default: 5 minutes)
   * @returns true if timestamp is valid
   */
  const verifyTimestamp = (timestamp: number, maxAgeMs: number = 5 * 60 * 1000): boolean => {
    const now = Date.now();
    const age = now - timestamp;

    if (age < 0) {
      console.warn('[WalletVerification] Future timestamp detected');
      return false;
    }

    if (age > maxAgeMs) {
      console.warn('[WalletVerification] Expired signature:', {
        age: Math.floor(age / 1000) + 's',
        maxAge: Math.floor(maxAgeMs / 1000) + 's'
      });
      return false;
    }

    return true;
  };

  /**
   * Create a human-readable message for display to user
   * Helps users understand what they're signing
   *
   * @param action - Action type
   * @param resourceId - Resource identifier
   * @returns Formatted message
   */
  const formatActionForDisplay = (action: string, resourceId: string): string => {
    const actionMessages: Record<string, string> = {
      'delete-project': `Delete project ${resourceId.slice(0, 8)}...`,
      'withdraw-funds': `Withdraw funds from project ${resourceId.slice(0, 8)}...`,
      'update-admins': `Update admin list for project ${resourceId.slice(0, 8)}...`,
      'transfer-ownership': `Transfer ownership of project ${resourceId.slice(0, 8)}...`
    };

    return actionMessages[action] || `Perform action: ${action}`;
  };

  return {
    signAction,
    verifySignature,
    verifyTimestamp,
    formatActionForDisplay,
    isVerifying,
    error
  };
}

/**
 * Usage Example:
 *
 * const { signAction, error } = useWalletVerification();
 *
 * const handleDeleteProject = async (projectId: string) => {
 *   try {
 *     const proof = await signAction('delete-project', projectId);
 *
 *     // Send proof to Edge Function
 *     const { error } = await supabase.functions.invoke('verify-and-delete', {
 *       body: {
 *         projectId,
 *         ...proof
 *       }
 *     });
 *
 *     if (error) throw error;
 *     alert('Project deleted successfully!');
 *   } catch (err) {
 *     alert(err.message);
 *   }
 * };
 */
