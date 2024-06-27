const axios = require("axios");

async function batchRequest({ events, token, method = "POST" }) {
  const batchSize = 50;

  const batchCount = Math.ceil(events.length / batchSize);

  const responses = [];

  for (let b = 0; b < batchCount; b += 1) {
    const boundary = "xxxxxxxxxx";
    const payload = events
      .slice(b * batchSize, (b + 1) * batchSize)
      .reduce(
        (s, e, i, a) =>
          (s +=
            "Content-Type: application/http\r\n" +
            `Content-ID: ${i}\r\n\r\n` +
            `${method} https://www.googleapis.com/calendar/v3/calendars/${
              e.calendarId
            }/events${method === "PATCH" ? `/${e.calendarEventId}` : ""}\r\n` +
            "Content-Type: application/json; charset=utf-8\r\n\r\n" +
            `${JSON.stringify({ ...e, calendarEventId: undefined })}\r\n` +
            `--${boundary + (i === a.length - 1 ? "--" : "")}\r\n`),
        `--${boundary}\r\n`
      );

    const req = {
      url: "https://www.googleapis.com/batch/calendar/v3",
      method: "POST",
      headers: {
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
        Authorization: `Bearer ${token}`,
      },
      data: payload,
    };
    const res = await axios(req);

    res.data.split("--batch_").forEach((batch) => {
      const resp = batch.split("\r\n\r\n");
      if (resp.length > 2) {
        try {
          responses.push(JSON.parse(resp.slice(2).join("\r\n")));
        } catch (e) {
          //
        }
      }
    });
  }

  return responses;
}
