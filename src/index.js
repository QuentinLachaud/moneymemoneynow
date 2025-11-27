export default {
  async fetch(request, env, ctx) {
    // Minimal worker that forwards requests — Wrangler will attach static assets
    // when deploying with `--assets=./dist` and serve them automatically.
    return fetch(request);
  },
};
