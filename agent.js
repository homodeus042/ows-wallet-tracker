const agentConfig = {
  name: "base-wallet-analyzer",
  version: "1.0.0",
  capabilities: ["read:transactions", "read:balances", "analyze:patterns"],
  chain: "eip155:8453",
};

function createAgentSession(owsToken) {
  if (!owsToken || owsToken.length < 10) {
    throw new Error("Invalid OWS agent token");
  }
  return {
    agentId: `ows-agent-${Date.now()}`,
    token: owsToken,
    config: agentConfig,
    createdAt: new Date().toISOString(),
    permissions: ["read", "analyze"],
    privateKeyAccess: false,
  };
}

function checkPermission(session, action) {
  const allowed = session.permissions.includes(action);
  return {
    allowed,
    action,
    agentId: session.agentId,
    reason: allowed ? "Action within agent permissions" : "Action requires elevated permissions",
  };
}

module.exports = { createAgentSession, checkPermission, agentConfig };
