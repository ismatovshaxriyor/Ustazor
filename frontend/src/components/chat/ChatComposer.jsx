import { Paperclip, SendHorizonal, Smile, X } from 'lucide-react';
import { QUICK_EMOJIS } from './chatUtils';

export default function ChatComposer({
  selectedFile,
  removeAttachment,
  emojiOpen,
  emojiPanelRef,
  setEmojiOpen,
  onInsertEmoji,
  onSendMessage,
  fileInputRef,
  onPickAttachment,
  draft,
  setDraft,
  sending,
}) {
  return (
    <div className="chat-composer">
      {selectedFile ? (
        <div className="chat-file-chip">
          <span className="chat-file-name">{selectedFile.name}</span>
          <button type="button" className="chat-chip-remove" onClick={removeAttachment} aria-label="Faylni olib tashlash">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {emojiOpen ? (
        <div className="chat-emoji-panel" ref={emojiPanelRef}>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="chat-emoji-btn"
              onClick={() => onInsertEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <form className="chat-input-row" onSubmit={onSendMessage}>
        <button
          type="button"
          className="button button-ghost chat-input-action"
          onClick={() => setEmojiOpen((prev) => !prev)}
          aria-label="Emoji tanlash"
        >
          <Smile size={16} />
        </button>
        <button
          type="button"
          className="button button-ghost chat-input-action"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Fayl biriktirish"
        >
          <Paperclip size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="chat-file-input"
          onChange={onPickAttachment}
        />
        <input
          className="input chat-input"
          placeholder="Xabar yozing..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="button button-primary chat-send-btn" type="submit" disabled={sending}>
          <SendHorizonal size={16} />
        </button>
      </form>
    </div>
  );
}
