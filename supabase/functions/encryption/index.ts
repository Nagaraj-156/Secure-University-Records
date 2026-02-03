import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AES-256 encryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  // Derive a 256-bit key from the string using SHA-256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with user context for JWT validation
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT using getClaims for ES256 compatibility
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    console.log(`Authenticated user for encryption: ${userId}`);

    // Create service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data, table_name, record_id } = await req.json();
    console.log(`Encryption request: action=${action}, table=${table_name}, user=${userId}`);

    let result;
    let eventType: string;

    switch (action) {
      case 'encrypt':
        if (!data) {
          throw new Error('No data provided for encryption');
        }
        result = await encrypt(JSON.stringify(data));
        eventType = 'encrypt';
        break;

      case 'decrypt':
        if (!data) {
          throw new Error('No data provided for decryption');
        }
        const decryptedString = await decrypt(data);
        result = JSON.parse(decryptedString);
        eventType = 'decrypt';
        break;

      case 'bulk_encrypt':
        if (!Array.isArray(data)) {
          throw new Error('Data must be an array for bulk encryption');
        }
        result = await Promise.all(
          data.map(async (item: unknown) => ({
            ...item as Record<string, unknown>,
            encrypted: await encrypt(JSON.stringify((item as Record<string, unknown>).value || item))
          }))
        );
        eventType = 'encrypt';
        break;

      case 'bulk_decrypt':
        if (!Array.isArray(data)) {
          throw new Error('Data must be an array for bulk decryption');
        }
        result = await Promise.all(
          data.map(async (item: { encrypted: string; id: string }) => {
            try {
              const decrypted = await decrypt(item.encrypted);
              return { id: item.id, value: JSON.parse(decrypted), success: true };
            } catch (e) {
              console.error(`Failed to decrypt record ${item.id}:`, e);
              return { id: item.id, value: null, success: false, error: 'Decryption failed' };
            }
          })
        );
        eventType = 'decrypt';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log encryption event
    await supabase.from('encryption_events').insert({
      user_id: userId,
      event_type: eventType,
      table_name: table_name || 'unknown',
      record_count: Array.isArray(data) ? data.length : 1,
      success: true,
    });

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: `${action}_data`,
      table_name: table_name,
      record_id: record_id,
      details: { 
        record_count: Array.isArray(data) ? data.length : 1,
        timestamp: new Date().toISOString()
      },
    });

    console.log(`Encryption ${action} completed successfully for user ${userId}`);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Encryption error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
