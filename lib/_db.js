// Tiny Upstash Redis REST helper (no npm packages needed)
async function cmd(args) {
  const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.UPSTASH_REDIS_REST_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.result;
}
module.exports = { cmd };
