import React from "react";

const PhoneCallForm: React.FC = () => {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://pgs-call-translate.azurewebsites.net/"
        className="w-full h-[calc(100vh-120px)] border-0 rounded-lg"
        title="Phone Call Translation Service"
        allow="microphone; camera; geolocation"
      />
    </div>
  );
};

export default PhoneCallForm;