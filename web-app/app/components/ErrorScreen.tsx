import React from "react";
import { getSavage, savageWrong } from "./savageFeedback";

interface ErrorScreenProps {
  error: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => (
  <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center p-8 v-gap">
    <div className="box w-full max-w-md flex flex-col items-center v-gap text-center">
      <h1 className="heading text-2xl text-red-600 mb-4">CONNECTION SEVERED</h1>
      <p className="subtitle text-red-400 mb-6 font-bold">
        {error} <br /> {getSavage(savageWrong)}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary w-full text-lg font-black"
      >
        RELOAD (try not to break it again)
      </button>
    </div>
  </div>
);

export default ErrorScreen;
