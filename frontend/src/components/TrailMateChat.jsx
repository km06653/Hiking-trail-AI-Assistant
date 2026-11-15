import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatDate(value) {
  if (!value) return "Visit date not provided";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Visit date not provided";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TrailMateChat({ hikingContext }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const launcherRef = useRef(null);

  const destination = hikingContext?.destination || "Your trip";
  const visitDate = hikingContext?.hike_date;

  const matchingWeather = Boolean(
    visitDate &&
      hikingContext?.weather?.forecast_date === visitDate
  );

  const contextKey = JSON.stringify([
    destination,
    visitDate,
    hikingContext?.weather,
  ]);

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;

    setMessages([]);
    setMessage("");
    setLoading(false);
    setError("");

    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [contextKey]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, messages, loading, error]);

  function closeChat() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  async function sendMessage(event) {
    event.preventDefault();

    const question = message.trim();

    if (!question || requestRef.current || !hikingContext) return;

    const history = messages;
    const updatedMessages = [
      ...history,
      { role: "user", content: question },
    ];

    const controller = new AbortController();
    requestRef.current = controller;

    setMessages(updatedMessages);
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/chat",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: question,
            hiking_context: hikingContext,
            conversation_history: history.slice(-10),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const data = await response.json();

      if (
        typeof data.response !== "string" ||
        !data.response.trim()
      ) {
        throw new Error("Empty chatbot response");
      }

      if (requestRef.current !== controller) return;

      setMessages([
        ...updatedMessages,
        { role: "model", content: data.response.trim() },
      ]);
    } catch (requestError) {
      if (
        requestError.name === "AbortError" ||
        requestRef.current !== controller
      ) {
        return;
      }

      console.error("Chat error:", requestError);

      setMessages(history);
      setMessage(question);
      setError(
        "Could not connect. Your question is still below—try again."
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div style={{ fontFamily: "inherit", color: "#243e30" }}>
      {open && (
        <section
          id="trailmate-floating-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby="trailmate-chat-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeChat();
            }
          }}
          style={{
            position: "fixed",
            right: "16px",
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            zIndex: 9999,
            width: "min(390px, calc(100vw - 32px))",
            height: "min(540px, calc(100dvh - 120px))",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #d5decb",
            borderRadius: "20px",
            background: "#fffefa",
            boxShadow: "0 18px 60px rgba(17,42,28,.25)",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
              padding: "18px",
              background: "#243e30",
              color: "#fffefa",
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                id="trailmate-chat-title"
                style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}
              >
                ✧ Ask TrailMate
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: "12px",
                  color: "#d4dfce",
                  overflowWrap: "anywhere",
                }}
              >
                {destination}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close chat"
              onClick={closeChat}
              style={{
                flexShrink: 0,
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: 0,
                background: "#ffffff15",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </header>

          <div
            style={{
              padding: "12px 18px",
              background: "#edf2e5",
              fontSize: "12px",
              flexShrink: 0,
            }}
          >
            <strong>Visit: {formatDate(visitDate)}</strong>

            <p style={{ margin: "4px 0 0", color: "#67765e" }}>
              {matchingWeather
                ? "Using the forecast in your current guide."
                : "No matching forecast is available in this guide."}
            </p>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              padding: "16px",
            }}
          >
            {messages.length === 0 && (
              <div style={styles.assistantBubble}>
                Hi! Ask me about your trails, packing, weather,
                or park rules.
                <br />
                <br />
                To change the trip date, use the calendar and
                click <strong>Update guide</strong>.
              </div>
            )}

            <div
              role="log"
              aria-label="Chat messages"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.map((item, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.assistantBubble,
                    marginLeft: item.role === "user" ? "28px" : 0,
                    marginRight: item.role === "model" ? "18px" : 0,
                    background:
                      item.role === "user" ? "#daef9b" : "#f0f1e8",
                  }}
                >
                  <span className="sr-only">
                    {item.role === "user" ? "You: " : "TrailMate: "}
                  </span>
                  {item.content}
                </div>
              ))}
            </div>

            {loading && (
              <p role="status" style={{ fontSize: "13px" }}>
                TrailMate is thinking…
              </p>
            )}

            {error && (
              <p
                role="alert"
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#fff1e6",
                  color: "#8a4325",
                  fontSize: "13px",
                }}
              >
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
              borderTop: "1px solid #e1e7d9",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4000}
              disabled={loading}
              aria-label="Your question"
              placeholder="Ask a follow-up…"
              style={{
                flex: 1,
                width: 0,
                minWidth: 0,
                padding: "12px",
                border: "1px solid #b8c6ae",
                borderRadius: "11px",
                background: "white",
                color: "#243e30",
                font: "inherit",
                fontSize: "14px",
              }}
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={loading || !message.trim() || !hikingContext}
              style={{
                flexShrink: 0,
                width: "44px",
                height: "44px",
                border: 0,
                borderRadius: "11px",
                background: "#daef9b",
                color: "#243e30",
                fontSize: "23px",
                opacity: loading || !message.trim() ? 0.45 : 1,
                cursor: loading || !message.trim() ? "default" : "pointer",
              }}
            >
              ➤
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls="trailmate-floating-chat"
        onClick={() => {
          if (open) closeChat();
          else setOpen(true);
        }}
        style={{
          position: "fixed",
          right: "16px",
          bottom: "calc(20px + env(safe-area-inset-bottom))",
          zIndex: 9999,
          padding: "15px 22px",
          border: "1px solid #52694b",
          borderRadius: "999px",
          background: "#243e30",
          color: "#f7f8f2",
          font: "inherit",
          fontSize: "14px",
          fontWeight: 700,
          boxShadow: "0 8px 25px rgba(17,42,28,.22)",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "#daef9b" }}>✧ </span>
        {open ? "Close chat" : "Ask TrailMate"}
      </button>
    </div>,
    document.body
  );
}

const styles = {
  assistantBubble: {
    padding: "13px 15px",
    marginBottom: "12px",
    borderRadius: "15px",
    background: "#f0f1e8",
    color: "#243e30",
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
};