import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GardenSol } from "../target/types/garden_sol";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("garden_sol", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GardenSol as Program<GardenSol>;
  const creator = provider.wallet.publicKey;

  it("Initializes a project", async () => {
    const projectName = "Test Project";
    const admins = [creator];
    const members = [creator];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        Buffer.from(projectName),
        creator.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initializeProject(
        projectName,
        admins,
        members,
        true, // github_enabled
        true  // jira_enabled
      )
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const projectAccount = await program.account.project.fetch(projectPda);

    assert.equal(projectAccount.name, projectName);
    assert.equal(projectAccount.creator.toString(), creator.toString());
    assert.equal(projectAccount.githubEnabled, true);
    assert.equal(projectAccount.jiraEnabled, true);
    assert.equal(projectAccount.tasksCompleted, 0);
    assert.equal(projectAccount.totalTasks, 100);
  });

  it("Updates task completion", async () => {
    const projectName = "Test Project 2";
    const admins = [creator];
    const members = [creator];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        Buffer.from(projectName),
        creator.toBuffer(),
      ],
      program.programId
    );

    // Initialize project
    await program.methods
      .initializeProject(projectName, admins, members, false, false)
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Update task completion
    await program.methods
      .updateTaskCompletion(42)
      .accounts({
        project: projectPda,
        creator: creator,
      })
      .rpc();

    const projectAccount = await program.account.project.fetch(projectPda);
    assert.equal(projectAccount.tasksCompleted, 42);
  });
});
