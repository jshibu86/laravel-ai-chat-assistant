<?php

namespace ShibuJ\AiChatAssistant\Contracts;

interface AiDriver
{
    /**
     * @param string $systemPrompt
     * @param array<int, array{name:string, description:string, input_schema:array}> $tools
     * @param array $history Prior turns, provider-agnostic: [['role'=>'user'|'assistant','content'=>string], ...]
     * @param string $userMessage
     * @param callable $onToolCall function(string $name, array $args): array — run a tool, return its result
     * @return string Final assistant text reply
     */
    public function converse(
        string $systemPrompt,
        array $tools,
        array $history,
        string $userMessage,
        callable $onToolCall
    ): string;
}