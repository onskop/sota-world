/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="next/image-types/global" />

declare module '*.md';

declare namespace NodeJS {
  interface ProcessEnv {
    VERCEL_AI_GATEWAY_URL?: string;
    VERCEL_AI_GATEWAY_API_KEY?: string;
  }
}
