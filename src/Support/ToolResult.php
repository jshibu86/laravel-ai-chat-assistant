<?php

namespace ShibuJ\AiChatAssistant\Support;

class ToolResult
{
    public static function notFound(): array
    {
        return ['found' => false];
    }

    public static function error(string $message): array
    {
        return ['error' => $message];
    }
}