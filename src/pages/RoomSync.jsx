// Centralized room sync helpers for Vision Arc.
// This file keeps WebSocket/STOMP payload creation in one place
// without changing the UI code inside RoomPage.jsx.

export const createRoomClientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const sendRoomSync = (stompClient, payload) => {
  if (!stompClient || !payload?.roomCode || !payload?.action) return false;

  stompClient.send(
    "/app/room.sync",
    {},
    JSON.stringify(payload)
  );

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

export const buildSelectMoviePayload = ({
  roomCode,
  userName,
  clientId,
  movie,
  category,
}) => ({
  roomCode,
  action: "SELECT",
  userName,
  clientId,
  movieId: movie?.id,
  category: category || movie?.category || "MOVIE",
  currentTime: 0,
  playbackRate: 1,
});

export const buildSelectYoutubePayload = ({
  roomCode,
  userName,
  clientId,
  video,
  category,
}) => ({
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

export const buildCategorySyncPayload = ({
  roomCode,
  userName,
  clientId,
  category,
}) => ({
  roomCode,
  action: "SELECT",
  userName,
  clientId,
  category: category || "MOVIE",
  currentTime: 0,
  playbackRate: 1,
});

export const buildSyncResponsePayload = ({
  roomCode,
  targetUser,
  targetClientId,
  userName,
  clientId,
  currentMovie,
  currentCategory,
  currentTime = 0,
  playbackRate = 1,
  playing = false,
}) => ({
  roomCode,
  action: "SYNC_RESPONSE",
  targetUser,
  targetClientId,
  userName,
  clientId,
  youtubeVideoId: currentMovie?.youtube ? currentMovie.videoUrl : null,
  youtubeTitle: currentMovie?.groupTitle || "",
  youtubeThumbnail: currentMovie?.youtubeThumbnail || "",
  movieId: currentMovie && !currentMovie.youtube ? currentMovie.id : null,
  category: currentCategory || "MOVIE",
  currentTime,
  playbackRate,
  playing,
});
