'use client';

import React from 'react';

export default function FacebookLoginButton() {
  const handleClick = () => {
    window.location.href = '/api/auth/facebook/login';
  };

  return (
    <button
      onClick={handleClick}
      className="rounded bg-blue-600 px-4 py-2 text-white"
    >
      Link Facebook Account
    </button>
  );
}
