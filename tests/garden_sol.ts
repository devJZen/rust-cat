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
        authority: creator,
      })
      .rpc();

    const projectAccount = await program.account.project.fetch(projectPda);
    assert.equal(projectAccount.tasksCompleted, 42);
  });
});

describe("garden_sol - Security Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GardenSol as Program<GardenSol>;
  const creator = provider.wallet.publicKey;

  it("Rejects empty project name", async () => {
    const projectName = "";
    const admins = [creator];
    const members = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for empty name");
    } catch (err: any) {
      assert.include(err.toString(), "EmptyProjectName");
    }
  });

  it("Rejects project name exceeding 50 characters", async () => {
    const projectName = "A".repeat(51);
    const admins = [creator];
    const members = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName.slice(0, 50)), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for name too long");
    } catch (err: any) {
      assert.include(err.toString(), "NameTooLong");
    }
  });

  it("Rejects empty admins array", async () => {
    const projectName = "Test Empty Admins";
    const admins: PublicKey[] = [];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for empty admins");
    } catch (err: any) {
      assert.include(err.toString(), "NoAdmins");
    }
  });

  it("Rejects more than 10 admins", async () => {
    const projectName = "Test Too Many Admins";
    const admins = Array(11).fill(creator);
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for too many admins");
    } catch (err: any) {
      assert.include(err.toString(), "TooManyAdmins");
    }
  });

  it("Rejects more than 50 members", async () => {
    const projectName = "Test Too Many Members";
    const admins = [creator];
    const members = Array(51).fill(creator);

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for too many members");
    } catch (err: any) {
      assert.include(err.toString(), "TooManyMembers");
    }
  });

  it("Rejects duplicate addresses in admins", async () => {
    const projectName = "Test Duplicate Admins";
    const admins = [creator, creator];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for duplicate addresses");
    } catch (err: any) {
      assert.include(err.toString(), "DuplicateAddress");
    }
  });

  it("Rejects zero address in admins", async () => {
    const projectName = "Test Zero Address";
    const admins = [PublicKey.default, creator];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for zero address");
    } catch (err: any) {
      assert.include(err.toString(), "ZeroAddress");
    }
  });

  it("Rejects when creator is not in admins list", async () => {
    const projectName = "Test Creator Not In Admins";
    const otherUser = anchor.web3.Keypair.generate().publicKey;
    const admins = [otherUser];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeProject(projectName, admins, members, false, false)
        .accounts({
          project: projectPda,
          creator: creator,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error for creator not in admins");
    } catch (err: any) {
      assert.include(err.toString(), "CreatorNotInAdmins");
    }
  });

  it("Rejects update from non-admin", async () => {
    const projectName = "Test Unauthorized Update";
    const admins = [creator];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeProject(projectName, admins, members, false, false)
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Try to update with different user
    const unauthorized = anchor.web3.Keypair.generate();

    // Airdrop some SOL to unauthorized user for tx fees
    const airdropSig = await provider.connection.requestAirdrop(
      unauthorized.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    try {
      await program.methods
        .updateTaskCompletion(50)
        .accounts({
          project: projectPda,
          authority: unauthorized.publicKey,
        })
        .signers([unauthorized])
        .rpc();

      assert.fail("Should have thrown error for unauthorized update");
    } catch (err: any) {
      assert.include(err.toString(), "Unauthorized");
    }
  });

  it("Allows admin to update task completion", async () => {
    const projectName = "Test Admin Can Update";
    const admin2 = anchor.web3.Keypair.generate();

    // Airdrop to admin2
    const airdropSig = await provider.connection.requestAirdrop(
      admin2.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const admins = [creator, admin2.publicKey];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeProject(projectName, admins, members, false, false)
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Admin2 updates task completion
    await program.methods
      .updateTaskCompletion(25)
      .accounts({
        project: projectPda,
        authority: admin2.publicKey,
      })
      .signers([admin2])
      .rpc();

    const projectAccount = await program.account.project.fetch(projectPda);
    assert.equal(projectAccount.tasksCompleted, 25);
  });

  it("Rejects task count exceeding total tasks", async () => {
    const projectName = "Test Task Overflow";
    const admins = [creator];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeProject(projectName, admins, members, false, false)
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .updateTaskCompletion(101) // totalTasks is 100
        .accounts({
          project: projectPda,
          authority: creator,
        })
        .rpc();

      assert.fail("Should have thrown error for invalid task count");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidTaskCount");
    }
  });

  it("Creator can update their own project", async () => {
    const projectName = "Test Creator Update";
    const admins = [creator];
    const members: PublicKey[] = [];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeProject(projectName, admins, members, false, false)
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Creator updates task completion
    await program.methods
      .updateTaskCompletion(75)
      .accounts({
        project: projectPda,
        authority: creator,
      })
      .rpc();

    const projectAccount = await program.account.project.fetch(projectPda);
    assert.equal(projectAccount.tasksCompleted, 75);
  });

  it("Member (non-admin) cannot update task completion", async () => {
    const projectName = "Test Member Cannot Update";
    const member = anchor.web3.Keypair.generate();

    // Airdrop to member
    const airdropSig = await provider.connection.requestAirdrop(
      member.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const admins = [creator];
    const members = [member.publicKey];

    const [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), Buffer.from(projectName), creator.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeProject(projectName, admins, members, false, false)
      .accounts({
        project: projectPda,
        creator: creator,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Member tries to update (should fail)
    try {
      await program.methods
        .updateTaskCompletion(50)
        .accounts({
          project: projectPda,
          authority: member.publicKey,
        })
        .signers([member])
        .rpc();

      assert.fail("Should have thrown error for member trying to update");
    } catch (err: any) {
      assert.include(err.toString(), "Unauthorized");
    }
  });
});
