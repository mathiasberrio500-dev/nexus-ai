
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Método no permitido." }, 405);
      }

      if (!env.GROQ_API_KEY) {
        return json({ error: "Falta configurar la clave de NEXUS." }, 500);
      }

      let body;

      try {
        body = await request.json();
      } catch {
        return json({ error: "JSON inválido." }, 400);
      }

      const message = body?.message;

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 4000
      ) {
        return json({
          error: "Escribe un mensaje válido de hasta 4000 caracteres."
        }, 400);
      }

      // Recuperar y validar el contexto de la conversación.
      let conversation = [];

      if (Array.isArray(body.messages)) {
        let totalChars = 0;

        for (const item of body.messages.slice(-20)) {
          if (
            !item ||
            !["user", "assistant"].includes(item.role) ||
            typeof item.content !== "string" ||
            !item.content.trim() ||
            item.content.length > 4000
          ) {
            return json({
              error: "El historial de mensajes no es válido."
            }, 400);
          }

          totalChars += item.content.length;

          if (totalChars > 12000) {
            return json({
              error: "La conversación es demasiado larga. Inicia un chat nuevo o resume los mensajes."
            }, 413);
          }

          conversation.push({
            role: item.role,
            content: item.content.trim()
          });
        }
      }

      // Compatibilidad con clientes antiguos.
      const last = conversation[conversation.length - 1];

      if (
        !last ||
        last.role !== "user" ||
        last.content !== message.trim()
      ) {
        conversation.push({
          role: "user",
          content: message.trim()
        });
      }

      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + env.GROQ_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-20b",
              messages: [
                {
                  role: "system",
                  content:
                    "Te llamas NEXUS. Eres una IA útil, cercana, clara y respetuosa. Responde en el idioma del usuario. Usa los mensajes anteriores como contexto, mantén la continuidad y no inventes recuerdos que no aparezcan en el historial."
                },
                ...conversation
              ],
              temperature: 0.7,
              max_tokens: 700
            })
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("Groq:", response.status, data);

          return json({
            error: "No pude obtener una respuesta. Inténtalo de nuevo."
          }, 502);
        }

        const reply = data?.choices?.[0]?.message?.content;

        if (typeof reply !== "string" || !reply.trim()) {
          return json({
            error: "La IA no devolvió una respuesta."
          }, 502);
        }

        return json({ reply });
      } catch (error) {
        console.error("Error:", error);

        return json({
          error: "Ocurrió un error al responder."
        }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json({ error: "Ruta no encontrada." }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
