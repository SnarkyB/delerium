// === helpers ===
export function b64u(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export function ub64u(s: string): ArrayBuffer {
  s = s.replace(/-/g,'+').replace(/_/g,'/'); 
  while (s.length % 4) s+='=';
  const bin = atob(s); 
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function genKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name:"AES-GCM", length:256 }, true, ["encrypt","decrypt"]);
}

export function genIV(): Uint8Array { 
  const iv = new Uint8Array(12); 
  crypto.getRandomValues(iv); 
  return iv; 
}

interface EncryptedData {
  keyB64: string;
  ivB64: string;
  ctB64: string;
}

export async function encryptString(plaintext: string): Promise<EncryptedData> {
  const key = await genKey();
  const iv = genIV();
  // @ts-ignore
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const raw = await crypto.subtle.exportKey("raw", key);
  // @ts-ignore
  return { keyB64: b64u(raw), ivB64: b64u(iv), ctB64: b64u(ct) };
}

export async function decryptParts(keyB64: string, ivB64: string, ctB64: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", ub64u(keyB64) as any, { name:"AES-GCM" }, false, ["decrypt"]);
  const iv = new Uint8Array(ub64u(ivB64));
  const ct = new Uint8Array(ub64u(ctB64));
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct as any);
  return new TextDecoder().decode(pt);
}

interface PowChallenge {
  challenge: string;
  difficulty: number;
}

export async function fetchPow(): Promise<PowChallenge | null> {
  const r = await fetch("/api/pow");
  if (r.status === 204) return null;
  return await r.json();
}

export function doPow(challenge: string, difficulty: number): Promise<number> {
  return new Promise((resolve) => {
    const target = difficulty;
    let nonce = 0;
    function step() {
      const enc = new TextEncoder().encode(`${challenge}:${nonce}`);
      crypto.subtle.digest("SHA-256", enc as any).then((buf: ArrayBuffer) => {
        const arr = new Uint8Array(buf);
        let bits = 0;
        for (const b of arr) {
          if (b === 0) { bits += 8; continue; }
          bits += Math.clz32(b) - 24; break;
        }
        if (bits >= target) resolve(nonce);
        else { nonce++; if (nonce % 1000 === 0) setTimeout(step); else step(); }
      });
    }
    step();
  });
}

// === create flow ===
document.getElementById("save")?.addEventListener("click", async () => {
  const text = (document.getElementById("paste") as HTMLTextAreaElement).value;
  if (!text) return alert("Nothing to save.");
  const mins = parseInt((document.getElementById("mins") as HTMLInputElement).value || "60", 10);
  const expireTs = Math.floor(Date.now()/1000) + mins * 60;
  const singleView = (document.getElementById("single") as HTMLInputElement).checked;

  const { keyB64, ivB64, ctB64 } = await encryptString(text);

  let pow: { challenge: string; nonce: number } | null = null;
  try {
    const ch = await fetchPow();
    if (ch) {
      const nonce = await doPow(ch.challenge, ch.difficulty);
      pow = { challenge: ch.challenge, nonce };
    }
  } catch {}

  const res = await fetch("/api/pastes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ct: ctB64,
      iv: ivB64,
      meta: { expireTs, singleView, viewsAllowed: singleView ? 1 : null, mime: "text/plain" },
      pow
    })
  });

  const out = document.getElementById("out");
  if (!res.ok) {
    const err = await res.json().catch(()=>({error:res.statusText}));
    if (out) out.textContent = "Error: " + err.error;
    return;
  }
  const data = await res.json(); // { id, deleteToken }
  const url = `${location.origin}/view.html?p=${encodeURIComponent(data.id)}#${keyB64}:${ivB64}`;
  if (out) {
    out.textContent =
      `Share this URL (includes the decryption key in fragment):\n${url}\n\n` +
      `Delete link (keep private):\n${location.origin}/api/pastes/${data.id}?token=${data.deleteToken} (HTTP DELETE)`;
  }
});

// === view flow ===
(async function (): Promise<void> {
  if (!location.pathname.endsWith("view.html")) return;
  const q = new URLSearchParams(location.search);
  const id = q.get("p");
  const frag = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  const content = document.getElementById("content");
  if (!id || !frag) { 
    if (content) content.textContent = "Missing paste ID or key."; 
    return; 
  }
  const [keyB64, ivB64] = frag.split(":");
  try {
    const r = await fetch(`/api/pastes/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error("Not found or expired.");
    const { ct, iv } = await r.json();
    const text = await decryptParts(keyB64, ivB64 || iv, ct);
    if (content) content.textContent = text;
  } catch (e) {
    if (content) content.textContent = "Error: " + (e as Error).message;
  }
})();