// Creates (or resets) the OWNER account. Run with:  npm run admin:create
import readline from "node:readline";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.startsWith(question)) process.stdout.write(s);
        else if (!/[\r\n]/.test(s)) process.stdout.write("*");
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const db = new PrismaClient();

try {
  const email = (await ask("Owner email: ")).toLowerCase();
  const name = (await ask("Your name: ")) || "Owner";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That is not a valid email address.");

  const password = await ask("Password (at least 10 characters): ", true);
  const again = await ask("Type the password again: ", true);
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  if (password !== again) throw new Error("The two passwords did not match.");

  const passwordHash = hashPassword(password);
  await db.adminUser.upsert({
    where: { email },
    update: { name, role: "OWNER", passwordHash, active: true, failedLogins: 0, lockedUntil: null },
    create: { email, name, role: "OWNER", passwordHash },
  });
  console.log(`\nDone. Owner account ready for ${email}. Sign in at /admin/login`);
} catch (e) {
  console.error("\nCould not create the account:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
