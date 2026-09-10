// e2e 公共：注册（或登录）一次性测试账号，返回可复用的会话信息
// 用法：const auth = await registerOrLogin(API);
//   - node fetch 直连 8787 的地方带 headers: { cookie: auth.cookie }
//   - Playwright 页面用 await page.context().addCookies([{ ...auth.cookieJar, url: BASE }])
export async function registerOrLogin(api) {
  const account = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}@vidstitch.local`;
  const password = "e2e-password-123";
  let r = await fetch(`${api}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password, nickname: "E2E" }),
  });
  if (!r.ok) {
    r = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
  }
  if (!r.ok) throw new Error(`e2e auth failed: ${r.status} ${await r.text()}`);
  const setCookie = r.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0]; // vs_session=…
  return { account, password, cookie, name: cookie.split("=")[0], value: cookie.split("=")[1] ?? "" };
}
