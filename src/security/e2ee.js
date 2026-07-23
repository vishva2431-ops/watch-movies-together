const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)));

const unb64 = (s) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function getIdentityKeyPair() {
  let raw = localStorage.getItem("va_identity");

  if (raw) {
    let x = JSON.parse(raw);

    return {
      privateKey: await crypto.subtle.importKey(
        "jwk",
        x.privateKey,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey"]
      ),

      publicKey: await crypto.subtle.importKey(
        "jwk",
        x.publicKey,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        []
      ),
    };
  }

  let kp = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  localStorage.setItem(
    "va_identity",
    JSON.stringify({
      privateKey: await crypto.subtle.exportKey(
        "jwk",
        kp.privateKey
      ),
      publicKey: await crypto.subtle.exportKey(
        "jwk",
        kp.publicKey
      ),
    })
  );

  return kp;
}

export async function exportPublicKey() {
  return crypto.subtle.exportKey(
    "jwk",
    (await getIdentityKeyPair()).publicKey
  );
}

export async function encryptText(text, recipientJwk) {
  let own = await getIdentityKeyPair();

  let pub = await crypto.subtle.importKey(
    "jwk",
    recipientJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );

  let key = await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: pub,
    },
    own.privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"]
  );

  let iv = crypto.getRandomValues(new Uint8Array(12));

  let data = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    enc.encode(text)
  );

  return {
    ciphertext: b64(data),
    iv: b64(iv),
    ephemeralPublicKey: JSON.stringify(
      await exportPublicKey()
    ),
  };
}

export async function decryptText(payload, senderJwk) {
  let own = await getIdentityKeyPair();

  let pub = await crypto.subtle.importKey(
    "jwk",
    senderJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );

  let key = await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: pub,
    },
    own.privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );

  return dec.decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: unb64(payload.iv),
      },
      key,
      unb64(payload.ciphertext)
    )
  );
}