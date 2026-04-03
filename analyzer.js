const axios = require("axios");

async function analyzeWallet(address, transactions, balance) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const txSummary = transactions.slice(0, 15).map((tx, i) => {
    const value = parseFloat(tx.value) / 1e18;
    return `${i+1}. ${tx.input === "0x" ? "Transfer" : "Contract"}: ${value.toFixed(4)} ETH`;
  }).join("\n");

  const prompt = `Analyze this Base wallet:
Address: ${address}
Balance: ${balance} ETH
TX count: ${transactions.length}

Transactions:
${txSummary}

Return JSON only:
{
  "behaviorType": "Trader/HODLer/DeFi User/Bot",
  "riskScore": 1-10,
  "riskLabel": "Low/Medium/High Risk",
  "summary": "Brief analysis",
  "patterns": ["pattern1", "pattern2"],
  "recommendation": "Advice"
}`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        }
      }
    );
    
    const text = response.data.content[0].text;
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.log("AI error, using fallback");
    return {
      behaviorType: transactions.length > 50 ? "Active Trader" : "Regular User",
      riskScore: 3,
      riskLabel: "Low Risk",
      summary: `Wallet with ${transactions.length} transactions on Base chain.`,
      patterns: ["OWS secure read", "No private key access"],
      recommendation: "Enable API for AI insights"
    };
  }
}

module.exports = { analyzeWallet };
