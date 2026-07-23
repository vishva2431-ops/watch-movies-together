import { useState } from "react";
import { API } from "../api";
import { exportPublicKey } from "../security/e2ee";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const nav = useNavigate(),
    [name, setName] = useState(localStorage.getItem("userName") || ""),
    [bio, setBio] = useState(localStorage.getItem("bio") || ""),
    [gender, setGender] = useState(localStorage.getItem("gender") || "");

  const save = async () => {
    localStorage.setItem("userName", name);
    localStorage.setItem("bio", bio);
    localStorage.setItem("gender", gender);

    const publicKey = JSON.stringify(await exportPublicKey());

    await API.put(`/profiles/${localStorage.getItem("userId")}`, {
      name,
      bio,
      gender,
      publicKey,
    });
  };

  return (
    <div className="page profile-page">
      <div className="friends-nav">
        <button onClick={() => nav("/friends")}>← Friends</button>
        <h2>Profile</h2>
        <span />
      </div>

      <div className="profile-card">
        <label>
          Profile Image
          <input type="file" accept="image/*" />
        </label>

        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        <label>
          Gender
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          Email
          <input
            readOnly
            value={localStorage.getItem("userEmail") || ""}
          />
        </label>

        <label>
          Mobile
          <input
            readOnly
            value={localStorage.getItem("userMobile") || ""}
          />
        </label>

        <label>
          Friend ID
          <input
            readOnly
            value={localStorage.getItem("userId") || ""}
          />
        </label>

        <button className="btn-primary" onClick={save}>
          Save Profile
        </button>
      </div>
    </div>
  );
}