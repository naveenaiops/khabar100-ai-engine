# Changelog

All notable changes to the **Khabar100 2.0** public portfolio project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-sandbox] - 2026-07-13

### Added
- Created the **Khabar100 2.0 Public Portfolio Edition** from the internal production repository.
- Added **Automated Sandbox Mock Fallbacks** across all server-side API endpoints:
  - OpenRouter completion fallbacks for local UPSC MCQ generation.
  - Gemini text-embedding-004 unit vector mathematical fallbacks.
  - Razorpay order creation and webhook verification mock bypass hooks.
  - Isolated database try-catch blocks to prevent server-side crashes when Supabase is unconfigured.
- Added complete **Technical Documentation Architecture suite** under `/docs` with detailed Mermaid diagrams.
- Added comprehensive `.env.example` configurations.
- Added root-level open-source files: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.

### Removed
- **CRITICAL SECURITY SCRUBBING**: Removed all hardcoded third-party API credentials, internal private production deployment configuration files (`.env.local`, `.env.production`), and payment signing secrets.
