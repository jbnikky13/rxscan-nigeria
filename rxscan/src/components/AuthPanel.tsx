import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function AuthPanel({ onAuthChange }: { onAuthChange?: (user: any) => void }) {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) { setUser(data.user ?? null); onAuthChange?.(data.user ?? null); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(next);
      onAuthChange?.(next);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [onAuthChange]);

  const submit = async (signUp: boolean) => {
    if (!email.trim() || password.length < 6) {
      setMessage("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true); setMessage("");
    const result = signUp
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) setMessage(result.error.message);
    else if (signUp && !result.data.session) setMessage("Account created. Check your email to confirm your account, then sign in.");
    else setMessage(signUp ? "Account created." : "Signed in.");
    setBusy(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); setMessage("Signed out."); };

  if (user) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <span style={{ fontSize: 11, opacity: 0.85 }}>Signed in as {user.email}</span>
      <button onClick={signOut} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Sign out</button>
    </div>
  );

  return (
    <details style={{ marginLeft: "auto" }}>
      <summary style={{ cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,.12)", fontSize: 11, fontWeight: 700, listStyle: "none" }}>Account</summary>
      <div style={{ position: "absolute", zIndex: 20, right: 16, marginTop: 6, width: 270, background: "#fff", color: "#111827", borderRadius: 12, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,.18)" }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" style={{ width: "100%", padding: 9, marginBottom: 7, border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box" }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" style={{ width: "100%", padding: 9, marginBottom: 8, border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6 }}>
          <button disabled={busy} onClick={() => submit(false)} style={{ flex: 1, padding: 8, border: 0, borderRadius: 8, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Sign in</button>
          <button disabled={busy} onClick={() => submit(true)} style={{ flex: 1, padding: 8, border: 0, borderRadius: 8, background: "#059669", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Create account</button>
        </div>
        {message && <div style={{ marginTop: 8, fontSize: 11, color: "#374151" }}>{message}</div>}
      </div>
    </details>
  );
}
