# Contributing

Contributions are welcome! Here's how to get started.

## Development Setup

1. Fork and clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the env template:
   ```bash
   cp .env.example .env
   ```
4. Fill in your LinkedIn app credentials in `.env`

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run server in dev mode (tsx, hot reload) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run typecheck` | Type check without emitting files |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `make check` | Run typecheck + tests (pre-commit check) |

## Project Structure

```
src/
  index.ts              Entry point, dependency injection
  server.ts             MCP server, tool registration
  config/               Environment config, LinkedIn API constants
  auth/                 OAuth 2.0 flow, token storage
  api/                  LinkedIn REST client, rate limiter, retry
  tools/                One file per MCP tool
  services/             Content formatting, media handling, scheduling
  models/               Zod schemas, error types
  utils/                Logger, crypto, ID generation
tests/
  auth/                 Auth system tests
  api/                  API client tests
  services/             Service tests
  fixtures/             Test data
```

## Code Guidelines

### File Size

No file should exceed 250 lines. If it does, split it.

### One File, One Responsibility

Each file handles one concern. Tools are in separate files. Services are in separate files.

### Zod Everywhere

- All tool inputs are validated with Zod schemas
- All LinkedIn API responses are validated with Zod schemas
- All environment variables are validated with Zod schemas

### Error Handling

- All errors extend `LinkedInMCPError`
- Error messages are actionable (tell the user what to do)
- Tool handlers catch errors and return `{ isError: true, content: [...] }`

### No Hardcoded Values

- API URLs, version strings, headers go in `src/config/linkedin-api.ts`
- Environment config goes in `src/config/env.ts`
- No magic strings in tool handlers or services

### Logs to stderr

When using stdio transport, all logs MUST go to stderr. stdout is reserved for MCP JSON-RPC messages.

## Testing

Tests use Vitest with MSW (Mock Service Worker) for HTTP mocking.

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
```

### Writing Tests

- Mirror the source file structure in `tests/`
- Use MSW to mock LinkedIn API responses
- Test happy paths and error scenarios
- Don't mock internal modules -- test through the real code path

### Test Pattern

```typescript
describe("featureName", () => {
  it("does the expected thing", async () => {
    // happy path
  });

  it("handles invalid input", async () => {
    // validation
  });

  it("handles API errors", async () => {
    // error scenario with MSW override
  });
});
```

## Pre-Commit Checklist

Before submitting a PR, run:

```bash
make check
```

This runs:
- `npx tsc --noEmit` (type check)
- `npx vitest run` (tests)

Also verify:
- [ ] No hardcoded credentials
- [ ] No `console.log` statements
- [ ] All new code has tests
- [ ] No file exceeds 250 lines
- [ ] Error messages are helpful

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `make check` and fix any issues
4. Write a clear PR description with:
   - What changed and why
   - How to test it
5. Submit the PR

## Adding a New Tool

1. Create `src/tools/your-tool.tool.ts` following the existing pattern
2. Export the schema and handler
3. Register it in `src/server.ts`
4. Add it to `src/tools/index.ts`
5. Write tests in `tests/tools/your-tool.test.ts`
6. Update the wiki [Tools Reference](Tools-Reference.md)

## Reporting Issues

[Open an issue](https://github.com/supersaiyane/linkedinMCP/issues) with:
- What you expected to happen
- What actually happened
- Error messages (if any)
- Steps to reproduce
- Node.js version and OS
