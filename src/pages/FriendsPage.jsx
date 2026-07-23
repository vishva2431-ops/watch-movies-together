import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";

export default function FriendsPage() {
  const nav = useNavigate(),
    uid = localStorage.getItem("userId"),
    [tab, setTab] = useState("Friends"),
    [friends, setFriends] = useState([]),
    [requests, setRequests] = useState([]),
    [q, setQ] = useState(""),
    [results, setResults] = useState([]);

  const load = async () => {
    if (!uid) return;

    setFriends((await API.get(`/friends/${uid}`)).data);
    setRequests((await API.get(`/friends/${uid}/requests`)).data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let t = setTimeout(async () => {
      setResults(
        q.trim()
          ? (await API.get("/friends/search", { params: { q } })).data
          : []
      );
    }, 250);

    return () => clearTimeout(t);
  }, [q]);

  const act = async (id, a) => {
    await API.post(`/friends/requests/${id}/${a}`, {
      userId: uid,
    });

    load();
  };

  return (
    <div className="page friends-page">
      <div className="friends-nav">
        <button onClick={() => nav("/home")}>← Home</button>
        <h2>Friends</h2>
        <button onClick={() => nav("/profile")}>Profile</button>
      </div>

      <div className="friends-tabs">
        {["Friends", "Requests", "Add Friend", "Search"].map((x) => (
          <button
            key={x}
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
          >
            {x}
            {x === "Requests" && requests.length
              ? ` (${requests.length})`
              : ""}
          </button>
        ))}
      </div>

      <div className="friends-panel">
        {tab === "Friends" &&
          friends.map((f) => (
            <button
              key={f.id}
              className="friend-card"
              onClick={() => nav(`/chat/${f.id}`)}
            >
              <div className="friend-avatar">
                {f.profileImage ? (
                  <img src={f.profileImage} alt={f.name} />
                ) : (
                  f.name?.[0]
                )}
              </div>

              <div>
                <strong>{f.name}</strong>
                <span>{f.online ? "Online" : "Offline"}</span>
              </div>
            </button>
          ))}

        {tab === "Requests" &&
          requests.map((r) => (
            <div key={r.id} className="friend-card">
              <div>
                <strong>Friend request</strong>
                <span>{r.senderId}</span>
              </div>

              <button onClick={() => act(r.id, "accept")}>
                Accept
              </button>

              <button onClick={() => act(r.id, "reject")}>
                Reject
              </button>
            </div>
          ))}

        {(tab === "Add Friend" || tab === "Search") && (
          <>
            <input
              className="join-room-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, Friend ID or Email"
            />

            {results
              .filter((x) => x.id !== uid)
              .map((u) => (
                <div key={u.id} className="friend-card">
                  <div>
                    <strong>{u.name}</strong>
                    <span>{u.email || u.id}</span>
                  </div>

                  {tab === "Add Friend" && (
                    <button
                      onClick={() =>
                        API.post("/friends/request", {
                          senderId: uid,
                          receiverId: u.id,
                        })
                      }
                    >
                      Send Request
                    </button>
                  )}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}