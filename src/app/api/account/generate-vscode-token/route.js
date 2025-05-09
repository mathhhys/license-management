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
    
    // IMPORTANT: Use the exact template name as created in the Clerk Dashboard
    // Replace "vscode-extension" with the actual name you used when creating the template
    const templateName = "long-lived-token";
    
    try {
      // Generate a token using the JWT template
      const token = await clerkClient.sessions.getToken(sessionId, templateName);
      
      console.log('Token generated successfully using template:', templateName);
      
      return NextResponse.json({ 
        token,
        message: "Long-lived token generated successfully"
      });
    } catch (error) {
      console.error(`Error generating token with template "${templateName}":`, error);
      
      // If there's an error with the template, provide detailed information to help debug
      return NextResponse.json({ 
        error: 'Failed to generate token with template',
        details: error.message,
        templateName,
        suggestion: "Please ensure the JWT template exists in your Clerk Dashboard and has the exact name specified"
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in token generation endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to generate token', 
      details: error.message 
    }, { status: 500 });
  }
}