#!/usr/bin/env node
/**
 * Script to create a super admin user
 * Usage: npx tsx scripts/create-super-admin.ts <email> <password> [full_name]
 */

import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load environment variables from multiple possible locations
const possibleEnvPaths = [
  resolve(__dirname, "../../../../.env"),  // From apps/api/scripts/ to root
  resolve(__dirname, "../../../.env"),      // From apps/api/scripts/ to apps/
  resolve(process.cwd(), ".env"),           // Current working directory
  resolve(process.cwd(), "../../.env"),     // Parent of cwd
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.log("Warning: No .env file found. Using default connection values.");
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function createSuperAdmin() {
  const args = process.argv.slice(2);
  const forceUpdate = args.includes("--force");
  const positionalArgs = args.filter(a => !a.startsWith("--"));
  const email = positionalArgs[0];
  const password = positionalArgs[1];
  const fullName = positionalArgs[2] || "Super Administrator";

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-super-admin.ts <email> <password> [full_name]");
    console.error("Example: npx tsx scripts/create-super-admin.ts admin@mycompany.com SecurePass123 'John Doe'");
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("Error: Invalid email format");
    process.exit(1);
  }

  // Validate password length
  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters");
    process.exit(1);
  }

  // Debug: Show connection config (without password)
  const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE || "pmexam",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD ? "***" : "(empty)",
  };
  console.log("\nDatabase connection config:");
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  Password: ${dbConfig.password}\n`);

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE || "pmexam",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    connectionLimit: 5,
  });

  try {
    const passwordHash = await hashPassword(password);

    // Check if user already exists
    const [existingRows] = await pool.query(
      "SELECT id, role FROM users WHERE email = ?",
      [email]
    );

    const existing = (existingRows as mysql.RowDataPacket[])[0];

    if (existing) {
      if (existing.role === "super_admin" && !forceUpdate) {
        console.log(`User ${email} is already a super admin.`);
        console.log(`Use --force flag to update password: npx tsx scripts/create-super-admin.ts ${email} ${password} '${fullName}' --force`);
        process.exit(0);
      }

      // Update existing user to super_admin (and update password)
      await pool.query(
        "UPDATE users SET role = 'super_admin', full_name = ?, password_hash = ? WHERE id = ?",
        [fullName, passwordHash, existing.id]
      );
      console.log(forceUpdate 
        ? `Updated password for ${email} (role: super_admin).` 
        : `Updated existing user ${email} to super admin.`);
    } else {
      // Create new super admin
      await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, 'super_admin', 'active')`,
        [email, passwordHash, fullName]
      );
      console.log(`Created new super admin: ${email}`);
    }

    console.log("\nSuper admin credentials:");
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: super_admin`);
    console.log("\nYou can now log in at /admin/login");

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error("\nError: Cannot connect to MySQL database.");
      console.error("Please check:");
      console.error("  1. MySQL server is running");
      console.error("  2. MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD are correct in .env");
      console.error("\nCurrent .env location tried:", possibleEnvPaths.find(p => existsSync(p)) || "(not found)");
    } else {
      console.error("Error creating super admin:", error.message || error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
