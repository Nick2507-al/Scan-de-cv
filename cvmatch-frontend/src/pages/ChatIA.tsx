import React, { useState, useRef, useEffect } from "react";

const ChatIA: React.FC = () => {
  const [messages, setMessages] = useState([
    { sender: "ia", text: "Bonjour ! Je suis votre assistant IA. Posez-moi vos questions pour améliorer votre CV ou votre candidature." }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (!input.trim()) return;

  const userMsg = { sender: "user", text: input };
  setMessages(prev => [...prev, userMsg]);
  setInput("");

  try {
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: input }),
    });

    if (response.ok) {
      const data = await response.json();
      setMessages(prev => [...prev, { sender: "ia", text: data.response }]);
    } else {
      const errorData = await response.json();
      setMessages(prev => [
        ...prev,
        {
          sender: "ia",
          text: "Désolé, une erreur est survenue. Veuillez réessayer.",
        },
      ]);
    }
  } catch (error) {
    console.error("Erreur lors de l'appel API :", error);
    setMessages(prev => [
      ...prev,
      {
        sender: "ia",
        text: "Erreur réseau. Vérifiez votre connexion ou réessayez plus tard.",
      },
    ]);
  }
};


  return (
    <div style={styles.bg}>
      <div style={styles.chatContainer}>
        <header style={styles.header}>
          <span style={styles.headerIcon}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#6366f1" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z"/></svg>
          </span>
          <span style={styles.headerTitle}>Conseils IA pour votre CV</span>
        </header>
        <div style={styles.chatBox}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={msg.sender === "user" ? styles.userMsg : styles.iaMsg}
            >
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form style={styles.inputRow} onSubmit={handleSend}>
          <input
            style={styles.input}
            type="text"
            placeholder="Posez votre question..."
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button style={styles.sendBtn} type="submit">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(90deg, #f3f4f6 0%, #e0e7ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chatContainer: {
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 4px 32px rgba(80,0,180,0.07)",
    width: "100%",
    maxWidth: "480px",
    minHeight: "600px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    background: "#f3f4f6",
    padding: "1.2rem 1.5rem",
    borderBottom: "1.5px solid #e5e7eb",
  },
  headerIcon: {
    display: "flex",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: "1.18rem",
    color: "#22223b",
    letterSpacing: "-1px",
  },
  chatBox: {
    flex: 1,
    padding: "2rem 1.2rem 1.2rem 1.2rem",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
    background: "#f8fafc",
  },
  userMsg: {
    alignSelf: "flex-end",
    background: "#6366f1",
    color: "#fff",
    borderRadius: "14px 14px 2px 14px",
    padding: "0.9rem 1.2rem",
    maxWidth: "80%",
    fontSize: "1.08rem",
    fontWeight: 500,
    boxShadow: "0 2px 8px rgba(99,102,241,0.10)",
  },
  iaMsg: {
    alignSelf: "flex-start",
    background: "#fff",
    color: "#22223b",
    borderRadius: "14px 14px 14px 2px",
    padding: "0.9rem 1.2rem",
    maxWidth: "80%",
    fontSize: "1.08rem",
    fontWeight: 500,
    boxShadow: "0 2px 8px rgba(80,0,180,0.07)",
    border: "1.2px solid #e0e7ff",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    padding: "1.1rem 1.2rem",
    borderTop: "1.5px solid #e5e7eb",
    background: "#f3f4f6",
    gap: "0.7rem",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "#fff",
    borderRadius: "10px",
    padding: "0.9rem 1.1rem",
    fontSize: "1.08rem",
    color: "#22223b",
    boxShadow: "0 2px 8px rgba(80,0,180,0.03)",
    borderBottom: "2px solid #6366f1",
  },
  sendBtn: {
    background: "#6366f1",
    border: "none",
    borderRadius: "10px",
    padding: "0.7rem 0.9rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
};

export default ChatIA;