# AI Integration Research

## Result

Auto-tagging has since shipped (`feature/ai-auto-tagging`). The model named in this research prompt below, **"GPT-6 Astra,"** was investigated in `docs/ai-integration-plan.md` §2 and flagged as unverifiable and likely steering toward an unnecessarily expensive flagship model for these lightweight, non-agentic tasks — it was never used. The model that actually shipped is **`gpt-5.6-luna`** (`OPENAI_MODEL` env var, `src/lib/openai.ts`), also unverified against training data when chosen, but confirmed genuinely real and working via live end-to-end testing (real OpenAI API calls returning correct, relevant tag suggestions). See `docs/ai-integration-plan.md`'s top callout and §2c for the full resolution, and `context/current-feature.md`'s History for implementation details.

## Output

docs/ai-integration-plan.md

## Research

Investigate best practices for integrating the OpenAI "GPT-6 Astra" model into a Next.js application for the following features:

- Auto-tagging content
- AI-generated summaries
- Code explanation
- Prompt optimization

## Include

- OpenAI SDK setup and configuration
- Server action patterns for AI calls
- Streaming vs non-streaming responses
- Error handling and rate limiting
- Pro user gating patterns
- Cost optimization strategies
- UI patterns for AI features (loading states, accept/reject suggestions)
- Security considerations (API key handling, input sanitization)

## Sources

- Web search for OpenAI + Next.js patterns
- Context7 docs for OpenAI SDK
- Existing codebase patterns (server actions, Pro gating)
- @src/actions/\*.ts for action patterns
- @src/lib/usage-limits.ts for gating patterns
