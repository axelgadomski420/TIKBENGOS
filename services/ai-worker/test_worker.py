import json
import os
import unittest
from unittest.mock import patch

os.environ.setdefault("BENGOS_WORKER_TOKEN", "test-token")

import worker


class PluterWorkerTests(unittest.TestCase):
    @patch.object(worker, "_json_request")
    def test_completion_uses_server_configured_model_and_key(self, request):
        request.return_value = {"choices": [{"message": {"content": "Gotowe."}}]}
        with patch.object(worker, "PLUTER_API_KEY", "server-secret"), patch.object(worker, "PLUTER_MODEL", "model-test"), patch.object(worker, "TAVILY_API_KEY", ""):
            self.assertEqual(worker._completion("Napisz opis", ""), "Gotowe.")
        args, kwargs = request.call_args
        self.assertTrue(args[0].endswith("/chat/completions"))
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer server-secret")
        self.assertEqual(json.loads(json.dumps(args[1]))["model"], "model-test")

    @patch.object(worker, "_json_request")
    def test_current_requests_include_search_sources(self, request):
        request.side_effect = [
            {"results": [{"title": "Źródło", "url": "https://example.com", "content": "Wynik"}]},
            {"choices": [{"message": {"content": "Odpowiedź [1]."}}]},
        ]
        with patch.object(worker, "PLUTER_API_KEY", "key"), patch.object(worker, "PLUTER_MODEL", "model"), patch.object(worker, "TAVILY_API_KEY", "search-key"):
            answer = worker._completion("Podaj aktualne trendy", "")
        self.assertEqual(answer, "Odpowiedź [1].")
        self.assertIn("https://example.com", request.call_args.args[1]["messages"][1]["content"])

    def test_search_intent_is_recognized(self):
        self.assertTrue(worker._needs_web_search("Jakie są aktualne ceny?"))
        self.assertFalse(worker._needs_web_search("Napisz krótkie opowiadanie."))


if __name__ == "__main__":
    unittest.main()
