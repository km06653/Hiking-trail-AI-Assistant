
import { useState } from "react";

function TrailMateChat({ hikingContext }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();

    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: userMessage,
      },
    ];

    setMessages(updatedMessages);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          hiking_context: hikingContext,
          conversation_history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to get chatbot response.");
      }

      const data = await response.json();

      setMessages([
        ...updatedMessages,
        {
          role: "model",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages([
        ...updatedMessages,
        {
          role: "model",
          content: "Sorry, I couldn't connect right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20 mt-6">
      <h3 className="text-2xl font-bold text-forest mb-2">
        🌲 Ask TrailMate AI
      </h3>

      <p className="text-sage text-sm mb-5">
        Have questions about your hike? I'm here to help!
      </p>

      <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
        {messages.length === 0 && (
          <div className="bg-sand/50 p-4 rounded-2xl text-bark">
            Hi! I've reviewed your hiking guide. Ask me about trails,
            weather, packing, or hiking safety.
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-forest text-white ml-8"
                : "bg-sand/70 text-bark mr-8"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div className="bg-sand/50 p-4 rounded-2xl text-sage animate-pulse">
            TrailMate is thinking...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask me anything about your hike..."
          className="flex-1 border border-sage/30 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="bg-forest text-white px-5 py-3 rounded-xl font-bold hover:bg-sage disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default TrailMateChat;
