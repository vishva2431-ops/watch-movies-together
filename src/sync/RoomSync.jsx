// Centralized room sync helpers for Vision Arc.

export const createRoomClientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const sendRoomSync = (stompClient, payload) => {
  if (!stompClient || !payload?.roomCode || !payload?.action) return false;

  stompClient.send("/app/room.sync", {}, JSON.stringify(payload));
  return true;
};

export const isOwnRoomSyncMessage = (message, clientId) => {
  return Boolean(message?.clientId && clientId && message.clientId === clientId);
};

export const buildBaseSyncPayload = ({
  roomCode,
  action,
  userName,
  clientId,
  currentTime = 0,
  playbackRate = 1,
  extra = {},
}) => ({
  roomCode,
  action,
  userName,
  clientId,
  currentTime,
  playbackRate,
  ...extra,
});

export const buildSelectMoviePayload = ({ roomCode, userName, clientId, movie, category }) => ({
  roomCode,
  action: "SELECT",
  userName,
  clientId,
  movieId: movie?.id,
  category: category || movie?.category || "MOVIE",
  currentTime: 0,
  playbackRate: 1,
});

export const buildSelectYoutubePayload = ({ roomCode, userName, clientId, video, category }) => ({
  roomCode,
  action: "SELECT",
  userName,
  clientId,
  youtubeVideoId: video?.videoId,
  youtubeTitle: video?.title,
  youtubeThumbnail: video?.thumbnail,
  category: category || "MOVIE",
  currentTime: 0,
  playbackRate: 1,
});

export const buildCategorySyncPayload = ({ roomCode, userName, clientId, category }) => ({
  roomCode,
  action: "SELECT",
  userName,
  clientId,
  category: category || "MOVIE",
  currentTime: 0,
  playbackRate: 1,
});