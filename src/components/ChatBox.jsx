import { useRef, useState } from "react";

const QUICK_EMOJIS = ["😀", "😂", "🥵", "🫂", "😘", "😍", "🔥", "👍", "🎉", "❤️", "😎", "😭", "👏"];

export default function ChatBox({ messages, onSend }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const sendMessage = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-box whatsapp-chat-box">
      <div className="chat-box-header">
        <h3>Room Chat</h3>
        <span className="chat-online-dot">Live</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat-state">No messages yet. Start the conversation.</div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="chat-bubble">
              <div className="chat-sender">{msg.sender}</div>
              <div className="chat-text">{msg.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="emoji-bar">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="emoji-btn"
            onClick={() => addEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="chat-input-row whatsapp-input-row">
        <input
          ref={inputRef}
          className="input-modern"
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />

        <button className="send-btn" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}