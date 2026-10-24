import React from 'react'

export const CustomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <meta content="server-rendered" name="custom-provider" />
    {children}
  </>
)
