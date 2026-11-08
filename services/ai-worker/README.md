# BENGOS Pluter worker

Pluter is the server-side AI orchestration service used by the Django assistant API. It accepts authenticated jobs, calls an OpenAI-compatible chat-completions provider configured by the operator, and reports results through the API's authenticated job callback. Provider credentials remain server-side; end users do not need API keys.

The worker can use Tavily search for prompts asking for current information. Search is enabled only when `TAVILY_API_KEY` is configured. Search results are treated as untrusted context, and source URLs are included for citations. Without Tavily, Pluter still handles text and code questions but does not claim to have searched the web.

## Configure

Set these values in the root `.env` used by Docker Compose:

| Variable | Required | Description |
|---|---:|---|
| `BENGOS_WORKER_TOKEN` | Yes in production | Shared secret for API dispatch and callbacks; generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `PLUTER_API_KEY` | For model answers | Server-side key for the configured model provider |
| `PLUTER_API_BASE_URL` | No | OpenAI-compatible API base; defaults to `https://api.openai.com/v1` |
| `PLUTER_MODEL` | For model answers | Model identifier accepted by the provider |
| `TAVILY_API_KEY` | No | Enables web search for current-information prompts |

Development Compose uses a clearly development-only token when none is set. Replace it for any shared or deployed environment. Production Compose requires an explicit worker token. A worker can start without model credentials to expose health status; actual requests return an explicit configuration error rather than a canned response.

## Run with Docker Compose

The development and production Compose files start `ai-worker` and connect it to the API on the private Compose network. Set the server-side model credentials and a strong shared worker token, then start the normal stack. The API dispatches jobs to `http://ai-worker:8092/jobs`, and the worker posts results back to the API.

## Run tests

```bash
python -m unittest discover -s services/ai-worker -p 'test_*.py'
```
