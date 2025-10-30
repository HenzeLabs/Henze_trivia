import React from "react";

interface OfflineBannerProps {
  message?: string;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ message }) => (
  <div className="offline-banner">
    {message || "Connection lost. Reconnecting you to the murder party..."}
  </div>
);

export default OfflineBanner;
