<?php

namespace ShibuJ\AiChatAssistant\Console;

use Illuminate\Console\GeneratorCommand;

class MakeToolCommand extends GeneratorCommand
{
    protected $name = 'make:ai-tool';
    protected $description = 'Create a new AI assistant tool';
    protected $type = 'Tool';

    protected function getStub()
    {
        return __DIR__ . '/../stubs/tool.stub';
    }

    protected function getDefaultNamespace($rootNamespace)
    {
        return $rootNamespace . '\\AiTools';
    }
}