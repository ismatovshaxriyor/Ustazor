import { formatMessageTime, getOwnMessageState, splitMessageVacancyContext, resolveAttachmentUrl, isImageAttachment } from './chatUtils';

export default function ChatMessageList({
  messagesLoading,
  messages,
  user,
  activeThread,
  messagesContainerRef,
}) {
  return (
    <div className="chat-messages" ref={messagesContainerRef}>
      {messagesLoading ? (
        <p className="muted">Xabarlar yuklanmoqda...</p>
      ) : messages.length === 0 ? (
        <p className="muted">Hozircha xabar yo`q. Birinchi bo`lib yozing!</p>
      ) : (
        messages.map((message) => {
          const isSelf = message.sender_id === user?.id;
          const isSystem = message.is_system;
          const ownState = getOwnMessageState(message, activeThread, user?.id);
          const ownStateTick = ownState === 'sent' ? '✔' : '✔✔';
          const parsedMessage = splitMessageVacancyContext(message.body);
          const attachmentUrl = resolveAttachmentUrl(message.attachment_url);
          const attachmentName = message.attachment_name || 'Fayl';
          const isImage = attachmentUrl && isImageAttachment(attachmentName);

          return (
            <div
              key={message.id}
              className={`message-bubble${isSelf ? ' message-self' : ''}${isSystem ? ' message-system' : ''}`}
            >
              {parsedMessage.vacancyTitle && <p className="message-vacancy-pill">{parsedMessage.vacancyTitle}</p>}
              {!isSystem && <p className="message-author">{message.sender_name}</p>}
              {parsedMessage.content ? <p className="message-body">{parsedMessage.content}</p> : null}
              {attachmentUrl ? (
                <div className="message-attachment-wrap">
                  {isImage ? (
                    <a href={attachmentUrl} target="_blank" rel="noreferrer" className="message-attachment-image-link">
                      <img
                        src={attachmentUrl}
                        alt={attachmentName}
                        className="message-attachment-image"
                        loading="lazy"
                      />
                    </a>
                  ) : null}
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="message-attachment-link"
                    download={attachmentName}
                  >
                    {`📎 ${attachmentName}`}
                  </a>
                </div>
              ) : null}
              {message.created_at && (
                <span className="message-meta">
                  <span className="message-time">{formatMessageTime(message.created_at)}</span>
                  {ownState ? (
                    <span className={`message-check message-check-${ownState}`} title={ownState}>
                      {ownStateTick}
                    </span>
                  ) : null}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
