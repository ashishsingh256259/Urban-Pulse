# Security Rules Specification & Threat Modeling

This document maps out the Attribute-Based Access Control (ABAC) rules and data invariants securing the UrbanPulse Guardian AI platform.

## 1. Data Invariants

1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created and parsed if `{userId}` corresponds exactly to `request.auth.uid`. A user cannot alter their assigned `role` ("citizen" vs "admin").
2. **Report Attribution Invariant**: A report doc at `/reports/{reportId}` must possess a `reporterEmail` matching the authenticated user's email.
3. **Immutability of Key Audit Records**: Fields like `createdAt`, `id`, and `reporterEmail` on a Report can never be updated after creation.
4. **Advisory Lockdown**: Client SDKs cannot change or spoof `aiAnalysis` scores or analysis payloads.
5. **Private Status Modifications**: Only authenticated administrative personnel can change report `assignedTo` or reassign status, except for dispatch operations matching approved rules.

---

## 2. The "Dirty Dozen" Anti-Security Payload Threats

These are 12 specific hostile payloads compiled to test rule validations. Every single one of these MUST yield a `PERMISSION_DENIED` result:

| ID | Targeted Vulnerability | Threat Payload Design | Result |
|----|------------------------|-----------------------|--------|
| T01 | Privilege Escalation | `{ id: "u123", role: "admin", email: "user@gmail.com" }` written by non-admin authenticated as "u123" | Rejected |
| T02 | Identity Spoofing | Creating a report with `reporterEmail: "vance@urbanpulse.gov"` while authenticated as `victim@gmail.com` | Rejected |
| T03 | Orphaned Record | Report created with an invalid or malicious category `{ category: "Cyber Attack" }` | Rejected |
| T04 | Value Poisoning | Setting a severity score to `-505` or `1000000000` | Rejected |
| T05 | Resource Poisoning | Reporting an incident with a `title` containing 500KB of junk characters (DoS-attack on wallet) | Rejected |
| T06 | Ghost Fields | Attempting a shadow update with extra fields like `{ isSystemVerified: true }` | Rejected |
| T07 | Immutable Bypass | Modifying the `createdAt` timestamp of a live ticket to a historical timestamp | Rejected |
| T08 | Cross-tenant Sniffing | A user attempting to read private system notifications meant for `admin@urbanpulse.gov` | Rejected |
| T09 | Spoofed History Log | Directly injecting a state history entry under `/history/{histId}` with forged `updatedBy` credentials | Rejected |
| T10 | Status Step Skipping | A standard citizen directly changing a ticket status to `Resolved` | Rejected |
| T11 | Air-gapped AI Tampering | Standard citizens trying to write or modify `aiAnalysis` contents | Rejected |
| T12 | Missing Required Keys | Submitting a report that lacks `latitude` or `longitude` coordinates | Rejected |

---

## 3. Threat Model Verification Setup (`firestore.rules.test.ts`)

A mock test suite blueprint verifying that all security rules successfully deny these malicious vectors.
