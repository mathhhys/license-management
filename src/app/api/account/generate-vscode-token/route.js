import { clerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get auth information from Clerk
    const { userId, sessionId } = getAuth(request);
    
    // Validate required parameters
    if (!userId || !sessionId) {
      console.error('Missing required auth parameters:', { userId, sessionId });
      return NextResponse.json({ 
        error: 'Authentication parameters missing', 
        details: 'User or session information is missing' 
      }, { status: 401 });
    }
    
    console.log('Generating token for:', { userId, sessionId });
    
    // Generate a token without specifying a template
    // This will use the default JWT template
    const token = await clerkClient.sessions.getToken(sessionId);
    
    console.log('Token generated successfully');
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating VSCode token:', error);
    return NextResponse.json({ 
      error: 'Failed to generate token', 
      details: error.message 
    }, { status: 500 });
  }
}