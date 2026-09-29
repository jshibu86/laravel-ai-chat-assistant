<?php

namespace ShibuJ\AiChatAssistant\Console;

use Illuminate\Console\GeneratorCommand;

class MakeAssistantCommand extends GeneratorCommand
{
    protected $name = 'make:ai-assistant';
    protected $description = 'Create a new AI assistant class';
    protected $type = 'Assistant';

    protected function getStub()
    {
        return __DIR__ . '/../stubs/assistant.stub';
    }

    protected function getDefaultNamespace($rootNamespace)
    {
        return $rootNamespace . '\\Assistants';
    }
}