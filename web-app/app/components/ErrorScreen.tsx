import React from "react";
import { getSavage, savageWrong } from "./savageFeedback";

interface ErrorScreenProps {
  error: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(210deg,#020309_0%,#06070f_100%)]" />
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[-25%] left-[20%] w-[360px] h-[360px] bg-[rgba(244,63,94,0.15)] blur-[190px]" />
      <div className="absolute bottom-[-25%] right-[18%] w-[360px] h-[360px] bg-[rgba(34,211,238,0.12)] blur-[190px]" />
    </div>
    <div className="surface glass max-w-lg w-full text-center space-y-6 relative z-10">
      <span className="pill inline-flex">Connection Severed</span>
      <h1 className="heading text-4xl tracking-[0.2em] glow-text">
        Signal Lost
      </h1>
      <p className="text-sm text-[rgba(203,213,225,0.78)] leading-relaxed">
        {error}. {getSavage(savageWrong)}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary justify-center w-full"
      >
        Reload The Arena
      </button>
    </div>
  </div>
);

export default ErrorScreen;
