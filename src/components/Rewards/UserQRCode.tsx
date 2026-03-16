import React from 'react';
import QRCode from 'react-qr-code';

type Props = {
  userId?: string | null;
  size?: number;
};

const UserQRCode: React.FC<Props> = ({ userId, size = 160 }) => {
  if (!userId) {
    // Render an empty placeholder so layout is preserved when user is not available
    return <div style={{ width: size, height: size }} />;
  }

  const value = `reward_user_${userId}`;
  console.debug('[UserQRCode] rendering QR for', { value });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <QRCode value={value} size={size} />
    </div>
  );
};

export default UserQRCode;
