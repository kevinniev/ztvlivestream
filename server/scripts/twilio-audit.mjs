import twilio from "twilio";
import dotenv from "dotenv";

// Load env from process (injected by the platform)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

console.log("\n========== ZTVLIVE TWILIO AUDIT ==========\n");

// 1. Check env vars
console.log("1. ENVIRONMENT VARIABLES:");
console.log("   TWILIO_ACCOUNT_SID:          ", accountSid ? `${accountSid.substring(0, 8)}...${accountSid.slice(-4)} (set)` : "❌ NOT SET");
console.log("   TWILIO_AUTH_TOKEN:           ", authToken ? `${authToken.substring(0, 4)}...${authToken.slice(-4)} (set)` : "❌ NOT SET");
console.log("   TWILIO_MESSAGING_SERVICE_SID:", messagingServiceSid ? `${messagingServiceSid.substring(0, 8)}...${messagingServiceSid.slice(-4)} (set)` : "❌ NOT SET");
console.log("   TWILIO_FROM_NUMBER:          ", fromNumber ? `${fromNumber} (set)` : "❌ NOT SET");

if (!accountSid || !authToken) {
  console.log("\n❌ Cannot proceed — TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.\n");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// 2. Validate account
console.log("\n2. ACCOUNT VALIDATION:");
try {
  const account = await client.api.accounts(accountSid).fetch();
  console.log("   Status:      ", account.status === "active" ? `✅ ${account.status}` : `⚠️ ${account.status}`);
  console.log("   Friendly Name:", account.friendlyName);
  console.log("   Type:        ", account.type);
  console.log("   Date Created:", account.dateCreated);
} catch (err) {
  console.log("   ❌ Account validation FAILED:", err.message);
}

// 3. Check balance
console.log("\n3. ACCOUNT BALANCE:");
try {
  const balance = await client.balance.fetch();
  const bal = parseFloat(balance.balance);
  console.log("   Balance:  ", bal > 1 ? `✅ $${bal} ${balance.currency}` : `⚠️ $${bal} ${balance.currency} (LOW — consider topping up)`);
} catch (err) {
  console.log("   ❌ Balance check FAILED:", err.message);
}

// 4. Check phone numbers
console.log("\n4. PHONE NUMBERS:");
try {
  const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
  if (numbers.length === 0) {
    console.log("   ⚠️ No phone numbers found in account");
  } else {
    numbers.forEach(num => {
      console.log(`   ✅ ${num.phoneNumber} — ${num.friendlyName} (SMS: ${num.capabilities.sms ? "Yes" : "No"}, MMS: ${num.capabilities.mms ? "Yes" : "No"})`);
    });
  }
} catch (err) {
  console.log("   ❌ Phone number check FAILED:", err.message);
}

// 5. Check Messaging Services
console.log("\n5. MESSAGING SERVICES:");
try {
  const services = await client.messaging.v1.services.list({ limit: 20 });
  if (services.length === 0) {
    console.log("   ⚠️ No Messaging Services found");
  } else {
    services.forEach(svc => {
      const isConfigured = messagingServiceSid === svc.sid;
      console.log(`   ${isConfigured ? "✅ (ACTIVE)" : "   "} ${svc.sid} — ${svc.friendlyName}`);
    });
  }
  if (messagingServiceSid) {
    const match = services.find(s => s.sid === messagingServiceSid);
    if (!match) {
      console.log(`   ⚠️ Configured TWILIO_MESSAGING_SERVICE_SID (${messagingServiceSid}) not found in account!`);
    }
  }
} catch (err) {
  console.log("   ❌ Messaging Services check FAILED:", err.message);
}

// 6. Check recent messages (last 5)
console.log("\n6. RECENT SMS MESSAGES (last 5):");
try {
  const messages = await client.messages.list({ limit: 5 });
  if (messages.length === 0) {
    console.log("   No messages sent yet");
  } else {
    messages.forEach(msg => {
      const status = msg.status === "delivered" ? "✅" : msg.status === "failed" ? "❌" : "⏳";
      console.log(`   ${status} [${msg.dateSent?.toISOString().split("T")[0] ?? "N/A"}] To: ${msg.to} | Status: ${msg.status} | Error: ${msg.errorCode ?? "none"}`);
    });
  }
} catch (err) {
  console.log("   ❌ Message history check FAILED:", err.message);
}

// 7. Check SMS subscriber count in DB
console.log("\n7. ZTVLIVE SMS SUBSCRIBERS:");
try {
  const { createConnection } = await import("mysql2/promise");
  const conn = await createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute("SELECT COUNT(*) as total, SUM(opted_in = 1) as opted_in FROM sms_subscribers");
  const { total, opted_in } = rows[0];
  console.log(`   Total subscribers: ${total}`);
  console.log(`   Opted-in (active): ${opted_in ?? 0}`);
  await conn.end();
} catch (err) {
  console.log("   ❌ DB check FAILED:", err.message);
}

console.log("\n========== AUDIT COMPLETE ==========\n");
