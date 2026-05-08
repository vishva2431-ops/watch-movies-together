import { useState } from "react";

export default function ChatBox({ messages, onSend }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;

    onSend(text);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-box">
      <h3 className="chat-title">Room Chat</h3>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">No messages yet</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="chat-message">
              <strong>{msg.sender}: </strong>
              <span>{msg.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button className="send-btn" onClick={handleSend}>
          ➤
        </button>
      </div>
    </div>
  );
}