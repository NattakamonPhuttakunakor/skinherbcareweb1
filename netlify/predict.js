// netlify/functions/predict.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" },
        }),
      };
    }

    const apiUrl = process.env.YOLO_API_URL;
    const apiKey = process.env.YOLO_API_KEY;

    if (!apiUrl || !apiKey) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: { code: "CONFIG_MISSING", message: "Missing YOLO_API_URL or YOLO_API_KEY" },
        }),
      };
    }

    const bodyBuffer = Buffer.from(
      event.body || "",
      event.isBase64Encoded ? "base64" : "utf8"
    );

    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": event.headers["content-type"] || event.headers["Content-Type"] || "",
      },
      body: bodyBuffer,
    });

    const text = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: { code: "PROXY_ERROR", message: String(err) },
      }),
    };
  }
};