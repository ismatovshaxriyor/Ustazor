import { useMemo, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { conversations } from '../data/mockData';

function ChatPage() {
  const [activeId, setActiveId] = useState(conversations[0]?.id);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) || conversations[0],
    [activeId],
  );

  return (
    <section className="chat-shell reveal-up">
      <aside className="chat-list card">
        <p className="chat-title">Suhbatlar</p>
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            className={`chat-contact${conversation.id === activeId ? ' chat-contact-active' : ''}`}
            onClick={() => setActiveId(conversation.id)}
          >
            <div>
              <p>{conversation.contact}</p>
              <p className="muted">{conversation.lastMessage}</p>
            </div>
            {conversation.unread > 0 && <span className="badge">{conversation.unread}</span>}
          </button>
        ))}
      </aside>

      <article className="chat-window card">
        <header className="chat-header">
          <h2>{activeConversation.contact}</h2>
          <p className="muted">{activeConversation.role}</p>
        </header>

        <div className="chat-messages">
          {activeConversation.messages.map((message) => (
            <div
              key={message.id}
              className={`message-bubble${message.from === 'client' ? ' message-client' : ''}`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <form className="chat-input-row" onSubmit={(event) => event.preventDefault()}>
          <input className="input" placeholder="Xabar yozing..." />
          <button className="button button-primary icon-button" type="submit">
            <SendHorizonal size={14} />
            Yuborish
          </button>
        </form>
      </article>
    </section>
  );
}

export default ChatPage;
