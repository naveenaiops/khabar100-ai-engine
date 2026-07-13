# Contributing to Khabar100 2.0

Thank you for your interest in contributing to Khabar100 2.0! We welcome contributions to improve our UPSC active-recall and daily MCQ generation engine.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. **Fork the Repository**: Create a personal fork on GitHub.
2. **Clone Locally**: 
   ```bash
   git clone https://github.com/your-username/khabar100.git
   cd khabar100
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Setup Environment**:
   - Copy `.env.example` to `.env.local`
   - Config details are available in the [Local Installation Guide](docs/Installation.md).
5. **Run Locally**:
   ```bash
   npm run dev
   ```

## Development Guidelines

- **TypeScript Type-Safety**: Ensure all code compiles cleanly with no implicit `any` definitions.
- **Linting & Formatting**: Follow existing styles and run formatting before proposing changes.
- **Secure Handling of Secrets**: Never hardcode API keys, credentials, or private URLs in code. Always retrieve secrets from environmental variables (`process.env`).
- **Tests**: Write and verify tests where applicable. Run a complete compilation test before making a pull request:
  ```bash
  npm run build
  ```

## Submitting Pull Requests

1. Create a descriptive branch (e.g., `feature/syllabus-indexing` or `fix/payments-sandbox`).
2. Implement your changes.
3. Commit with clear, atomic commit messages.
4. Push to your fork and submit a Pull Request to our main branch.
