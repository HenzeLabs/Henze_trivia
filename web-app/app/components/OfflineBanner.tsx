import React from "react";

interface OfflineBannerProps {
  message?: string;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ message }) => (
  <div className="box w-full mb-6 bg-black border border-red-700 text-center py-3">
    <span className="heading text-red-600 text-lg font-bold">
      {message || "You are offline. Some features may be unavailable."}
    </span>
  </div>
);

export default OfflineBanner;
