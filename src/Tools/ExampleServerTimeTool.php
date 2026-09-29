<?php

namespace ShibuJ\AiChatAssistant\Tools;

use ShibuJ\AiChatAssistant\Contracts\Tool;

class ExampleServerTimeTool implements Tool
{
    public function name(): string { return 'get_server_time'; }
    public function description(): string { return 'Get the current server date and time.'; }
    public function inputSchema(): array { return ['type' => 'object', 'properties' => new \stdClass()]; }

    public function handle(array $args): array
    {
        return ['server_time' => now()->toDateTimeString()];
    }
}