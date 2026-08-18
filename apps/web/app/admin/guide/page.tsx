"use client";

import Link from "next/link";
import { useState } from "react";

const PRIMARY = "#E8792B";

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const sections: GuideSection[] = [
    {
      id: "overview",
      title: "Getting Started",
      icon: "bi-rocket-takeoff",
      content: (
        <>
          <h2>Welcome to the Admin System</h2>
          <p className="lead">
            This guide helps you manage the PM Exam Prep Platform efficiently. The admin panel 
            is organized into logical sections accessible from the left sidebar.
          </p>
          
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Quick Tip:</strong> Click on any section header in the sidebar to collapse/expand it. 
            Your preference is saved automatically.
          </div>

          <h4>Navigation Overview</h4>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title"><i className="bi bi-speedometer2 me-2 text-primary"></i>Overview</h6>
                  <p className="card-text small text-muted">Dashboard metrics and platform reports</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title"><i className="bi bi-box-seam me-2 text-primary"></i>Catalog</h6>
                  <p className="card-text small text-muted">Exams, tests, questions, and content management</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title"><i className="bi bi-people me-2 text-primary"></i>Users & Sales</h6>
                  <p className="card-text small text-muted">User management, orders, vouchers, and referrals</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title"><i className="bi bi-sliders me-2 text-primary"></i>System</h6>
                  <p className="card-text small text-muted">Settings, sessions, and audit logs</p>
                </div>
              </div>
            </div>
          </div>

          <h4 className="mt-4">User Roles</h4>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th>Access Level</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>super_admin</code></td>
                <td>Full system access, can manage other admins</td>
                <td>All sections</td>
              </tr>
              <tr>
                <td><code>admin</code></td>
                <td>Standard administrator with full management access</td>
                <td>All sections</td>
              </tr>
              <tr>
                <td><code>content_admin</code></td>
                <td>Manages exams, tests, and questions only</td>
                <td>Catalog section</td>
              </tr>
              <tr>
                <td><code>support_admin</code></td>
                <td>View-only access for support purposes</td>
                <td>Read-only access</td>
              </tr>
            </tbody>
          </table>
        </>
      ),
    },
    {
      id: "dashboard",
      title: "Dashboard",
      icon: "bi-speedometer2",
      content: (
        <>
          <h2>Dashboard</h2>
          <p>
            The Dashboard provides a quick overview of your platform's health and recent activity. 
            Access it by clicking <strong>Overview → Dashboard</strong> in the sidebar.
          </p>

          <h4>Statistics Cards</h4>
          <ul>
            <li><strong>Revenue (USD):</strong> Total revenue from all orders</li>
            <li><strong>Active Subscriptions:</strong> Currently active user subscriptions</li>
            <li><strong>Expiring Soon:</strong> Subscriptions expiring within 7 days</li>
            <li><strong>Failed Payments:</strong> Orders with payment issues</li>
            <li><strong>Recent Login Attempts:</strong> Recent authentication activity</li>
            <li><strong>Total Questions:</strong> Total questions in the database</li>
          </ul>

          <h4>Quick Actions</h4>
          <p>Common tasks available from the dashboard:</p>
          <ul>
            <li>Add a new user account</li>
            <li>Create a voucher code</li>
            <li>Upload questions via CSV</li>
            <li>View recent orders</li>
          </ul>

          <h4>Recent Activity</h4>
          <p>The dashboard displays recent orders and audit logs to help you stay informed about platform activity.</p>
        </>
      ),
    },
    {
      id: "products",
      title: "Exams (Products)",
      icon: "bi-box-seam",
      content: (
        <>
          <h2>Managing Exams (Products)</h2>
          <p>
            Exams are the main products users purchase. Each exam contains multiple tests and questions. 
            Navigate to <strong>Catalog → Exams</strong> to manage them.
          </p>

          <h4>Creating an Exam</h4>
          <ol>
            <li>Click the <strong>Create Exam</strong> button</li>
            <li>Fill in the required fields:
              <ul>
                <li><strong>Title:</strong> Display name (e.g., "PMP Certification Prep")</li>
                <li><strong>Slug:</strong> URL-friendly identifier (e.g., "pmp-cert-prep")</li>
                <li><strong>Description:</strong> Marketing description shown to users</li>
                <li><strong>Price (USD):</strong> Price in Malaysian Ringgit</li>
                <li><strong>Access Days:</strong> How many days users have access</li>
              </ul>
            </li>
            <li>Click <strong>Create</strong> to save</li>
          </ol>

          <h4>Managing Exam Visibility</h4>
          <p>Each exam can have one of these visibility states:</p>
          <ul>
            <li><span className="badge bg-success">Published</span> - Visible and purchasable</li>
            <li><span className="badge bg-secondary">Archived</span> - Hidden from store but existing users keep access</li>
          </ul>
          <p>Use the toggle button to change visibility.</p>

          <h4>Viewing Tests in an Exam</h4>
          <p>Click the <strong>View Tests</strong> button on any exam to see its associated tests. This navigates to the Tests tab with the exam filter pre-selected.</p>
        </>
      ),
    },
    {
      id: "tests",
      title: "Tests",
      icon: "bi-journal-text",
      content: (
        <>
          <h2>Managing Tests</h2>
          <p>
            Tests are containers for questions. Each test belongs to an exam and can have multiple questions. 
            Navigate to <strong>Catalog → Tests</strong> to manage them.
          </p>

          <h4>Creating a Test</h4>
          <ol>
            <li>Click <strong>Create Test</strong></li>
            <li>Select the parent <strong>Exam</strong> from the dropdown</li>
            <li>Enter the <strong>Title</strong> (e.g., "PMP Practice Exam 1")</li>
            <li>Choose a <strong>Mode</strong>:
              <ul>
                <li><strong>practice:</strong> Users see answers after each question</li>
                <li><strong>exam:</strong> Timed, answers shown only at the end</li>
                <li><strong>study:</strong> No scoring, educational mode</li>
              </ul>
            </li>
            <li>Set the <strong>Time Limit</strong> (in minutes, 0 for no limit)</li>
            <li>Click <strong>Create</strong></li>
          </ol>

          <h4>Test List Views</h4>
          <p>Toggle between:</p>
          <ul>
            <li><strong>List View:</strong> Compact table format</li>
            <li><strong>Card View:</strong> Visual cards with exam colors</li>
          </ul>

          <h4>Bulk Operations</h4>
          <p>Select multiple tests using checkboxes to:</p>
          <ul>
            <li><strong>Publish Selected:</strong> Make tests active</li>
            <li><strong>Unpublish Selected:</strong> Make tests inactive</li>
          </ul>

          <h4>Managing Test Questions</h4>
          <p>Click <strong>View Questions</strong> on any test to see its questions. This navigates to the Questions tab with both the exam and test filters pre-selected.</p>

          <h4>Test Status</h4>
          <ul>
            <li><span className="badge bg-success">Active</span> - Test is published and available</li>
            <li><span className="badge bg-secondary">Inactive</span> - Test is hidden from users</li>
          </ul>
        </>
      ),
    },
    {
      id: "questions",
      title: "Questions",
      icon: "bi-question-circle",
      content: (
        <>
          <h2>Managing Questions</h2>
          <p>
            Questions are the core content of your tests. Navigate to <strong>Catalog → Questions</strong> 
            to create, edit, and manage questions.
          </p>

          <h4>Question Types</h4>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Use Case</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>single_choice</code></td>
                <td>One correct answer from multiple options</td>
                <td>Standard multiple choice</td>
              </tr>
              <tr>
                <td><code>multiple_response</code></td>
                <td>Multiple correct answers possible</td>
                <td>Select all that apply</td>
              </tr>
              <tr>
                <td><code>true_false</code></td>
                <td>Binary true/false question</td>
                <td>Fact verification</td>
              </tr>
            </tbody>
          </table>

          <h4>Creating a Question</h4>
          <ol>
            <li>Click <strong>Add Question</strong></li>
            <li>Select the <strong>Product (Exam)</strong> and <strong>Test</strong></li>
            <li>Choose <strong>Question Type</strong></li>
            <li>Enter the <strong>Prompt</strong> (the question text)</li>
            <li>Add <strong>Answer Options</strong>:
              <ul>
                <li>For single choice: mark one option as correct</li>
                <li>For multiple response: mark all correct options</li>
              </ul>
            </li>
            <li>Add optional <strong>Explanation</strong> (shown after answering)</li>
            <li>Set <strong>Difficulty</strong>: Easy, Medium, or Hard</li>
            <li>Assign <strong>ECO Domain</strong> and <strong>Performance Domain</strong></li>
            <li>Click <strong>Save</strong></li>
          </ol>

          <h4>CSV Import</h4>
          <p>Bulk import questions using CSV files:</p>
          <ol>
            <li>Click <strong>Import CSV</strong></li>
            <li>Select the target <strong>Exam</strong></li>
            <li>Upload or paste CSV content</li>
            <li>Review the preview</li>
            <li>Click <strong>Import</strong></li>
          </ol>

          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>CSV Format:</strong> The parser is flexible with column order. Required columns include 
            <code>prompt</code>, <code>correctAnswer</code>, and <code>optionA-D</code>. 
            See the CSV Import Guide for details.
          </div>

          <h4>Filters</h4>
          <p>Use the filter toolbar to find questions by:</p>
          <ul>
            <li>Product (Exam)</li>
            <li>Test</li>
            <li>Question Type</li>
            <li>Status (Published/Unpublished)</li>
            <li>ECO Domain</li>
            <li>Performance Domain</li>
            <li>Difficulty</li>
          </ul>

          <h4>Bulk Operations</h4>
          <p>Select questions using checkboxes to:</p>
          <ul>
            <li><strong>Publish Selected</strong> - Make questions available</li>
            <li><strong>Unpublish Selected</strong> - Hide questions</li>
            <li><strong>Delete Selected</strong> - Remove questions permanently</li>
          </ul>
        </>
      ),
    },
    {
      id: "domains",
      title: "ECO & Performance Domains",
      icon: "bi-diagram-3",
      content: (
        <>
          <h2>Managing Domains</h2>
          <p>
            Domains help categorize questions for analytics and study planning. 
            Navigate to <strong>Catalog → ECO Domains</strong> or <strong>Performance Domains</strong>.
          </p>

          <h4>ECO Domains</h4>
          <p>ECO (Exam Content Outline) Domains represent the main knowledge areas of the exam.</p>
          <p><strong>Actions:</strong></p>
          <ul>
            <li>Create new domain with name and description</li>
            <li>Edit existing domains</li>
            <li>Delete unused domains</li>
          </ul>

          <h4>Performance Domains</h4>
          <p>Performance Domains categorize questions by skill or competency area.</p>
          <p><strong>Actions:</strong></p>
          <ul>
            <li>Create new domain</li>
            <li>Edit or delete existing domains</li>
          </ul>

          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Note:</strong> Deleting a domain that is assigned to questions may cause issues. 
            Reassign questions before deleting domains.
          </div>
        </>
      ),
    },
    {
      id: "users",
      title: "Users",
      icon: "bi-people",
      content: (
        <>
          <h2>Managing Users</h2>
          <p>
            The Users section allows you to manage user accounts, roles, and access. 
            Navigate to <strong>Users & Sales → Users</strong>.
          </p>

          <h4>User Roles</h4>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Role</th>
                <th>Access</th>
                <th>Typical Use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>student</code></td>
                <td>Platform access only</td>
                <td>Regular exam takers</td>
              </tr>
              <tr>
                <td><code>content_admin</code></td>
                <td>Content management</td>
                <td>Content creators</td>
              </tr>
              <tr>
                <td><code>support_admin</code></td>
                <td>Read-only admin access</td>
                <td>Customer support staff</td>
              </tr>
              <tr>
                <td><code>admin</code></td>
                <td>Full admin access</td>
                <td>Platform administrators</td>
              </tr>
            </tbody>
          </table>

          <h4>Creating a User</h4>
          <ol>
            <li>Click <strong>Add User</strong></li>
            <li>Enter <strong>Email</strong> and <strong>Full Name</strong></li>
            <li>Set a <strong>Password</strong> (or leave blank to auto-generate)</li>
            <li>Select <strong>Role</strong></li>
            <li>Optional: Set <strong>Access Days</strong> and enroll in a <strong>Product</strong></li>
            <li>Check <strong>Send welcome email</strong> if desired</li>
            <li>Click <strong>Create User</strong></li>
          </ol>

          <h4>Bulk Import</h4>
          <p>Import multiple users via CSV:</p>
          <ol>
            <li>Click <strong>Bulk Import</strong></li>
            <li>Prepare CSV with columns: <code>email, fullName, password?, productSlug?, accessDays?</code></li>
            <li>Paste CSV content</li>
            <li>Click <strong>Preview</strong> to validate</li>
            <li>Click <strong>Apply Import</strong> to create users</li>
          </ol>

          <h4>Managing Users</h4>
          <p><strong>Change Role:</strong> Select a new role from the dropdown. You'll be prompted for a reason (logged in audit).</p>
          <p><strong>Suspend/Activate:</strong> Toggle the status button. Requires a reason for suspension.</p>
          <p><strong>Filter Users:</strong> Use the search box and filter dropdowns to find specific users.</p>
        </>
      ),
    },
    {
      id: "orders",
      title: "Orders",
      icon: "bi-receipt",
      content: (
        <>
          <h2>Managing Orders</h2>
          <p>
            The Orders section shows all purchases and their status. 
            Navigate to <strong>Users & Sales → Orders</strong>.
          </p>

          <h4>Order Statuses</h4>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge bg-warning">pending</span></td>
                <td>Payment initiated but not completed</td>
              </tr>
              <tr>
                <td><span className="badge bg-success">paid</span></td>
                <td>Payment successful, access granted</td>
              </tr>
              <tr>
                <td><span className="badge bg-danger">failed</span></td>
                <td>Payment failed or was declined</td>
              </tr>
              <tr>
                <td><span className="badge bg-secondary">refunded</span></td>
                <td>Order was refunded</td>
              </tr>
            </tbody>
          </table>

          <h4>Reconciling Orders</h4>
          <p>If a payment issue occurs, you can manually reconcile an order:</p>
          <ol>
            <li>Find the order in the list</li>
            <li>Click <strong>Reconcile</strong></li>
            <li>Enter the new status (<code>paid</code>, <code>failed</code>, or <code>refunded</code>)</li>
            <li>Enter a reason for the change</li>
            <li>The order status will be updated and logged</li>
          </ol>

          <h4>Search and Filter</h4>
          <ul>
            <li><strong>Search:</strong> By order ID, user email, or product title</li>
            <li><strong>Status Filter:</strong> Show only orders with specific status</li>
          </ul>
        </>
      ),
    },
    {
      id: "vouchers",
      title: "Vouchers",
      icon: "bi-ticket-perforated",
      content: (
        <>
          <h2>Managing Vouchers</h2>
          <p>
            Vouchers provide discount codes for users. Navigate to <strong>Users & Sales → Vouchers</strong>.
          </p>

          <h4>Creating a Voucher</h4>
          <ol>
            <li>Click <strong>Create Voucher</strong></li>
            <li>Enter the <strong>Code</strong> (e.g., "WELCOME10")</li>
            <li>Select <strong>Type</strong>:
              <ul>
                <li><strong>Percentage:</strong> Discount percentage (e.g., 10%)</li>
                <li><strong>Fixed:</strong> Fixed amount in USD (e.g., USD 50)</li>
              </ul>
            </li>
            <li>Set the <strong>Amount</strong></li>
            <li>Set <strong>Min Order</strong> (minimum purchase amount, 0 for no minimum)</li>
            <li>Set <strong>Per User Limit</strong> (how many times one user can use it)</li>
            <li>Set <strong>Total Usage Limit</strong> (blank = unlimited)</li>
            <li>Set <strong>Valid Until</strong> date (blank = no expiry)</li>
            <li>Click <strong>Create</strong></li>
          </ol>

          <h4>Bulk Issue</h4>
          <p>Generate multiple unique voucher codes at once:</p>
          <ol>
            <li>Click <strong>Bulk Issue</strong></li>
            <li>Enter a <strong>Prefix</strong> (e.g., "PROMO")</li>
            <li>Set <strong>Count</strong> (max 500)</li>
            <li>Configure type, amount, and expiry</li>
            <li>Click <strong>Issue Codes</strong></li>
          </ol>
          <p>Codes will be generated in format: <code>PREFIX-XXXXXX</code></p>

          <h4>Managing Vouchers</h4>
          <ul>
            <li><strong>Activate/Deactivate:</strong> Toggle voucher status</li>
            <li><strong>Filter:</strong> View All, Active, or Expired vouchers</li>
          </ul>

          <h4>Voucher Statistics</h4>
          <p>The page shows stats for:</p>
          <ul>
            <li>Total vouchers</li>
            <li>Expiring soon (within 7 days)</li>
            <li>Expired vouchers</li>
          </ul>
        </>
      ),
    },
    {
      id: "referrals",
      title: "Referrals",
      icon: "bi-share",
      content: (
        <>
          <h2>Referral Program</h2>
          <p>
            The referral program incentivizes users to invite others. Navigate to <strong>Users & Sales → Referrals</strong>.
          </p>

          <h4>How It Works</h4>
          <ol>
            <li>Every user gets a unique 8-character referral code</li>
            <li>When someone signs up using a referral code and completes their first paid order:</li>
            <li>Both referrer and referee receive a 15% discount voucher (valid 90 days)</li>
          </ol>

          <h4>Dashboard</h4>
          <p>The Referrals page shows:</p>
          <ul>
            <li><strong>Total Codes:</strong> Number of referral codes generated</li>
            <li><strong>Total Redemptions:</strong> Successful referrals</li>
            <li><strong>Total Rewards:</strong> Value of rewards given</li>
            <li><strong>Pending:</strong> Referrals awaiting reward</li>
          </ul>

          <h4>Top Referrers</h4>
          <p>A leaderboard showing users with the most successful referrals.</p>

          <h4>Rewarding Referrals</h4>
          <p>Pending redemptions can be manually rewarded:</p>
          <ol>
            <li>Find the pending redemption in Recent Redemptions</li>
            <li>Click <strong>Reward</strong></li>
            <li>The voucher will be issued to both users</li>
          </ol>
        </>
      ),
    },
    {
      id: "settings",
      title: "Settings",
      icon: "bi-sliders",
      content: (
        <>
          <h2>Platform Settings</h2>
          <p>
            Configure global platform settings. Navigate to <strong>System → Settings</strong>.
          </p>

          <h4>General Settings</h4>
          <ul>
            <li><strong>Support Email:</strong> Contact email displayed to users</li>
            <li><strong>Maintenance Mode:</strong> Enable to show maintenance page to all users</li>
            <li><strong>Maintenance Message:</strong> Custom message shown during maintenance</li>
            <li><strong>Announcements:</strong> System-wide announcements (one per line)</li>
          </ul>

          <h4>Saving Settings</h4>
          <p>Click <strong>Save Settings</strong> to apply changes. Changes take effect immediately.</p>

          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Note:</strong> Payment, Email, and Branding settings tabs are placeholders for future features.
          </div>
        </>
      ),
    },
    {
      id: "audit",
      title: "Audit Log",
      icon: "bi-list-check",
      content: (
        <>
          <h2>Audit Log</h2>
          <p>
            The Audit Log tracks all administrative actions for accountability. 
            Navigate to <strong>System → Audit Log</strong>.
          </p>

          <h4>What Gets Logged</h4>
          <ul>
            <li>User role changes</li>
            <li>User status changes (suspend/activate)</li>
            <li>Order reconciliations</li>
            <li>Content modifications</li>
            <li>Settings changes</li>
          </ul>

          <h4>Log Entry Format</h4>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Field</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Timestamp</td>
                <td>When the action occurred</td>
              </tr>
              <tr>
                <td>Action</td>
                <td>Type of action performed</td>
              </tr>
              <tr>
                <td>Actor</td>
                <td>Who performed the action</td>
              </tr>
              <tr>
                <td>Entity</td>
                <td>What was affected (type and ID)</td>
              </tr>
              <tr>
                <td>Details</td>
                <td>Additional context/payload</td>
              </tr>
            </tbody>
          </table>

          <h4>Filtering</h4>
          <ul>
            <li><strong>Search:</strong> Find by ID, action, actor, or entity</li>
            <li><strong>Action Filter:</strong> Show only specific action types</li>
          </ul>
        </>
      ),
    },
    {
      id: "csv-import",
      title: "CSV Import Guide",
      icon: "bi-filetype-csv",
      content: (
        <>
          <h2>CSV Import Guide</h2>
          <p>
            Bulk import questions using CSV files. This is the fastest way to populate your tests.
          </p>

          <h4>Supported Column Headers</h4>
          <p>The parser recognizes multiple aliases for flexibility:</p>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Field</th>
                <th>Aliases</th>
                <th>Required</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prompt/Question</td>
                <td><code>prompt</code>, <code>question</code>, <code>stem</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Correct Answer</td>
                <td><code>correctAnswer</code>, <code>correct</code>, <code>key</code>, <code>answer</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Explanation</td>
                <td><code>explanation</code>, <code>rationale</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Option A</td>
                <td><code>optionA</code>, <code>choiceA</code>, <code>a</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Option B</td>
                <td><code>optionB</code>, <code>choiceB</code>, <code>b</code></td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Option C</td>
                <td><code>optionC</code>, <code>choiceC</code>, <code>c</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Option D</td>
                <td><code>optionD</code>, <code>choiceD</code>, <code>d</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Option E</td>
                <td><code>optionE</code>, <code>choiceE</code>, <code>e</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>ECO Domain</td>
                <td><code>ecoDomain</code>, <code>knowledgeArea</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Performance Domain</td>
                <td><code>perfDomain</code>, <code>task</code></td>
                <td>No</td>
              </tr>
              <tr>
                <td>Difficulty</td>
                <td><code>difficulty</code></td>
                <td>No</td>
              </tr>
            </tbody>
          </table>

          <h4>Question Type Detection</h4>
          <p>The parser automatically detects question types:</p>
          <ul>
            <li><strong>single_choice:</strong> Default, single correct answer</li>
            <li><strong>multiple_response:</strong> Comma-separated correct answers (e.g., "A,B")</li>
            <li><strong>true_false:</strong> Exactly 2 options (True/False or Yes/No)</li>
          </ul>

          <h4>Sample CSV Format</h4>
          <pre className="bg-light p-3 rounded"><code>{`prompt,optionA,optionB,optionC,optionD,correctAnswer,explanation,ecoDomain,perfDomain,difficulty
What is the primary purpose of a project charter?,To authorize the project,To close the project,To monitor progress,To assign resources,A,The project charter formally authorizes the project and provides authority to apply resources.,Integration,Initiating,Medium
Which are project constraints? (Select all),Scope,Time,Cost,All of the above,D,"Projects are constrained by scope, time, and cost (the triple constraint).",Integration,Planning,Easy`}</code></pre>

          <h4>Important Notes</h4>
          <ul>
            <li>Column order does not matter - headers are used for mapping</li>
            <li>All CSV line endings are supported (Windows, Mac, Unix)</li>
            <li>Quoted fields with commas are handled correctly</li>
            <li>Empty lines are skipped automatically</li>
          </ul>

          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Tip:</strong> Always preview your CSV import to verify the data is parsed correctly before applying.
          </div>
        </>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">
            <i className="bi bi-book me-2"></i>User Guide
          </h1>
          <p className="page-subtitle">
            Comprehensive documentation for the admin system
          </p>
        </div>
        <div className="search-box" style={{ width: 280 }}>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid two-col" style={{ alignItems: "start" }}>
        {/* Sidebar Navigation */}
        <div className="card border-0 shadow-sm" style={{ position: "sticky", top: 24 }}>
          <div className="card-header bg-white">
            <span className="fw-bold">Contents</span>
          </div>
          <div className="list-group list-group-flush">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                className={`list-group-item list-group-item-action d-flex align-items-center ${
                  activeSection === section.id ? "active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <i className={`bi ${section.icon} me-2`}></i>
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            {filteredSections.find((s) => s.id === activeSection)?.content}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-muted small">
        <p>
          Need more help? Contact the development team or refer to the{" "}
          <Link href="/admin/audit">Audit Log</Link> for troubleshooting.
        </p>
      </div>
    </div>
  );
}
