import { useEffect, useRef, useState } from "react";

export default function ChatBox({
  messages,
  onSend,
  currentUser,
  replyTo,
  onReply,
  onCancelReply,
}) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e, msg) => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - touchStartX.current;

    if (diff > 70) {
      onReply(msg);
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
            <div
              key={index}
              className={
                msg.sender === currentUser
                  ? "chat-message my-message"
                  : "chat-message other-message"
              }
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, msg)}
              onDoubleClick={() => onReply(msg)}
            >
              {msg.replyTo && (
                <div className="reply-preview">
                  <strong>{msg.replyTo.sender}</strong>
                  <span>{msg.replyTo.text}</span>
                </div>
              )}

              <strong>{msg.sender}: </strong>
              <span>{msg.text}</span>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="reply-selected-box">
          <div>
            <strong>Replying to {replyTo.sender}</strong>
            <p>{replyTo.text}</p>
          </div>

          <button onClick={onCancelReply}>×</button>
        </div>
      )}

      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button className="send-btn" onClick={handleSend}>
          ➤
        </button>
      </div>
    </div>
  );
}