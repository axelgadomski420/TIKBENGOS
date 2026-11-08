# BENGOS Pluter worker

Pluter is the server-side AI orchestration service used by the existing Django assistant API. It accepts authenticated jobs, calls an OpenAI-compatible chat-completions provider configured by the operator, and reports the result through the API's authenticated job callback. Provider credentials remain server-side; end users do not need API keys.

The worker can use Tavily search for prompts asking for current information. Search is enabled only when `TAVILY_API_KEY` is configured. Search results are treated as untrusted context, and source URLs are included for citations. Without Tavily, Pluter still handles ordinary text and code questions, but does not claim to have searched the web.

## Configure

Set these values in the root `.env` used by Docker Compose:

| Variable | Required | Description |
|---|---:|---|
| `BENGOS_WORKER_TOKEN` | Yes | Shared secret for API dispatch and result callbacks |
| `PLUTER_API_KEY` | For model answers | Server-side key for the configured model provider |
| `PLUTER_API_BASE_URL` | No | OpenAI-compatible API base; defaults to `https://api.openai.com/v1` |
| `PLUTER_MODEL` | For model answers | Model identifier accepted by the provider |
| `TAVILY_API_KEY` | No | Enables web search for current-information prompts |

The worker starts without a provider key so its health endpoint and deployment can be checked; actual assistant jobs fail with a clear provider-configuration error until a key and model are configured. No canned or simulated model responses are returned.

## Run with Docker Compose

The development and production Compose files include `ai-worker`. After setting the server-side model credentials and a strong shared worker token, start the usual stack. The API dispatches jobs to `http://ai-worker:8092/jobs`, and the worker posts results back to the API over the private Compose network.

## Run tests

```bash
python -m unittest discover -s services/ai-worker -p 'test_*.py'
```
