import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";

export default function FriendsPage() {
  const nav = useNavigate();
  const uid = localStorage.getItem("userId");

  const [tab, setTab] = useState("Friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const load = async () => {
    if (!uid) return;

    try {
      const [friendsResponse, requestsResponse] = await Promise.all([
        API.get(`/friends/${uid}`),
        API.get(`/friends/${uid}/requests`),
      ]);

      setFriends(friendsResponse.data || []);
      setRequests(requestsResponse.data || []);
    } catch (error) {
      console.error("Unable to load friends:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }

      try {
        const response = await API.get("/friends/search", {
          params: {
            q: q.trim(),
          },
        });

        setResults(response.data || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q]);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3500);
  };

  const sendRequest = async (receiverId) => {
    if (!uid) {
      showMessage("Please log in again.", "error");
      return;
    }

    if (!receiverId) {
      showMessage("Unable to identify this user.", "error");
      return;
    }

    if (receiverId === uid) {
      showMessage("You cannot send a request to yourself.", "error");
      return;
    }

    try {
      await API.post("/friends/request", {
        senderId: uid,
        receiverId,
      });

      showMessage("Friend request sent successfully.");
      setSelectedUser(null);
    } catch (error) {
      console.error("Friend request failed:", error);

      const status = error.response?.status;
      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data;

      if (status === 409) {
        showMessage(
          typeof backendMessage === "string"
            ? backendMessage
            : "A friend request already exists or you are already friends.",
          "error"
        );
        return;
      }

      if (status === 404) {
        showMessage("User was not found.", "error");
        return;
      }

      showMessage("Unable to send the friend request.", "error");
    }
  };

  const openProfile = async (user) => {
    setSelectedUser(user);
    setLoadingProfile(true);

    try {
      const response = await API.get(`/profiles/${user.id}`);

      setSelectedUser({
        ...user,
        ...response.data,
        id: response.data?.id || user.id,
      });
    } catch (error) {
      // Search result still contains basic user details,
      // so the profile card can remain open.
      console.error("Unable to load complete profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const act = async (requestId, action) => {
    try {
      await API.post(`/friends/requests/${requestId}/${action}`, {
        userId: uid,
      });

      showMessage(
        action === "accept"
          ? "Friend request accepted."
          : "Friend request rejected."
      );

      await load();
    } catch (error) {
      console.error(`Unable to ${action} request:`, error);
      showMessage(`Unable to ${action} this request.`, "error");
    }
  };

  return (
    <div className="page friends-page">
      <div className="friends-nav">
        <button onClick={() => nav("/home")}>← Home</button>

        <h2>Friends</h2>

        <button onClick={() => nav("/profile")}>Profile</button>
      </div>

      {message && (
        <div
          className={`friends-message ${
            messageType === "error" ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

     <div className="friends-menu">

    <button
        className={`menu-card ${
            tab==="Friends" ? "active" : ""
        }`}
        onClick={()=>setTab("Friends")}
    >

        <div className="menu-icon">
            👥
        </div>

        <h3>Friends</h3>

        <p>{friends.length}</p>

    </button>

    <button
        className={`menu-card ${
            tab==="Requests" ? "active" : ""
        }`}
        onClick={()=>setTab("Requests")}
    >

        <div className="menu-icon">
            🔔
        </div>

        <h3>Requests</h3>

        <p>{requests.length}</p>

    </button>

    <button
        className={`menu-card ${
            tab==="Add Friend" ? "active" : ""
        }`}
        onClick={()=>setTab("Add Friend")}
    >

        <div className="menu-icon">
            ➕
        </div>

        <h3>Add Friend</h3>

        <p>Search Users</p>

    </button>

</div>

      <div className="friends-panel">
        {tab === "Friends" &&
          (friends.length > 0 ? (
            friends.map((friend) => (
              <button
                key={friend.id}
                className="friend-card"
                onClick={() => nav(`/chat/${friend.id}`)}
              >
                <div className="friend-avatar">
                  {friend.profileImage ? (
                    <img
                      src={friend.profileImage}
                      alt={friend.name || "Friend"}
                    />
                  ) : (
                    friend.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>

                <div className="friend-details">
                  <strong>{friend.name || "Unknown user"}</strong>
                  <span>{friend.email || friend.id}</span>
                  <span>{friend.online ? "Online" : "Offline"}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="friends-empty">
              You have not added any friends yet.
            </div>
          ))}

        {tab === "Requests" &&
          (requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="friend-card">
                <div className="friend-details">
                  <strong>Friend request</strong>
                  <span>{request.senderName || request.senderId}</span>
                </div>

                <div className="friend-request-actions">
                  <button
                    className="btn-primary"
                    onClick={() => act(request.id, "accept")}
                  >
                    Accept
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => act(request.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="friends-empty">
              There are no pending friend requests.
            </div>
          ))}

        {(tab === "Add Friend") && (
          <>
            <input
              className="join-room-input"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by name, Friend ID or email"
            />

            {results
              .filter((user) => user.id !== uid)
              .map((user) => (
                <div
                  key={user.id}
                  className="friend-card friend-search-result"
                  role="button"
                  tabIndex={0}
                  onClick={() => openProfile(user)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      openProfile(user);
                    }
                  }}
                >
                  <div className="friend-avatar">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.name || "User"}
                      />
                    ) : (
                      user.name?.charAt(0)?.toUpperCase() || "?"
                    )}
                  </div>

                  <div className="friend-details">
                    <strong>{user.name || "Unknown user"}</strong>
                    <span>{user.email || user.id}</span>
                    <small>Click to view profile</small>
                  </div>

                  {tab === "Add Friend" && (
                    <button
                      className="btn-primary send-request-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        sendRequest(user.id);
                      }}
                    >
                      Send Request
                    </button>
                  )}
                </div>
              ))}

            {q.trim() && results.length === 0 && (
              <div className="friends-empty">No users found.</div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <div
          className="friend-profile-overlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="friend-profile-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="friend-profile-close"
              onClick={() => setSelectedUser(null)}
              aria-label="Close profile"
            >
              ×
            </button>

            <div className="friend-profile-avatar">
              {selectedUser.profileImage ? (
                <img
                  src={selectedUser.profileImage}
                  alt={selectedUser.name || "User"}
                />
              ) : (
                selectedUser.name?.charAt(0)?.toUpperCase() || "?"
              )}
            </div>

            {loadingProfile ? (
              <p>Loading profile...</p>
            ) : (
              <>
                <h2>{selectedUser.name || "Unknown user"}</h2>

                <p className="friend-profile-bio">
                  {selectedUser.bio || "No bio added."}
                </p>

                <div className="friend-profile-information">
                  <div>
                    <span>Email</span>
                    <strong>{selectedUser.email || "Not provided"}</strong>
                  </div>

                  <div>
                    <span>Gender</span>
                    <strong>{selectedUser.gender || "Not provided"}</strong>
                  </div>

                  <div>
                    <span>Friend ID</span>
                    <strong>{selectedUser.id}</strong>
                  </div>
                </div>

                <button
                  className="btn-primary friend-profile-send"
                  onClick={() => sendRequest(selectedUser.id)}
                >
                  Send Friend Request
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}