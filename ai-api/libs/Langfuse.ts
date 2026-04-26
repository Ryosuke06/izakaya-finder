import CallbackHandler from "langfuse-langchain";

const secretkey = process.env.LANGFUSE_SECRET_KEY;
const publickey = process.env.LANGFUSE_PUBLIC_KEY;
const base = process.env.LANGFUSE_BASE_URL;

export function createLangfudeCallback() {
  return new CallbackHandler({
    publicKey: publickey,
    secretKey: secretkey,
    baseUrl: base,
  });
}
