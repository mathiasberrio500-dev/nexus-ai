
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar la clave de NEXUS."
    });
  }

  const { message } = req.body || {};

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 4000
  ) {
    return res.status(400).json({
      error: "Escribe un mensaje válido de hasta 4000 caracteres."
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
            {
              role: "user",
              content: message.trim()
            }
          ],
          temperature: 0.7,
          max_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Groq:", data);
      return res.status(502).json({
        error: "No pude obtener una respuesta. Inténtalo de nuevo."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "La IA no devolvió una respuesta."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Error del servidor:", error);
    return res.status(500).json({
      error: "Ocurrió un error al responder."
    });
  }
}
