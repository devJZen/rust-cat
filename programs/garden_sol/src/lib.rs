use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod garden_sol {
    use super::*;

    pub fn initialize_project(
        ctx: Context<InitializeProject>,
        name: String,
        admins: Vec<Pubkey>,
        members: Vec<Pubkey>,
        github_enabled: bool,
        jira_enabled: bool,
    ) -> Result<()> {
        // Input validation
        require!(!name.is_empty(), ErrorCode::EmptyProjectName);
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(!admins.is_empty(), ErrorCode::NoAdmins);
        require!(admins.len() <= 10, ErrorCode::TooManyAdmins);
        require!(members.len() <= 50, ErrorCode::TooManyMembers);

        // Validate addresses
        validate_addresses(&admins)?;
        validate_addresses(&members)?;

        // Ensure creator is in admins
        require!(
            admins.contains(&ctx.accounts.creator.key()),
            ErrorCode::CreatorNotInAdmins
        );

        let project = &mut ctx.accounts.project;

        project.name = name;
        project.creator = ctx.accounts.creator.key();
        project.admins = admins;
        project.members = members;
        project.github_enabled = github_enabled;
        project.jira_enabled = jira_enabled;
        project.created_at = Clock::get()?.unix_timestamp;
        project.tasks_completed = 0;
        project.total_tasks = 100; // 100-pixel grid
        project.treasury_balance = 0;
        project.bump = ctx.bumps.project;

        Ok(())
    }

    pub fn update_task_completion(
        ctx: Context<UpdateTaskCompletion>,
        tasks_completed: u8,
    ) -> Result<()> {
        let project = &ctx.accounts.project;
        let signer = ctx.accounts.authority.key();

        // Check if signer is admin or creator
        require!(
            project.creator == signer || project.admins.contains(&signer),
            ErrorCode::Unauthorized
        );

        require!(
            tasks_completed <= project.total_tasks,
            ErrorCode::InvalidTaskCount
        );

        let project_mut = &mut ctx.accounts.project;
        project_mut.tasks_completed = tasks_completed;

        Ok(())
    }

    pub fn fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidFundingAmount);

        // Transfer SOL from funder to project PDA (acting as treasury)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.funder.to_account_info(),
                to: ctx.accounts.project.to_account_info(),
            },
        );

        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Update treasury balance
        let project = &mut ctx.accounts.project;
        project.treasury_balance = project
            .treasury_balance
            .checked_add(amount)
            .ok_or(ErrorCode::InvalidFundingAmount)?;

        msg!("Treasury funded with {} lamports", amount);
        Ok(())
    }

    pub fn withdraw_funds(
        ctx: Context<WithdrawFunds>,
        amount: u64,
    ) -> Result<()> {
        let project = &ctx.accounts.project;
        let authority = ctx.accounts.authority.key();

        // Check authorization (admin or creator)
        require!(
            project.creator == authority || project.admins.contains(&authority),
            ErrorCode::UnauthorizedWithdrawal
        );

        // Validate amount
        require!(amount > 0, ErrorCode::InvalidFundingAmount);
        require!(
            amount <= project.treasury_balance,
            ErrorCode::WithdrawalExceedsBalance
        );

        // Transfer SOL from project PDA to recipient
        **ctx.accounts.project.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += amount;

        // Update treasury balance
        let project_mut = &mut ctx.accounts.project;
        project_mut.treasury_balance = project_mut
            .treasury_balance
            .checked_sub(amount)
            .ok_or(ErrorCode::WithdrawalExceedsBalance)?;

        msg!("Withdrew {} lamports to {:?}", amount, ctx.accounts.recipient.key());
        Ok(())
    }
}

// Validation helper function
fn validate_addresses(addrs: &[Pubkey]) -> Result<()> {
    for (i, addr) in addrs.iter().enumerate() {
        require!(*addr != Pubkey::default(), ErrorCode::ZeroAddress);
        // Check for duplicates
        for other_addr in &addrs[i+1..] {
            require!(addr != other_addr, ErrorCode::DuplicateAddress);
        }
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeProject<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Project::INIT_SPACE,
        seeds = [b"project", name.as_bytes(), creator.key().as_ref()],
        bump
    )]
    pub project: Account<'info, Project>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTaskCompletion<'info> {
    #[account(mut)]
    pub project: Account<'info, Project>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FundTreasury<'info> {
    #[account(mut)]
    pub project: Account<'info, Project>,

    #[account(mut)]
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub project: Account<'info, Project>,

    pub authority: Signer<'info>,

    /// CHECK: Recipient can be any address (admin's responsibility)
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Project {
    #[max_len(50)]
    pub name: String,
    pub creator: Pubkey,
    #[max_len(10)]
    pub admins: Vec<Pubkey>,
    #[max_len(50)]
    pub members: Vec<Pubkey>,
    pub github_enabled: bool,
    pub jira_enabled: bool,
    pub created_at: i64,
    pub tasks_completed: u8,
    pub total_tasks: u8,
    pub treasury_balance: u64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid task count: cannot exceed total tasks")]
    InvalidTaskCount,
    #[msg("Project name cannot be empty")]
    EmptyProjectName,
    #[msg("Project name exceeds maximum length of 50 characters")]
    NameTooLong,
    #[msg("Admin list cannot be empty")]
    NoAdmins,
    #[msg("Admin list exceeds maximum of 10 entries")]
    TooManyAdmins,
    #[msg("Member list exceeds maximum of 50 entries")]
    TooManyMembers,
    #[msg("Duplicate addresses not allowed")]
    DuplicateAddress,
    #[msg("Zero address not allowed")]
    ZeroAddress,
    #[msg("Creator must be in admins list")]
    CreatorNotInAdmins,
    #[msg("Unauthorized: only admins can perform this action")]
    Unauthorized,
    #[msg("Invalid funding amount: must be greater than 0")]
    InvalidFundingAmount,
    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,
    #[msg("Withdrawal amount exceeds available balance")]
    WithdrawalExceedsBalance,
    #[msg("Only admins can withdraw funds")]
    UnauthorizedWithdrawal,
}
