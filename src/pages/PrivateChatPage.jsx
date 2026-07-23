import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API } from "../api";
import {
  encryptText,
  decryptText,
  exportPublicKey,
} from "../security/e2ee";

export default function PrivateChatPage() {
  const { friendId } = useParams(),
    nav = useNavigate(),
    me = localStorage.getItem("userId"),
    chatId = useMemo(() => [me, friendId].sort().join("_"), [me, friendId]),
    [friend, setFriend] = useState(null),
    [messages, setMessages] = useState([]),
    [text, setText] = useState(""),
    [plain, setPlain] = useState({});

  useEffect(() => {
    (async () => {
      const pub = await exportPublicKey();

      await API.put(`/profiles/${me}`, {
        publicKey: JSON.stringify(pub),
      });

      let f = (await API.get(`/profiles/${friendId}`)).data;
      setFriend(f);

      let list = (
        await API.get(`/private-chats/${chatId}/messages`)
      ).data;

      setMessages(list);

      let out = {};

      for (const m of list) {
        try {
          const jwk = JSON.parse(
            m.senderId === me
              ? f.publicKey
              : m.ephemeralPublicKey
          );

          out[m.id] = await decryptText(m, jwk);
        } catch {
          out[m.id] = "Encrypted message";
        }
      }

      setPlain(out);
    })();
  }, [chatId, friendId, me]);

  const send = async () => {
    if (!text.trim() || !friend?.publicKey) return;

    const encrypted = await encryptText(
      text,
      JSON.parse(friend.publicKey)
    );

    let saved = (
      await API.post(`/private-chats/${chatId}/messages`, {
        ...encrypted,
        senderId: me,
        receiverId: friendId,
        type: "TEXT",
      })
    ).data;

    setMessages((x) => [...x, saved]);
    setPlain((x) => ({
      ...x,
      [saved.id]: text,
    }));
    setText("");
  };

  return (
    <div className="page private-chat-page">
      <div className="private-chat-head">
        <button onClick={() => nav("/friends")}>←</button>

        <div>
          <strong>{friend?.name || "Private Chat"}</strong>
          <span>{friend?.online ? "Online" : "Offline"}</span>
        </div>
      </div>

      <div className="private-chat-messages">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.senderId === me
                ? "private-message mine"
                : "private-message"
            }
          >
            {plain[m.id] || "Decrypting…"}
          </div>
        ))}
      </div>

      <div className="private-chat-compose">
        <button>🖼️</button>

        <label>
          📷
          <input
            hidden
            type="file"
            accept="image/*"
            capture="environment"
          />
        </label>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
        />

        <button>😊</button>
        <button onClick={send}>➤</button>
      </div>
    </div>
  );
}