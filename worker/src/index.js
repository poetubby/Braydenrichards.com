import { handleSmsInbound } from "./sms-inbound.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/sms") {
      return handleSmsInbound(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};
