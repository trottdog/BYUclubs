// @ts-nocheck
export const config = {
  runtime: "nodejs",
};

export default async function handler(req: any, res: any) {
  const { default: app } = await import("../artifacts/api-server/src/app.js");
  return app(req, res);
}
