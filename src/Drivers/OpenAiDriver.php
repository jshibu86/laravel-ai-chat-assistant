<?php

namespace ShibuJ\AiChatAssistant\Drivers;

use Illuminate\Support\Facades\Http;
use ShibuJ\AiChatAssistant\Contracts\AiDriver;

class OpenAiDriver implements AiDriver
{
    public function __construct(protected array $config) {}

    public function converse(
        string $systemPrompt,
        array $tools,
        array $history,
        string $userMessage,
        callable $onToolCall
    ): string {
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        foreach ($history as $m) {
            $messages[] = ['role' => $m['role'], 'content' => $m['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $toolDefs = collect($tools)->map(fn ($t) => [
            'type' => 'function',
            'function' => [
                'name' => $t['name'],
                'description' => $t['description'],
                'parameters' => $t['input_schema'],
            ],
        ])->all();

        for ($i = 0; $i < 6; $i++) {
            $res = Http::withToken($this->config['key'])
                ->timeout(45)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $this->config['model'] ?? 'gpt-4o-mini',
                    'messages' => $messages,
                    'tools' => $toolDefs,
                ]);

            if (!$res->successful()) {
                \Log::error('AiChatAssistant: OpenAI call failed', ['status' => $res->status(), 'body' => $res->body()]);
                return 'Sorry, I\'m having trouble right now. Please try again in a moment.';
            }

            $msg = $res->json('choices.0.message');
            $calls = $msg['tool_calls'] ?? [];

            if (empty($calls)) {
                return $msg['content'] ?? 'Sorry, I couldn\'t come up with an answer.';
            }

            $messages[] = $msg;
            foreach ($calls as $call) {
                $args = json_decode($call['function']['arguments'] ?? '{}', true) ?: [];
                $result = $onToolCall($call['function']['name'], $args);
                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $call['id'],
                    'content' => json_encode($result),
                ];
            }
        }

        return 'Sorry, I couldn\'t finish that request. Could you rephrase it?';
    }
}