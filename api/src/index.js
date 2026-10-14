
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Método no permitido." },
          { status: 405 }
        );
      }

      if (!env.GROQ_API_KEY) {
        return Response.json(
          { error: "Falta configurar la clave de NEXUS." },
          { status: 500 }
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Solicitud no válida." },
          { status: 400 }
        );
      }

      const message = body?.message;

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 4000
      ) {
        return Response.json(
          { error: "Escribe un mensaje válido de hasta 4000 caracteres." },
          { status: 400 }
        );
      }

      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-20b",
              messages: [
                {
                  role: "system",
                  content:
                    "Te llamas NEXUS. Eres un asistente de inteligencia artificial útil, cercano, claro y respetuoso. Responde en el idioma del usuario."
                },
                { role: "user", content: message.trim() }
              ],
              temperature: 0.7,
              max_tokens: 700
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Error de Groq:", data);
          return Response.json(
            { error: "No pude obtener una respuesta. Inténtalo de nuevo." },
            { status: 502 }
          );
        }

        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
          return Response.json(
            { error: "La IA no devolvió una respuesta." },
            { status: 502 }
          );
        }

        return Response.json({ reply });
      } catch (error) {
        console.error("Error del servidor:", error);
        return Response.json(
          { error: "Ocurrió un error al responder." },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
