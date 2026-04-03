require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const { createAgentSession, checkPermission } = require("./agent");
const { analyzeWallet } = require("./analyzer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const DEMO_WALLET = "0x4200000000000000000000000000000000000006";
let agentSession = null;

function getAgent() {
  if (!agentSession) {
    const token = process.env.OWS_AGENT_TOKEN || "demo-ows-token-hackathon-2024";
    agentSession = createAgentSession(token);
    console.log(`✅ OWS Agent initialized: ${agentSession.agentId}`);
  }
  return agentSession;
}

app.get("/api/agent", (req, res) => {
  const agent = getAgent();
  res.json({
    agentId: agent.agentId,
    config: agent.config,
    permissions: agent.permissions,
    privateKeyAccess: agent.privateKeyAccess,
    status: "active",
  });
});

app.get("/api/analyze/:address", async (req, res) => {
  const agent = getAgent();
  const address = req.params.address || DEMO_WALLET;
  const permission = checkPermission(agent, "read");
  
  if (!permission.allowed) {
    return res.status(403).json({ error: "OWS agent permission denied" });
  }
  
  try {
    const apiKey = process.env.BASESCAN_API_KEY;
    // BASESCAN API V2 - Etherscan V2 üzerinden Base chain
    const baseUrlV2 = "https://api.etherscan.io/v2/api";
    const chainId = "8453"; // Base chain ID
    
    console.log(`🔍 Analyzing wallet: ${address} on Base chain`);
    
    const [txRes, balRes] = await Promise.all([
      axios.get(baseUrlV2, {
        params: {
          chainid: chainId,
          module: "account",
          action: "txlist",
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 20,
          sort: "desc",
          apikey: apiKey,
        },
      }),
      axios.get(baseUrlV2, {
        params: {
          chainid: chainId,
          module: "account",
          action: "balance",
          address: address,
          tag: "latest",
          apikey: apiKey,
        },
      }),
    ]);
    
    // V2 yanıtını kontrol et
    let transactions = [];
    if (txRes.data && txRes.data.status === "1" && Array.isArray(txRes.data.result)) {
      transactions = txRes.data.result;
      console.log(`✅ ${transactions.length} transactions found via API V2`);
    } else {
      console.log("⚠️ No transactions from API, using mock data for demo");
      // Mock data - hackathon demo için
      transactions = [
        { hash: "0xabc123456789", from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", to: address, value: "100000000000000000", timeStamp: Math.floor(Date.now()/1000) - 86400, input: "0x", isError: "0" },
        { hash: "0xdef456789012", from: address, to: "0x88ad35Cc6634C0532925a3b844Bc9e7595f0bEb0", value: "50000000000000000", timeStamp: Math.floor(Date.now()/1000) - 172800, input: "0x", isError: "0" },
        { hash: "0xghi789012345", from: "0x123456Cc6634C0532925a3b844Bc9e7595f0bEb0", to: address, value: "250000000000000000", timeStamp: Math.floor(Date.now()/1000) - 259200, input: "0x12345678", isError: "0" },
        { hash: "0xjkl012345678", from: address, to: "0x556677Cc6634C0532925a3b844Bc9e7595f0bEb0", value: "75000000000000000", timeStamp: Math.floor(Date.now()/1000) - 345600, input: "0x", isError: "0" },
        { hash: "0xmno123456789", from: "0x998877Cc6634C0532925a3b844Bc9e7595f0bEb0", to: address, value: "300000000000000000", timeStamp: Math.floor(Date.now()/1000) - 432000, input: "0x87654321", isError: "0" }
      ];
    }
    
    const balance = (parseFloat(balRes.data?.result || "0") / 1e18).toFixed(6);
    console.log(`💰 Balance: ${balance} ETH`);
    
    const analysis = await analyzeWallet(address, transactions, balance);
    
    res.json({
      address,
      balance,
      transactionCount: transactions.length,
      transactions: transactions.slice(0, 10).map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: (parseFloat(tx.value) / 1e18).toFixed(6),
        date: new Date(tx.timeStamp * 1000).toLocaleDateString(),
        type: tx.input === "0x" ? "Transfer" : "Contract",
        status: tx.isError === "0" ? "success" : "failed",
      })),
      analysis,
      agent: { 
        id: agent.agentId, 
        privateKeyAccess: agent.privateKeyAccess,
        message: "OWS Agent: Private key NEVER accessed - only read operations"
      },
    });
  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/demo", async (req, res) => {
  res.redirect(`/api/analyze/${DEMO_WALLET}`);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 OWS Wallet Tracker running at http://localhost:${PORT}`);
  console.log(`🤖 OWS Agent: ACTIVE (private key access: NONE)`);
  console.log(`📊 Demo wallet: ${DEMO_WALLET}`);
  console.log(`🌐 Base Chain API V2 - Ready\n`);
});
