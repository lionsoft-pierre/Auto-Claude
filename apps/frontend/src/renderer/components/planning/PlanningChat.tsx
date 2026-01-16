import { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { ChatInput } from './ChatInput';
import {
  useSessionStore,
  sendPlanningMessage,
  setupPlanningChatListeners,
  type PlanningChatMessage
} from '../../stores/planning/sessionStore';

// createSafeLink - factory function that creates a SafeLink component with i18n support
const createSafeLink = (opensInNewWindowText: string) => {
  return function SafeLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    // Validate URL - only allow http, https, and relative links
    const isValidUrl = href && (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('/') ||
      href.startsWith('#')
    );

    if (!isValidUrl) {
      return <span className="text-muted-foreground">{children}</span>;
    }

    const isExternal = href?.startsWith('http://') || href?.startsWith('https://');

    return (
      <a
        href={href}
        {...props}
        {...(isExternal && {
          target: '_blank',
          rel: 'noopener noreferrer',
        })}
        className="text-primary hover:underline"
      >
        {children}
        {isExternal && <span className="sr-only"> {opensInNewWindowText}</span>}
      </a>
    );
  };
};

interface PlanningChatProps {
  projectId: string;
}

export function PlanningChat({ projectId }: PlanningChatProps) {
  const { t } = useTranslation(['planning', 'common']);

  const session = useSessionStore((state) => state.session);
  const chatStatus = useSessionStore((state) => state.chatStatus);
  const streamingContent = useSessionStore((state) => state.streamingContent);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create markdown components with translated accessibility text
  const markdownComponents = useMemo(() => ({
    a: createSafeLink(t('common:accessibility.opensInNewWindow')),
  }), [t]);

  // Set up chat listeners on mount
  useEffect(() => {
    const cleanup = setupPlanningChatListeners();
    return cleanup;
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamingContent]);

  const handleSend = (message: string) => {
    if (!message.trim() || chatStatus.phase === 'thinking' || chatStatus.phase === 'streaming') return;
    sendPlanningMessage(projectId, message);
  };

  const isLoading = chatStatus.phase === 'thinking' || chatStatus.phase === 'streaming';
  const messages = session?.messages || [];

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">
              {t('planning:chat.startConversation')}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {t('planning:chat.startConversationDescription')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                t('planning:chat.suggestions.whatProject'),
                t('planning:chat.suggestions.helpDefine'),
                t('planning:chat.suggestions.needPRD'),
                t('planning:chat.suggestions.planArchitecture')
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSend(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                markdownComponents={markdownComponents}
              />
            ))}

            {/* Streaming message */}
            {streamingContent && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-medium text-foreground">
                    {t('planning:chat.assistant')}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {chatStatus.phase === 'thinking' && !streamingContent && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('planning:chat.thinking')}
                </div>
              </div>
            )}

            {/* Error message */}
            {chatStatus.phase === 'error' && chatStatus.error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {chatStatus.error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        placeholder={t('planning:chat.inputPlaceholder')}
      />
    </div>
  );
}

interface MessageBubbleProps {
  message: PlanningChatMessage;
  markdownComponents: Components;
}

function MessageBubble({ message, markdownComponents }: MessageBubbleProps) {
  const { t } = useTranslation(['planning']);
  const isUser = message.role === 'user';

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-muted' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-sm font-medium text-foreground">
          {isUser ? t('planning:chat.you') : t('planning:chat.assistant')}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
