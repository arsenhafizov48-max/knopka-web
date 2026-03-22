"use client";

import { Turnstile } from "@marsidev/react-turnstile";

type Props = {
  siteKey: string;
  onToken: (token: string | null) => void;
};

export default function LoginTurnstile({ siteKey, onToken }: Props) {
  return (
    <div className="flex justify-center">
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
}
