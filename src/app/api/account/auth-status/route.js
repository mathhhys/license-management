import { clerkClient } from "@clerk/clerk-sdk-node";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get auth information from Clerk
    const auth = getAuth(request);
    const { userId, sessionId } = auth;
    
    // Check if user is authenticated
    if (!userId || !sessionId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'User is not authenticated'
      }, { status: 401 });
    }
    
    // Return auth status information
    return NextResponse.json({
      isAuthenticated: true,
      userId: userId,
      sessionId: sessionId,
      sessionData: auth.session ? {
        id: auth.session.id,
        status: auth.session.status,
        expireAt: auth.session.expireAt
      } : null
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}