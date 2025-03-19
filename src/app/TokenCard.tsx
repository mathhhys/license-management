'use client'; // Mark as a client component

import React, { useState } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function TokenCard() {
  const { user } = useUser();
  const clerk = useClerk();
  const [vscodeToken, setVscodeToken] = useState('');
  const [loading, setLoading] = useState(false);
  
  const generateVSCodeToken = async () => {
    setLoading(true);
    try {
      // Request a token with the specific session template
      if (clerk.session) {
        const token = await clerk.session.getToken({ template: 'vscode-extension' });
        if (token) {
          setVscodeToken(token);
        }
      }
    } catch (error) {
      console.error('Error generating token:', error);
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
        {vscodeToken ? (
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
              onClick={() => navigator.clipboard.writeText(vscodeToken)} 
              className="mb-2"
              variant="outline"
            >
              Copy to Clipboard
            </Button>
            <p className="text-amber-500 text-sm">
              Important: Store this token securely. It won't be shown again.
            </p>
          </>
        ) : (
          <Button 
            onClick={generateVSCodeToken} 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate VSCode Token
          </Button>
        )}
      </CardContent>
    </Card>
  );
}