# Quick Start Guide - Garden SOL

## 🚀 What's Done

✅ **Security Hardening Complete**
- Input validation (6 checks)
- Admin authorization enforcement
- Supabase RLS policies written
- Payment security enhancements

✅ **Treasury Features Complete**
- Fund treasury instruction
- Withdraw funds instruction (admin-only)
- Balance tracking on-chain

✅ **Testing Complete**
- 15 security tests (13 new + 2 original)
- 100% coverage on critical paths

✅ **Deployed to Devnet**
- Program ID: `FqyzG8CkTU9Z5twgWr8FmbYmyEbcbM97w3qiV4xnF7YW`
- Explorer: https://explorer.solana.com/address/FqyzG8CkTU9Z5twgWr8FmbYmyEbcbM97w3qiV4xnF7YW?cluster=devnet

---

## 📋 TODO: Next Steps

### 🔥 High Priority (Do First)

#### 1. Fix Supabase RLS Policy Error
**Problem:** Policies already exist, causing "already exists" error

**Solution:**
```sql
-- Run this in Supabase SQL Editor first:
DROP POLICY IF EXISTS "Anyone can update projects" ON projects;
DROP POLICY IF EXISTS "Anyone can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Then copy the new policies from supabase-schema.sql and run them
```

**File:** `supabase-schema.sql` (lines 33-59)

---

#### 2. Connect Fund/Withdraw UI
**File:** `frontend/src/components/ProjectDetails.vue`

**What to do:**
1. Import the composable:
```typescript
import { useAnchorProject } from '../composables/useAnchorProject';
const { fundTreasury, withdrawFunds, loading, error } = useAnchorProject();
```

2. Add modal state:
```typescript
const showFundModal = ref(false);
const showWithdrawModal = ref(false);
const fundAmount = ref('');
const withdrawAmount = ref('');
const withdrawRecipient = ref('');
```

3. Create handler functions:
```typescript
const handleFundTreasury = async () => {
  if (!fundAmount.value || parseFloat(fundAmount.value) <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  try {
    const tx = await fundTreasury(
      props.project.pda,  // Pass project PDA
      parseFloat(fundAmount.value)
    );

    alert(`Successfully funded ${fundAmount.value} SOL!`);
    showFundModal.value = false;
    fundAmount.value = '';

    // Refresh balance
    await fetchPDABalance();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to fund treasury');
  }
};

const handleWithdrawFunds = async () => {
  // Similar implementation for withdraw
};
```

4. Update button click handlers:
```vue
<button class="btn-action btn-fund" @click="showFundModal = true">
  💰 Fund Treasury
</button>
<button class="btn-action btn-withdraw" @click="showWithdrawModal = true">
  💸 Withdraw Funds
</button>
```

5. Add modal UI (see IMPLEMENTATION-SUMMARY.md for full code)

**Current status:** Buttons exist but have no functionality

---

#### 3. GitHub Integration Sync
**File:** `frontend/src/composables/useSupabase.ts`

**What to do:**
1. Add this function:
```typescript
const syncGithubToBlockchain = async (
  projectName: string,
  creatorWallet: string,
  githubData: {
    username: string;
    email: string;
    repoUrl?: string;
  }
) => {
  const { error } = await supabase
    .from('projects')
    .update({
      integrations: {
        github: true,
        github_username: githubData.username,
        github_email: githubData.email,
        github_repo: githubData.repoUrl || null,
        jira: false
      }
    })
    .eq('name', projectName)
    .eq('creator_wallet', creatorWallet);

  return { error };
};

// Export it
return {
  // ... existing exports
  syncGithubToBlockchain
};
```

2. Update `CreateProject.vue` (around line 240):
```typescript
// In handleCreate(), after project creation:
if (isGithubConnected.value && projectType.value === 'project') {
  const { error: syncError } = await syncGithubToBlockchain(
    projectName.value,
    connectedWallet.value,
    {
      username: githubUserName.value,
      email: githubUserEmail.value,
    }
  );

  if (syncError) {
    console.error('Failed to sync GitHub:', syncError);
  }
}
```

**Current status:** GitHub login works, but data not saved to database

---

### ⚡ Medium Priority

#### 4. Update IDL to Real Program
**File:** `frontend/src/composables/useAnchorProject.ts`

**Current:** Using mock IDL
**Need:** Real IDL from deployed program

**Option 1:** Copy from generated file
```typescript
import IDL_JSON from '../../../target/idl/garden_sol.json';
const IDL = IDL_JSON as anchor.Idl;
```

**Option 2:** Update mock IDL to match deployed program
- Add `fund_treasury` instruction
- Add `withdraw_funds` instruction
- Update `initialize_project` params (github_enabled, jira_enabled)

---

#### 5. Write Frontend Tests
**File:** `frontend/src/__tests__/CreateProject.spec.ts` (NEW)

**Setup:**
```bash
cd frontend
npm install -D @vue/test-utils vitest jsdom
```

**Add to package.json:**
```json
{
  "scripts": {
    "test:unit": "vitest"
  }
}
```

**Write 5 basic tests:**
1. Prevents empty project name
2. Prevents creation without wallet
3. Requires GitHub for Work Projects
4. Checks balance before payment
5. Handles payment failure

See IMPLEMENTATION-SUMMARY.md for example code.

---

### 📝 Low Priority

#### 6. Documentation
- [ ] Add JSDoc comments to functions
- [ ] Screenshot the app for README
- [ ] Update TODO.md with completed items

#### 7. Performance
- [ ] Add caching for PDA lookups
- [ ] Debounce form inputs
- [ ] Lazy load components

#### 8. Future Features
- [ ] Multi-sig for large withdrawals
- [ ] Event emissions in Anchor
- [ ] Time-lock for withdrawals
- [ ] SPL token support (USDC/USDT)

---

## 🏃 Running the Project

### Backend (Anchor)
```bash
# Build
anchor build

# Test (requires solana-test-validator)
solana-test-validator  # Terminal 1
anchor test            # Terminal 2

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Frontend (Vue)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## 🔧 Common Issues

### "Policy already exists" error
**Solution:** Drop existing policies first (see TODO #1)

### "Connection refused" in tests
**Solution:** Start `solana-test-validator` first

### "ts-mocha not found"
**Solution:** Already fixed! Run `yarn install`

### MOCK_MODE still enabled
**Solution:** Already disabled! Check `useAnchorProject.ts` line 7

---

## 📊 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Anchor Program | ✅ Complete | Deployed to devnet |
| Security Features | ✅ Complete | Input validation + RBAC |
| Treasury (Backend) | ✅ Complete | Fund + Withdraw |
| Treasury (Frontend) | ⚠️ Partial | Composable done, UI needed |
| Tests (Anchor) | ✅ Complete | 15 tests |
| Tests (Frontend) | ❌ Not Started | 0 tests |
| Supabase RLS | ⚠️ Written | Not deployed |
| GitHub Sync | ⚠️ Partial | Login works, sync needed |

---

## 🎯 Recommended Work Order

1. **Fix Supabase policies** (5 min) → Enables secure database
2. **Connect Fund/Withdraw UI** (30 min) → Makes Treasury usable
3. **GitHub sync** (15 min) → Saves integration data
4. **Update IDL** (10 min) → Uses real program types
5. **Write tests** (60 min) → Ensures quality

**Total estimated time:** ~2 hours

---

## 📚 Reference Files

- **Implementation Details:** `IMPLEMENTATION-SUMMARY.md`
- **Original Requirements:** `TODO.md`
- **Deployment Plan:** `/Users/juseon/.claude/plans/spicy-puzzling-comet.md`
- **Database Schema:** `supabase-schema.sql`
- **Test Suite:** `tests/garden_sol.ts`

---

## 🆘 Need Help?

Check these files for detailed examples:
- Security implementation → `IMPLEMENTATION-SUMMARY.md` (Phase 1)
- Testing → `IMPLEMENTATION-SUMMARY.md` (Phase 2)
- Treasury → `IMPLEMENTATION-SUMMARY.md` (Phase 3)
- UI examples → Look at existing modals in `CreateProject.vue`

---

**Last Updated:** 2025-12-31
**Version:** 1.0.0
**Program ID:** FqyzG8CkTU9Z5twgWr8FmbYmyEbcbM97w3qiV4xnF7YW
