'use client'; // Mark as a client component

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function TokenCard() {
  const { isSignedIn, user } = useUser();
  const [vscodeToken, setVscodeToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<any>(null);
  
  // Check auth status first to ensure session is valid
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/account/auth-status', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const status = await response.json();
        setAuthStatus(status);
        console.log('Auth status:', status);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Auth status error:', errorData);
        setError('Authentication issue: ' + (errorData.details || 'Session may have expired'));
        return false;
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setError('Failed to verify authentication status');
      return false;
    }
  };
  
  const generateVSCodeToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First check auth status
      const isAuth = await checkAuthStatus();
      if (!isAuth) {
        setLoading(false);
        return;
      }
      
      // Call the backend API endpoint
      const response = await fetch('/api/account/generate-vscode-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Parse response as text first to handle potential JSON parsing errors
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', responseText);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || 'Failed to generate token');
      }
      
      setVscodeToken(responseData.token);
    } catch (error) {
      console.error('Error generating token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate token. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>VSCode Extension Token</CardTitle>
        <CardDescription>
          Generate a token to use with the Softcodes VSCode extension.
          This token will be valid for 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSignedIn ? (
          <p className="text-amber-500 text-sm">You must be signed in to generate a token.</p>
        ) : vscodeToken ? (
          <>
            <p className="text-sm mb-2">Your token is ready. Copy it to your VSCode extension:</p>
            <Input 
              value={vscodeToken} 
              readOnly 
              onClick={(e) => {
                const input = e.target as HTMLInputElement;
                input.select();
              }} 
              className="mb-2"
            />
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(vscodeToken);
                // Notify user with a simple way without toast
                const button = document.activeElement as HTMLButtonElement;
                const originalText = button.textContent;
                button.textContent = "Copied!";
                setTimeout(() => {
                  button.textContent = originalText;
                }, 2000);
              }} 
              className="mb-2"
              variant="outline"
            >
              Copy to Clipboard
            </Button>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <p className="text-amber-500 text-sm">
              Important: Store this token securely. It won't be shown again.
            </p>
          </>
        ) : (
          <>
            <Button 
              onClick={generateVSCodeToken} 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate VSCode Token
            </Button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}