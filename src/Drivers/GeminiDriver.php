<?php

namespace ShibuJ\AiChatAssistant\Drivers;

use Illuminate\Support\Facades\Http;
use ShibuJ\AiChatAssistant\Contracts\AiDriver;

class GeminiDriver implements AiDriver
{
    public function __construct(protected array $config) {}

    public function converse(
        string $systemPrompt,
        array $tools,
        array $history,
        string $userMessage,
        callable $onToolCall
    ): string {
        $contents = [];
        foreach ($history as $m) {
            $contents[] = [
                'role' => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $userMessage]]];

        for ($i = 0; $i < 6; $i++) { // hard cap on tool round-trips
            $res = $this->call([
                'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
                'tools' => [['functionDeclarations' => $this->declarations($tools)]],
                'contents' => $contents,
                'generationConfig' => ['maxOutputTokens' => $this->config['max_output_tokens'] ?? 1024],
            ]);

            if (!$res->successful()) {
                \Log::error('AiChatAssistant: Gemini call failed', [
                    'status' => $res->status(), 'body' => $res->body(),
                ]);
                return 'Sorry, I\'m having trouble right now. Please try again in a moment.';
            }

            $candidate = $res->json('candidates.0');
            $parts = $candidate['content']['parts'] ?? [];
            $calls = collect($parts)->filter(fn ($p) => isset($p['functionCall']));

            if ($calls->isEmpty()) {
                return collect($parts)
                    ->reject(fn ($p) => !empty($p['thought']))
                    ->pluck('text')
                    ->filter()
                    ->implode("\n") ?: 'Sorry, I couldn\'t come up with an answer.';
            }

            $modelContent = $candidate['content'];
            foreach ($modelContent['parts'] as &$p) {
                if (isset($p['functionCall']) && empty($p['functionCall']['args'])) {
                    $p['functionCall']['args'] = new \stdClass(); // Gemini rejects [] here
                }
            }
            unset($p);
            $contents[] = $modelContent;

            $responses = [];
            foreach ($calls as $p) {
                $fc = $p['functionCall'];
                $responses[] = [
                    'functionResponse' => [
                        'name' => $fc['name'],
                        'response' => ['result' => $onToolCall($fc['name'], $fc['args'] ?? [])],
                    ],
                ];
            }
            $contents[] = ['role' => 'user', 'parts' => $responses];
        }

        return 'Sorry, I couldn\'t finish that request. Could you rephrase it?';
    }

    protected function declarations(array $tools): array
    {
        return collect($tools)->map(function ($t) {
            $decl = ['name' => $t['name'], 'description' => $t['description']];
            if (!empty((array) ($t['input_schema']['properties'] ?? []))) {
                $decl['parameters'] = $t['input_schema'];
            }
            return $decl;
        })->all();
    }

    protected function call(array $payload)
    {
        $models = array_filter([$this->config['model'] ?? null, $this->config['fallback_model'] ?? null]);
        $res = null;

        foreach ($models as $model) {
            $res = Http::withHeaders(['x-goog-api-key' => $this->config['key']])
                ->timeout(45)
                ->retry(3, 1000, fn ($e) => $e instanceof \Illuminate\Http\Client\RequestException
                    && in_array($e->response->status(), [429, 500, 503]), throw: false)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", $payload);

            if ($res->successful() || !in_array($res->status(), [429, 500, 503])) {
                return $res;
            }
        }

        return $res;
    }
}