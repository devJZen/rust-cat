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

        Ok(())
    }

    pub fn update_task_completion(
        ctx: Context<UpdateTaskCompletion>,
        tasks_completed: u8,
    ) -> Result<()> {
        let project = &mut ctx.accounts.project;

        require!(
            tasks_completed <= project.total_tasks,
            ErrorCode::InvalidTaskCount
        );

        project.tasks_completed = tasks_completed;

        Ok(())
    }
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
    #[account(
        mut,
        has_one = creator,
    )]
    pub project: Account<'info, Project>,

    pub creator: Signer<'info>,
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
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid task count: cannot exceed total tasks")]
    InvalidTaskCount,
}
