<?php

namespace ShibuJ\AiChatAssistant\Contracts;

interface Tool
{
    public function name(): string;
    public function description(): string;

    /** JSON-schema-ish array, same shape you'd pass to a function-calling API. */
    public function inputSchema(): array;

    /** @return array Tool result, sent back to the model. */
    public function handle(array $args): array;
}